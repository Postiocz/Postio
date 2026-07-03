-- ============================================================
-- POSTIO – Atomic append to published_platforms array
-- Solves race condition where concurrent publish calls
-- overwrite each other's platforms.
-- ============================================================

DROP FUNCTION IF EXISTS public.append_published_platform(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.append_published_platform(
  p_post_id UUID,
  p_platform TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  UPDATE public.posts
  SET
    published_platforms = CASE
      WHEN p_platform = ANY(published_platforms)
      THEN published_platforms  -- already present, no change
      ELSE published_platforms || ARRAY[p_platform]::TEXT[]
    END
  WHERE id = p_post_id
  RETURNING published_platforms INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'published_platforms', to_jsonb(v_result.published_platforms)
  );
END;
$$;
