-- 1. Smazání starých verzí
DROP FUNCTION IF EXISTS public.remove_published_platform(uuid, text);
DROP FUNCTION IF EXISTS public.remove_published_platform(uuid, text, uuid);

-- 2. Vytvoření nové neprůstřelné funkce pro smazání "fajfky" v DB
CREATE OR REPLACE FUNCTION public.remove_published_platform(
  p_post_id UUID,
  p_platform TEXT,
  p_user_id UUID
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
    -- Vymažeme ID dané sítě z JSONu
    external_ids = (external_ids - p_platform),
    status = CASE
      WHEN array_length(array_remove(published_platforms, p_platform), 1) IS NULL THEN 'draft'
      ELSE status
    END
  WHERE id = p_post_id
    AND user_id = p_user_id
  RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;