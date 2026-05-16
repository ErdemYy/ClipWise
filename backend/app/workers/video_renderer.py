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
    logger.info("🎬 Starting rendering for video %s", video_id)

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is missing in configuration.")

    openai_client = OpenAI(api_key=settings.openai_api_key)

    try:
        # ---- Step 1: Fetch Video & Clips ----
        video_result = db.table("videos").select("*").eq("id", video_id).execute()
        if not video_result.data:
            raise ValueError(f"Video {video_id} not found")
        video = video_result.data[0]
        original_url = video["original_url"]

        clips_result = db.table("clips").select("*").eq("video_id", video_id).is_("video_url", "null").execute()
        clips = clips_result.data

        if not clips:
            logger.info("No unrendered clips found for video %s", video_id)
            db.table("videos").update({"status": "completed"}).eq("id", video_id).execute()
            return {"status": "completed", "rendered": 0}

        with tempfile.TemporaryDirectory() as temp_dir:
            # ---- Step 2: Download High-Quality Source Video ----
            logger.info("Downloading high-quality source video...")
            source_video_path = os.path.join(temp_dir, 'source.mp4')
            
            ydl_opts = {
                'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'outtmpl': source_video_path,
                'quiet': True,
                'no_warnings': True,
                'merge_output_format': 'mp4'
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(original_url, download=True)

            if not os.path.exists(source_video_path):
                raise FileNotFoundError("Failed to download source video.")
            
            # Absolute path needed for ffmpeg subtitles filter (replace backslashes for FFmpeg on Windows)
            abs_source_video = os.path.abspath(source_video_path).replace("\\", "/")

            rendered_count = 0

            # ---- Step 3: Process Each Clip ----
            for clip in clips:
                logger.info("Processing clip %s (%s to %s)", clip['id'], clip['start_time'], clip['end_time'])
                
                clip_audio_path = os.path.join(temp_dir, f"audio_{clip['id']}.wav")
                clip_srt_path = os.path.join(temp_dir, f"sub_{clip['id']}.srt")
                clip_output_path = os.path.join(temp_dir, f"final_{clip['id']}.mp4")
                abs_srt_path = os.path.abspath(clip_srt_path).replace("\\", "/")

                # 3a. Extract audio snippet
                # We extract exactly the clip's audio to pass to Whisper to get perfect relative timestamps
                duration = float(clip['end_time']) - float(clip['start_time'])
                subprocess.run([
                    'ffmpeg', '-y', '-i', source_video_path,
                    '-ss', str(clip['start_time']), '-t', str(duration),
                    '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                    clip_audio_path
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                # 3b. Word-Level Whisper Transcription
                logger.info("Requesting word-level timestamps from Whisper...")
                with open(clip_audio_path, "rb") as audio_file:
                    transcript_response = openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                        timestamp_granularities=["word"]
                    )
                
                # `transcript_response` is an object, we need the `words` attribute
                words_data = getattr(transcript_response, 'words', [])
                if not words_data:
                    # Fallback if words array is missing
                    words_data = [{"word": getattr(transcript_response, 'text', ""), "start": 0.0, "end": duration}]

                # Convert object to dict to be safe
                if hasattr(words_data[0], 'word'):
                    words_data = [{"word": w.word, "start": w.start, "end": w.end} for w in words_data]

                # 3c. Generate SRT
                generate_srt(words_data, clip_srt_path)

                # 3d. FFmpeg Crop & Hardsub
                # 9:16 crop filter: crop=1080:1920:in_w/2-1080/2:0
                # Using standard 9:16 based on height: crop=ih*9/16:ih
                logger.info("Rendering final vertical video with hardsubs...")
                
                # Subtitles filter syntax: Note the single quotes inside the filter string
                sub_filter = f"subtitles='{abs_srt_path}':force_style='Fontname=Arial,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,FontSize=22,Alignment=2,MarginV=60'"
                
                ffmpeg_cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(clip['start_time']),
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

                subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)

                # 3e. Upload to Supabase Storage
                logger.info("Uploading rendered clip to Supabase Storage...")
                file_name = f"{video_id}/{clip['id']}.mp4"
                
                with open(clip_output_path, 'rb') as f:
                    file_bytes = f.read()
                    
                # Upload file (upsert=True to overwrite if exists)
                db.storage.from_("clips").upload(
                    file_name,
                    file_bytes,
                    file_options={"content-type": "video/mp4", "x-upsert": "true"}
                )

                # Get public URL
                public_url = db.storage.from_("clips").get_public_url(file_name)

                # 3f. Update Clip DB Record
                db.table("clips").update({"video_url": public_url}).eq("id", clip['id']).execute()
                
                rendered_count += 1
                logger.info("Clip %s successfully rendered and uploaded.", clip['id'])

        # ---- Step 4: Finalize Video Status ----
        db.table("videos").update({"status": "completed"}).eq("id", video_id).execute()
        logger.info("✅ Video %s all clips rendered.", video_id)

        return {
            "video_id": video_id,
            "status": "completed",
            "rendered_clips": rendered_count
        }

    except subprocess.CalledProcessError as sub_err:
        error_msg = f"FFmpeg subprocess failed: {sub_err}"
        logger.error("❌ %s", error_msg, exc_info=True)
        db.table("videos").update({"status": "failed", "error_message": error_msg[:500]}).eq("id", video_id).execute()
        raise sub_err
    except Exception as exc:
        error_msg = f"Render failed: {str(exc)}"
        logger.error("❌ Video %s failed: %s", video_id, exc, exc_info=True)
        db.table("videos").update({"status": "failed", "error_message": error_msg[:500]}).eq("id", video_id).execute()
        raise exc
