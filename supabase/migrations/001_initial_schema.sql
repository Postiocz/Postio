-- ============================================================
-- POSTIO – Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users – profil + plán
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'pro')),
  language      TEXT NOT NULL DEFAULT 'cs' CHECK (language IN ('cs', 'en', 'uk')),
  streak        INT NOT NULL DEFAULT 0,
  onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. social_accounts – propojené sociální sítě
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin')),
  account_name  TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. posts – příspěvky
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content       TEXT NOT NULL,
  media_urls    TEXT[] DEFAULT '{}',
  platforms     TEXT[] NOT NULL,
  scheduled_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. templates – šablony příspěvků
-- ============================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  content       TEXT NOT NULL,
  is_premium    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. analytics – metrika příspěvků
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  impressions   INT NOT NULL DEFAULT 0,
  engagements   INT NOT NULL DEFAULT 0,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. cookie_consents – GDPR souhlasy
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  necessary     BOOLEAN NOT NULL DEFAULT TRUE,
  analytics     BOOLEAN NOT NULL DEFAULT FALSE,
  marketing     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexy
-- ============================================================
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts(status);
CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON public.posts(scheduled_at);
CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS analytics_post_id_idx ON public.analytics(post_id);
CREATE INDEX IF NOT EXISTS templates_user_id_idx ON public.templates(user_id);

-- ============================================================
-- RLS – Row Level Security
-- ============================================================

-- Zapni RLS na všech tabulkách
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- --- users ---
CREATE POLICY "Users can view own row"
  ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- --- social_accounts ---
CREATE POLICY "Users can view own accounts"
  ON public.social_accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON public.social_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.social_accounts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON public.social_accounts FOR DELETE USING (auth.uid() = user_id);

-- --- posts ---
CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- --- templates ---
CREATE POLICY "Users can view own templates"
  ON public.templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE USING (auth.uid() = user_id);

-- --- analytics ---
CREATE POLICY "Users can view own analytics"
  ON public.analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = analytics.post_id AND posts.user_id = auth.uid()));

CREATE POLICY "Users can insert own analytics"
  ON public.analytics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = analytics.post_id AND posts.user_id = auth.uid()));

CREATE POLICY "Users can update own analytics"
  ON public.analytics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = analytics.post_id AND posts.user_id = auth.uid()));

CREATE POLICY "Users can delete own analytics"
  ON public.analytics FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = analytics.post_id AND posts.user_id = auth.uid()));

-- --- cookie_consents ---
CREATE POLICY "Users can manage own consents"
  ON public.cookie_consents FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Trigger – updated_at na posts
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
