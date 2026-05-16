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
import tempfile
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
    logger.info("🎬 Starting processing for video %s (attempt %d)", video_id, self.request.retries + 1)

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is missing in configuration.")

    openai_client = OpenAI(api_key=settings.openai_api_key)

    try:
        # ---- Step 1: Mark as processing ----
        db.table("videos").update({"status": "processing"}).eq("id", video_id).execute()
        logger.info("Video %s status → processing", video_id)

        # ---- Step 2: Fetch video details ----
        video_result = db.table("videos").select("*").eq("id", video_id).execute()
        if not video_result.data:
            raise ValueError(f"Video {video_id} not found in database")

        video = video_result.data[0]
        original_url = video["original_url"]
        logger.info("Downloading audio from URL: %s", original_url)

        with tempfile.TemporaryDirectory() as temp_dir:
            # ---- Step 3: Download Audio using yt-dlp ----
            audio_path = os.path.join(temp_dir, 'audio.m4a')
            ydl_opts = {
                'format': 'm4a/bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(original_url, download=True)

            if not os.path.exists(audio_path):
                # Sometimes yt-dlp saves with a different extension if m4a isn't available
                files = os.listdir(temp_dir)
                if not files:
                    raise FileNotFoundError("Audio file was not downloaded.")
                audio_path = os.path.join(temp_dir, files[0])

            logger.info("Audio downloaded successfully: %s", audio_path)

            # ---- Step 4: Transcription (OpenAI Whisper) ----
            logger.info("Starting transcription via OpenAI Whisper...")
            with open(audio_path, "rb") as audio_file:
                transcript_response = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            transcript_text = str(transcript_response)
            logger.info("Transcription completed. Length: %d characters", len(transcript_text))

            # ---- Step 5: AI Analysis (OpenAI GPT-4o) ----
            logger.info("Analyzing transcript for viral segments...")
            
            from app.models.clip import ViralClipList
            
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

            completion = openai_client.beta.chat.completions.parse(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Transkript:\n{transcript_text}"}
                ],
                response_format=ViralClipList,
            )

            ai_result = completion.choices[0].message.parsed
            
            if not ai_result or not ai_result.clips:
                raise ValueError("AI failed to return valid clips.")

            # ---- Step 6: Save clips to database ----
            clips_to_insert = []
            for clip in ai_result.clips:
                clips_to_insert.append({
                    "video_id": video_id,
                    "title": clip.title,
                    "start_time": clip.start_time,
                    "end_time": clip.end_time,
                    "transcript": clip.viral_reason, # Use viral reason as transcript summary for now
                    "score": clip.score,
                })

            clips_result = db.table("clips").insert(clips_to_insert).execute()
            created_count = len(clips_result.data) if clips_result.data else 0
            logger.info("Created %d clips for video %s", created_count, video_id)

        # ---- Step 7: Mark as transcribed ----
        db.table("videos").update({
            "status": "transcribed",
            "processed_url": original_url,  # In a full pipeline, this would be an S3/Supabase Storage URL
        }).eq("id", video_id).execute()

        # ---- Step 8: Dispatch Render Task ----
        logger.info("Dispatching render task for video %s", video_id)
        from app.workers.video_renderer import render_video_clips
        render_video_clips.delay(video_id)

        logger.info("✅ Video %s processing completed — %d clips created", video_id, created_count)

        return {
            "video_id": video_id,
            "status": "transcribed",
            "clips_created": created_count,
        }

    except Exception as exc:
        # ---- Mark as failed ----
        error_msg = f"Processing failed: {str(exc)}"
        logger.error("❌ Video %s failed: %s", video_id, exc, exc_info=True)

        try:
            db.table("videos").update({
                "status": "failed",
                "error_message": error_msg[:500],  # Truncate long error messages
            }).eq("id", video_id).execute()
        except Exception as db_err:
            logger.error("Failed to update video status to 'failed': %s", db_err)

        raise exc  # Re-raise to trigger Celery retry mechanism
