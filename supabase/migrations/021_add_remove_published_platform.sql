-- 1. Funkce pro PŘIDÁNÍ platformy (Opravená o bezpečnost)
DROP FUNCTION IF EXISTS public.append_published_platform(uuid, text);

CREATE OR REPLACE FUNCTION public.append_published_platform(
  p_post_id UUID,
  p_platform TEXT
)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.posts;
BEGIN
  UPDATE public.posts
  SET
    published_platforms = CASE
      WHEN published_platforms IS NULL THEN ARRAY[p_platform]
      WHEN p_platform = ANY(published_platforms) THEN published_platforms
      ELSE array_append(published_platforms, p_platform)
    END,
    status = 'published',
    published_at = COALESCE(published_at, now())
  WHERE id = p_post_id
    AND user_id = auth.uid()
  RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;

-- 2. Funkce pro ODEBRÁNÍ platformy (Příprava pro budoucí selektivní mazání)
CREATE OR REPLACE FUNCTION public.remove_published_platform(
  p_post_id UUID,
  p_platform TEXT
)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.posts;
BEGIN
  UPDATE public.posts
  SET
    published_platforms = array_remove(published_platforms, p_platform),
    status = CASE
      -- Když po odebrání nezbyde žádná platforma, vrať status na draft
      WHEN array_length(array_remove(published_platforms, p_platform), 1) IS NULL THEN 'draft'
      ELSE status
    END
  WHERE id = p_post_id
    AND user_id = auth.uid()
  RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;
