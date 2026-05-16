# 🔧 ClipWise Backend

FastAPI-based REST API for the ClipWise video repurposing platform.

## Setup

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

## Run

```bash
# API Server
uvicorn app.main:app --reload --port 8000

# Celery Worker
celery -A app.workers.celery_app worker --loglevel=info
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
