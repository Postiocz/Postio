-- ============================================================
-- POSTIO - Create post_platforms table (Phase 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','publishing','published','failed','removed_externally')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_id TEXT,
  publish_error TEXT,
  removed_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT post_platforms_post_id_platform_key UNIQUE (post_id, platform)
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_post_platforms_status_scheduled_at ON public.post_platforms(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_post_platforms_post_id ON public.post_platforms(post_id);

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_post_platforms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_post_platforms_updated_at ON public.post_platforms;
CREATE TRIGGER update_post_platforms_updated_at
    BEFORE UPDATE ON public.post_platforms
    FOR EACH ROW
    EXECUTE FUNCTION update_post_platforms_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.post_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own post platforms"
  ON public.post_platforms FOR ALL
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_platforms.post_id AND posts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_platforms.post_id AND posts.user_id = auth.uid()));