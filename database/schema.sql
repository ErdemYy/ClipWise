-- =====================================================
-- ClipWise — Supabase PostgreSQL Schema
-- Enterprise-ready database schema with RLS policies
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE subscription_status AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise',
    'cancelled'
);

CREATE TYPE video_status AS ENUM (
    'pending',
    'processing',
    'transcribed',
    'completed',
    'failed'
);

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT,
    avatar_url      TEXT,
    subscription_status subscription_status NOT NULL DEFAULT 'free',
    credits_remaining   INTEGER NOT NULL DEFAULT 10,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.users IS 'Application users with subscription and credit tracking';

-- =====================================================
-- STORED PROCEDURES (RPC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_user_credits(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET credits_remaining = credits_remaining + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIDEOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title           TEXT,
    original_url    TEXT NOT NULL,
    processed_url   TEXT,
    status          video_status NOT NULL DEFAULT 'pending',
    duration_seconds NUMERIC(10, 2),
    file_size_bytes  BIGINT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos (user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos (status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);

CREATE TRIGGER trg_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.videos IS 'Uploaded videos queued for AI processing';

-- =====================================================
-- CLIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id        UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    start_time      NUMERIC(10, 2) NOT NULL,
    end_time        NUMERIC(10, 2) NOT NULL,
    transcript      TEXT,
    video_url       TEXT,
    score           NUMERIC(5, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON public.clips (video_id);
CREATE INDEX IF NOT EXISTS idx_clips_score ON public.clips (score DESC NULLS LAST);

-- Constraint: end_time must be greater than start_time
ALTER TABLE public.clips
    ADD CONSTRAINT chk_clips_time_range CHECK (end_time > start_time);

COMMENT ON TABLE public.clips IS 'AI-generated short-form clips extracted from source videos';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- ---- Users Policies ----
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ---- Videos Policies ----
CREATE POLICY "Users can view their own videos"
    ON public.videos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
    ON public.videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
    ON public.videos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
    ON public.videos FOR DELETE
    USING (auth.uid() = user_id);

-- ---- Clips Policies ----
CREATE POLICY "Users can view clips of their own videos"
    ON public.clips FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            WHERE videos.id = clips.video_id
              AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clips of their own videos"
    ON public.clips FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            WHERE videos.id = clips.video_id
              AND videos.user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE ROLE: Allow backend (service_role) full access
-- =====================================================
-- Note: Supabase service_role key bypasses RLS by default.
-- No additional policies needed for backend operations.

-- =====================================================
-- SEED: Auto-create user profile on Supabase Auth signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- User Preferences Table
CREATE TABLE public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    default_language TEXT DEFAULT 'auto',
    default_font TEXT DEFAULT 'mrbeast',
    subtitle_color TEXT DEFAULT '#FFFFFF',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);
