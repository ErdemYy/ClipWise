"""
ClipWise — Video Renderer Tasks

Handles downloading, trimming, cropping to 9:16, generating synced SRT subtitles,
and hardsubbing them onto the video using FFmpeg.
"""

import json
import logging
import math
import os
import subprocess
import tempfile
import traceback
from typing import Any, Dict, List

import yt_dlp
from celery import Task
from openai import OpenAI

from app.config import get_settings
from app.workers.celery_app import celery_app
from app.workers.tasks import BaseTask, _get_supabase_client

logger = logging.getLogger("clipwise.workers.video_renderer")


def format_srt_time(seconds: float) -> str:
    """Format float seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(words_data: List[Dict[str, Any]], filepath: str):
    """
    Generate an SRT file grouping up to 3 words per subtitle
    for dynamic TikTok/Reels style captions.
    """
    logger.info("Generating SRT file at %s grouping up to 3 words per line...", filepath)
    with open(filepath, 'w', encoding='utf-8') as f:
        counter = 1
        chunk = []
        for i, word_obj in enumerate(words_data):
            chunk.append(word_obj)
            
            # Flush chunk if 3 words or last word
            if len(chunk) >= 3 or i == len(words_data) - 1:
                start_time = chunk[0]['start']
                end_time = chunk[-1]['end']
                text = " ".join([w['word'] for w in chunk]).strip()
                
                f.write(f"{counter}\n")
                f.write(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}\n")
                f.write(f"{text}\n\n")
                
                counter += 1
                chunk = []
    logger.info("SRT subtitle file generated successfully. Count: %d chunks", counter - 1)


@celery_app.task(
    bind=True,
    base=BaseTask,
    name="app.workers.video_renderer.render_video_clips",
    queue="video_processing",
)
def render_video_clips(self: Task, video_id: str) -> Dict[str, Any]:
    """
    Render all clips for a specific video.
    """
    db = _get_supabase_client()
    settings = get_settings()
    logger.info("🎬 [Video ID: %s] rendering task started.", video_id)

    if not settings.openai_api_key:
        err_msg = "OPENAI_API_KEY is missing in backend environment configuration."
        logger.error("❌ %s", err_msg)
        raise ValueError(err_msg)

    openai_client = OpenAI(api_key=settings.openai_api_key)

    try:
        # ---- Step 1: Fetch Video & Clips ----
        logger.info("Fetching video details from DB for rendering: %s", video_id)
        video_result = db.table("videos").select("*").eq("id", video_id).execute()
        if not video_result.data:
            raise ValueError(f"Video {video_id} not found in Supabase")
        video = video_result.data[0]
        original_url = video["original_url"]

        logger.info("Fetching unrendered clips for video %s...", video_id)
        clips_result = db.table("clips").select("*").eq("video_id", video_id).is_("video_url", "null").execute()
        clips = clips_result.data

        if not clips:
            logger.info("✅ No unrendered clips found for video %s. Marking video as completed.", video_id)
            db.table("videos").update({"status": "completed"}).eq("id", video_id).execute()
            return {"status": "completed", "rendered": 0}

        logger.info("Found %d unrendered clips. Initializing workspace...", len(clips))

        with tempfile.TemporaryDirectory() as temp_dir:
            # ---- Step 2: Download High-Quality Source Video ----
            logger.info("📥 Downloading high-quality source video from YouTube...")
            source_video_path = os.path.join(temp_dir, 'source.mp4')
            
            ydl_opts = {
                'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'outtmpl': source_video_path,
                'quiet': True,
                'no_warnings': True,
                'merge_output_format': 'mp4'
            }
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.extract_info(original_url, download=True)
            except Exception as dl_err:
                logger.error("❌ High-quality video download failed with yt-dlp: %s", original_url, exc_info=True)
                raise dl_err

            if not os.path.exists(source_video_path):
                raise FileNotFoundError("Failed to download source video. Output file not found.")
            
            logger.info("✅ High-quality video successfully downloaded to: %s", source_video_path)

            # Absolute path needed for ffmpeg subtitles filter (replace backslashes for FFmpeg on Windows)
            abs_source_video = os.path.abspath(source_video_path).replace("\\", "/")

            rendered_count = 0

            # ---- Step 3: Process Each Clip ----
            for idx, clip in enumerate(clips):
                clip_id = clip['id']
                start_time = clip['start_time']
                end_time = clip['end_time']
                duration = float(end_time) - float(start_time)
                
                logger.info("📹 Rendering Clip %d/%d (ID: %s, Time: %s to %s, Duration: %.2fs)", 
                            idx + 1, len(clips), clip_id, start_time, end_time, duration)
                
                clip_audio_path = os.path.join(temp_dir, f"audio_{clip_id}.wav")
                clip_srt_path = os.path.join(temp_dir, f"sub_{clip_id}.srt")
                clip_output_path = os.path.join(temp_dir, f"final_{clip_id}.mp4")
                abs_srt_path = os.path.abspath(clip_srt_path).replace("\\", "/")

                # 3a. Extract audio snippet via FFmpeg
                logger.info("✂️ Extracting audio snippet using FFmpeg...")
                try:
                    subprocess.run([
                        'ffmpeg', '-y', '-i', source_video_path,
                        '-ss', str(start_time), '-t', str(duration),
                        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                        clip_audio_path
                    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                except subprocess.CalledProcessError as sub_err:
                    stderr_msg = sub_err.stderr.decode('utf-8', errors='ignore') if sub_err.stderr else ""
                    logger.error("❌ FFmpeg audio extraction failed: %s", stderr_msg, exc_info=True)
                    raise sub_err

                logger.info("✅ Audio snippet successfully extracted to: %s", clip_audio_path)

                # 3b. Word-Level Whisper Transcription
                logger.info("🎙️ Requesting word-level timestamps from OpenAI Whisper...")
                try:
                    with open(clip_audio_path, "rb") as audio_file:
                        transcript_response = openai_client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="verbose_json",
                            timestamp_granularities=["word"]
                        )
                except Exception as whisper_err:
                    logger.error("❌ OpenAI Whisper transcription API for clip failed.", exc_info=True)
                    raise whisper_err
                
                # `transcript_response` is an object, we need the `words` attribute
                words_data = getattr(transcript_response, 'words', [])
                if not words_data:
                    # Fallback if words array is missing
                    words_data = [{"word": getattr(transcript_response, 'text', ""), "start": 0.0, "end": duration}]

                # Convert object to dict to be safe
                if hasattr(words_data[0], 'word'):
                    words_data = [{"word": w.word, "start": w.start, "end": w.end} for w in words_data]

                logger.info("✅ Word-level transcription retrieved from Whisper. Count: %d words", len(words_data))

                # 3c. Generate SRT
                generate_srt(words_data, clip_srt_path)

                # 3d. FFmpeg Crop & Hardsub
                # 9:16 crop filter: crop=1080:1920:in_w/2-1080/2:0
                # Using standard 9:16 based on height: crop=ih*9/16:ih
                logger.info("🎬 Rendering final 9:16 vertical video with hardsubs using FFmpeg...")
                
                # Subtitles filter syntax: Note the single quotes inside the filter string
                sub_filter = f"subtitles='{abs_srt_path}':force_style='Fontname=Arial,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,FontSize=22,Alignment=2,MarginV=60'"
                
                ffmpeg_cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(start_time),
                    '-i', source_video_path,
                    '-t', str(duration),
                    '-vf', f"crop=ih*9/16:ih,{sub_filter}",
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    clip_output_path
                ]

                try:
                    subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                except subprocess.CalledProcessError as sub_err:
                    stderr_msg = sub_err.stderr.decode('utf-8', errors='ignore') if sub_err.stderr else ""
                    logger.error("❌ FFmpeg vertical crop and hardsub failed: %s", stderr_msg, exc_info=True)
                    raise sub_err

                logger.info("✅ Final vertical video successfully rendered to: %s", clip_output_path)

                # 3e. Upload to Supabase Storage
                logger.info("📤 Uploading rendered vertical clip to Supabase Storage...")
                file_name = f"{video_id}/{clip_id}.mp4"
                
                with open(clip_output_path, 'rb') as f:
                    file_bytes = f.read()
                    
                try:
                    # Upload file (upsert=True to overwrite if exists)
                    db.storage.from_("clips").upload(
                        file_name,
                        file_bytes,
                        file_options={"content-type": "video/mp4", "x-upsert": "true"}
                    )
                except Exception as upload_err:
                    logger.error("❌ Upload to Supabase Storage failed for file: %s", file_name, exc_info=True)
                    raise upload_err

                # Get public URL
                public_url = db.storage.from_("clips").get_public_url(file_name)
                logger.info("✅ Clip successfully uploaded to storage. Public URL: %s", public_url)

                # 3f. Update Clip DB Record
                logger.info("Updating clip record in database with public URL...")
                db.table("clips").update({"video_url": public_url}).eq("id", clip_id).execute()
                
                rendered_count += 1
                logger.info("✅ Clip %s successfully rendered, uploaded, and linked.", clip_id)

        # ---- Step 4: Finalize Video Status ----
        logger.info("Finalizing video rendering. Updating video status to 'completed' in Supabase...")
        db.table("videos").update({"status": "completed"}).eq("id", video_id).execute()
        logger.info("🎉 ✅ Video %s all clips successfully rendered and completed!", video_id)

        return {
            "video_id": video_id,
            "status": "completed",
            "rendered_clips": rendered_count
        }

    except subprocess.CalledProcessError as sub_err:
        tb_str = traceback.format_exc()
        stderr_msg = sub_err.stderr.decode('utf-8', errors='ignore') if sub_err.stderr else ""
        error_msg = f"FFmpeg execution failed: {sub_err}. Stderr: {stderr_msg}"
        logger.error("❌ FFmpeg CalledProcessError during render_video_clips: %s\n%s", error_msg, tb_str, exc_info=True)
        
        try:
            db.table("videos").update({
                "status": "failed", 
                "error_message": error_msg[:500]
            }).eq("id", video_id).execute()
            logger.info("✅ Video status updated to 'failed'")
        except Exception as db_err:
            logger.error("❌ Failed to update video status to 'failed': %s", db_err, exc_info=True)
            
        raise sub_err

    except Exception as exc:
        tb_str = traceback.format_exc()
        error_msg = f"Render failed: {str(exc)}"
        logger.error("❌ Video %s failed during render_video_clips: %s\n%s", video_id, exc, tb_str, exc_info=True)
        
        try:
            db.table("videos").update({
                "status": "failed", 
                "error_message": error_msg[:500]
            }).eq("id", video_id).execute()
            logger.info("✅ Video status updated to 'failed'")
        except Exception as db_err:
            logger.error("❌ Failed to update video status to 'failed': %s", db_err, exc_info=True)
            
        raise exc
