-- Backfill published_platforms for legacy published posts
-- For posts with status 'published' and empty published_platforms,
-- copy the value from the platforms column.
UPDATE public.posts
SET published_platforms = platforms
WHERE status = 'published'
  AND (published_platforms IS NULL OR published_platforms = '{}')
  AND platforms IS NOT NULL AND platforms != '{}';
