-- 1. Smažeme staré verze funkce 
DROP FUNCTION IF EXISTS public.append_published_platform(uuid, text); 


-- 2. Vytvoříme novou, která vrací celý řádek příspěvku a nastaví i status 
CREATE OR REPLACE FUNCTION public.append_published_platform( 
  p_post_id UUID, 
  p_platform TEXT 
) 
RETURNS public.posts 
LANGUAGE plpgsql 
SECURITY DEFINER 
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
  RETURNING * INTO v_post; 


  RETURN v_post; 
END; 
$$;