-- ============================================================
-- POSTIO – Create post_tags junction table
-- ============================================================
-- Vazební tabulka mezi posts a tags (N:M).
-- Umožňuje přiřadit příspěvku libovolné množství štítků
-- z uživatelské knihovny štítků (Nastavení → Štítky).
--
-- Štítky jsou INTERNÍ organizační pomůcka:
--   - NEODESÍLÁJÍ se na sociální sítě (publish flow pracuje pouze s posts.content)
--   - Slouží k lepší orientaci v kartě příspěvku (barevný badge)
--   - Plánují se filtry a analytika podle štítků (další iterace)
--
-- Inline hashtagy (posts.tags: string[]) zůstávají NEZÁVISLE na tomto feature.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Indexy pro rychlé JOIN dotazy
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON public.post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_user_id ON public.post_tags(user_id);

-- RLS
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Policies – RLS přes user_id (nikoliv přes JOIN na posts, jednodušší a rychlejší)
CREATE POLICY "Users can view own post_tags"
  ON public.post_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post_tags"
  ON public.post_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post_tags"
  ON public.post_tags FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pro updated_at (využívá existující funkci z migrace 001)
DROP TRIGGER IF EXISTS set_post_tags_updated_at ON public.post_tags;
CREATE TRIGGER set_post_tags_updated_at
  BEFORE UPDATE ON public.post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
