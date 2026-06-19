-- ============================================================
-- POSTIO - Migrate data from posts to post_platforms
-- ============================================================

INSERT INTO public.post_platforms (
    post_id,
    platform,
    status,
    scheduled_at,
    published_at,
    external_id,
    publish_error
)
SELECT
    p.id AS post_id,
    u_platform AS platform,
    CASE
        WHEN u_platform = ANY(COALESCE(p.published_platforms, '{}'::TEXT[])) THEN 'published'
        WHEN p.status = 'scheduled' THEN 'scheduled'
        WHEN p.status = 'failed' THEN 'failed'
        ELSE 'draft'
    END AS status,
    CASE WHEN p.status = 'scheduled' THEN p.scheduled_at ELSE NULL END AS scheduled_at,
    CASE WHEN u_platform = ANY(COALESCE(p.published_platforms, '{}'::TEXT[])) THEN p.published_at ELSE NULL END AS published_at,
    p.external_ids->>u_platform AS external_id,
    CASE WHEN p.status = 'failed' THEN p.publish_error ELSE NULL END AS publish_error
FROM public.posts p,
UNNEST(COALESCE(p.platforms, '{}'::TEXT[])) AS u_platform
ON CONFLICT (post_id, platform) DO NOTHING;