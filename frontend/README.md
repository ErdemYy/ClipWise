# 🎬 ClipWise Frontend

Next.js 14+ application with App Router, TypeScript, TailwindCSS, and Shadcn/ui.

## Setup

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

npm install
npm run dev
```

## Structure

```
src/
├── app/            # Next.js App Router pages
├── components/     # UI components (Shadcn + custom)
├── hooks/          # Custom React hooks
├── lib/            # Utilities, API client, Supabase clients
└── types/          # Shared TypeScript types
```

Open [http://localhost:3000](http://localhost:3000) to view in browser.
