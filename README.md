# 🎬 ClipWise — AI-Powered Video Repurposer

**ClipWise** is an enterprise-ready SaaS platform that uses artificial intelligence to automatically repurpose long-form videos into engaging short-form clips optimized for social media.

---

## 🏗️ Architecture

```
clipwise/
├── frontend/     → Next.js 14+ (App Router, TypeScript, TailwindCSS, Shadcn/ui)
├── backend/      → Python (FastAPI, Celery, Redis)
└── database/     → Supabase PostgreSQL schema
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Redis** 7+
- **Supabase** account (or local instance)

### 1. Clone & configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Celery Worker

```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Database

Run `database/schema.sql` in your Supabase SQL Editor to create all tables, indexes, and RLS policies.

---

## 📚 Tech Stack

| Layer        | Technology                                    |
| ------------ | --------------------------------------------- |
| Frontend     | Next.js 14, TypeScript, TailwindCSS, Shadcn/ui, Lucide React |
| Backend      | FastAPI, Pydantic v2, Celery, Redis           |
| Database     | Supabase (PostgreSQL)                         |
| Auth         | Supabase Auth + JWT                           |
| Task Queue   | Celery + Redis                                |

---

## 📄 License

This project is proprietary software. All rights reserved.
