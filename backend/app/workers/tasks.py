"""
ClipWise — Celery Tasks

Defines asynchronous tasks for video processing.
The process_video task handles the full pipeline:
1. Update status to 'processing'
2. Download audio via yt-dlp
3. Transcribe via OpenAI Whisper
4. Analyze via OpenAI GPT-4o
5. Generate clip records
6. Update status to 'transcribed' or 'failed'
"""

import json
import logging
import os
import re
import tempfile
import traceback
from typing import Any, Dict

import yt_dlp
from celery import Task
from openai import OpenAI

from app.config import get_settings
from app.workers.celery_app import celery_app

logger = logging.getLogger("clipwise.workers.tasks")


class BaseTask(Task):
    """Base task class with automatic error handling and retries."""

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 1, "countdown": 30} # Low retry for heavy tasks
    retry_backoff = True
    retry_backoff_max = 300
    retry_jitter = True


def _get_supabase_client():
    """Create a fresh Supabase client for use within Celery workers."""
    from supabase import create_client

    settings = get_settings()
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_role_key,
    )


def clean_json_response(content: str) -> str:
    """
    Cleans OpenAI markdown code fences (like ```json ... ```) from a string
    to leave only a valid, raw JSON string.
    """
    if not content:
        return ""
    content = content.strip()
    
    # Remove markdown code block fences if they exist
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
    if match:
        content = match.group(1).strip()
    return content


@celery_app.task(
    bind=True,
    base=BaseTask,
    name="app.workers.tasks.process_video",
    queue="video_processing",
)
def process_video(self: Task, video_id: str) -> Dict[str, Any]:
    """
    Process a video through the AI clipping pipeline.
    """
    db = _get_supabase_client()
    settings = get_settings()
    logger.info("🎬 [Video ID: %s] task started. (Attempt %d)", video_id, self.request.retries + 1)

    if not settings.openai_api_key:
        err_msg = "OPENAI_API_KEY is missing in backend environment configuration."
        logger.error("❌ %s", err_msg)
        raise ValueError(err_msg)

    openai_client = OpenAI(api_key=settings.openai_api_key)

    try:
        # ---- Step 1: Mark as processing ----
        logger.info("Updating status to 'processing' for video %s in Supabase...", video_id)
        db.table("videos").update({"status": "processing"}).eq("id", video_id).execute()
        logger.info("✅ Video %s status successfully updated to 'processing'", video_id)

        # ---- Step 2: Fetch video details ----
        logger.info("Fetching video details from database for ID: %s", video_id)
        video_result = db.table("videos").select("*").eq("id", video_id).execute()
        if not video_result.data:
            raise ValueError(f"Video {video_id} not found in database")

        video = video_result.data[0]
        original_url = video["original_url"]
        logger.info("✅ Source video URL: %s", original_url)

        with tempfile.TemporaryDirectory() as temp_dir:
            # ---- Step 3: Download Audio using yt-dlp ----
            logger.info("📥 YouTube audio indirilmeye başlanıyor: %s", original_url)
            audio_path = os.path.join(temp_dir, 'audio.m4a')
            ydl_opts = {
                'format': 'm4a/bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.extract_info(original_url, download=True)
            except Exception as dl_err:
                logger.error("❌ Audio download failed with yt-dlp for video: %s", original_url, exc_info=True)
                raise dl_err

            if not os.path.exists(audio_path):
                # Sometimes yt-dlp saves with a different extension if m4a isn't available
                files = os.listdir(temp_dir)
                if not files:
                    raise FileNotFoundError("Audio file was not downloaded by yt-dlp.")
                audio_path = os.path.join(temp_dir, files[0])

            logger.info("✅ Audio successfully downloaded to local path: %s", audio_path)

            # ---- Step 4: Transcription (OpenAI Whisper) ----
            logger.info("🎙️ OpenAI Whisper API'ye ses deşifresi için istek gönderiliyor...")
            try:
                with open(audio_path, "rb") as audio_file:
                    transcript_response = openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text"
                    )
            except Exception as whisper_err:
                logger.error("❌ OpenAI Whisper transcription API failed.", exc_info=True)
                raise whisper_err
            
            transcript_text = str(transcript_response).strip()
            logger.info("✅ Transcription completed. Length: %d characters", len(transcript_text))

            if not transcript_text:
                raise ValueError("Transcribed text is empty. The video might be silent or containing no speech.")

            # ---- Step 5: AI Analysis (OpenAI GPT-4o) ----
            logger.info("🧠 OpenAI GPT-4o ile transkript analizi başlatılıyor...")
            
            prompt = """Sen uzman bir TikTok/Reels içerik üreticisisin.
Aşağıdaki video transkriptini analiz et ve sosyal medyada en çok viral olma potansiyeli taşıyan, dikkat çekici ve kendi içinde anlam bütünlüğü olan 3 adet 30-60 saniyelik kısmı seç. 
Bana sadece JSON formatında yanıt ver. `start_time` ve `end_time` değerleri saniye cinsinden sayısal (float) olmalı.
Format:
{
  "clips": [
    {
      "title": "Viral Başlık",
      "start_time": 75.5,
      "end_time": 120.0,
      "score": 95.0,
      "viral_reason": "Neden viral olur açıklaması"
    }
  ]
}
"""
            try:
                completion = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Transkript:\n{transcript_text}"}
                    ],
                    response_format={"type": "json_object"}
                )
            except Exception as gpt_err:
                logger.error("❌ OpenAI GPT-4o chat completions API request failed.", exc_info=True)
                raise gpt_err

            ai_response_raw = completion.choices[0].message.content
            logger.info("OpenAI GPT-4o response received. Cleaning and parsing...")
            
            cleaned_json = clean_json_response(ai_response_raw)
            ai_result = json.loads(cleaned_json)
            
            if not ai_result or "clips" not in ai_result:
                raise ValueError("AI failed to return a valid 'clips' array structure.")

            clips_list = ai_result["clips"]
            if not isinstance(clips_list, list):
                raise ValueError("AI 'clips' key is not a JSON list.")

            logger.info("✅ AI successfully found %d viral clips from transcription.", len(clips_list))

            # ---- Step 6: Save clips to database ----
            logger.info("Writing clips metadata into Supabase 'clips' table...")
            clips_to_insert = []
            for idx, clip in enumerate(clips_list):
                clips_to_insert.append({
                    "video_id": video_id,
                    "title": clip.get("title", f"Viral Clip #{idx+1}"),
                    "start_time": float(clip.get("start_time", 0.0)),
                    "end_time": float(clip.get("end_time", 0.0)),
                    "transcript": clip.get("viral_reason", ""), # Use viral reason as transcript summary for now
                    "score": float(clip.get("score", 90.0)),
                })

            clips_result = db.table("clips").insert(clips_to_insert).execute()
            created_count = len(clips_result.data) if clips_result.data else 0
            logger.info("✅ Successfully registered %d clip rows in Supabase clips table.", created_count)

        # ---- Step 7: Mark as transcribed ----
        logger.info("Updating video %s status to 'transcribed' in Supabase...", video_id)
        db.table("videos").update({
            "status": "transcribed",
            "processed_url": original_url,  # In a full pipeline, this would be an S3/Supabase Storage URL
        }).eq("id", video_id).execute()
        logger.info("✅ Video status updated to 'transcribed'")

        # ---- Step 8: Dispatch Render Task ----
        logger.info("🚀 Dispatching downstream render task render_video_clips for video %s", video_id)
        from app.workers.video_renderer import render_video_clips
        render_video_clips.delay(video_id)

        logger.info("🎉 [Video ID: %s] pipeline completed successfully!", video_id)

        return {
            "video_id": video_id,
            "status": "transcribed",
            "clips_created": created_count,
        }

    except Exception as exc:
        # ---- Mark as failed ----
        tb_str = traceback.format_exc()
        error_msg = f"Processing failed: {str(exc)}"
        logger.error("❌ Video %s failed during process_video: %s\n%s", video_id, exc, tb_str, exc_info=True)

        try:
            logger.info("Setting status to 'failed' for video %s in Supabase...", video_id)
            db.table("videos").update({
                "status": "failed",
                "error_message": error_msg[:500],  # Truncate long error messages
            }).eq("id", video_id).execute()
            logger.info("✅ Video status successfully marked as 'failed'")
        except Exception as db_err:
            logger.error("❌ Failed to update video status to 'failed': %s", db_err, exc_info=True)

        raise exc  # Re-raise to trigger Celery retry mechanism
