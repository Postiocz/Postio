import re

with open('src/components/edit-post-dialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# isInstagramPublished
old_ig = """  const isInstagramPublished = useMemo(() => {
    if (!isEdit) return false;
    if (post?.post_platforms && post.post_platforms.length > 0) {
      return post.post_platforms.some(p => p.platform === 'instagram' && p.status === 'published');
    }
    return post?.status === "published" && (post?.published_platforms ?? []).includes("instagram");
  }, [isEdit, post?.status, post?.published_platforms, post?.post_platforms]);"""

new_ig = """  const isInstagramPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'instagram' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);"""
content = content.replace(old_ig, new_ig)

# isFacebookPublished
old_fb = """  const isFacebookPublished = useMemo(() => {
    if (!isEdit) return false;
    if (post?.post_platforms && post.post_platforms.length > 0) {
      return post.post_platforms.some(p => p.platform === 'facebook' && p.status === 'published');
    }
    return post?.status === "published" && (post?.published_platforms ?? []).includes("facebook");
  }, [isEdit, post?.status, post?.published_platforms, post?.post_platforms]);"""

new_fb = """  const isFacebookPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'facebook' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);"""
content = content.replace(old_fb, new_fb)

# unpublishedSelectedPlatforms
old_unp = """  const unpublishedSelectedPlatforms = useMemo(() => {
    const published = (post?.post_platforms && post.post_platforms.length > 0)
      ? post.post_platforms.filter(p => p.status === 'published').map(p => p.platform)
      : post?.published_platforms ?? [];
    return platforms.filter((p) => !published.includes(p));
  }, [platforms, post?.published_platforms, post?.post_platforms]);"""

new_unp = """  const unpublishedSelectedPlatforms = useMemo(() => {
    const published = (post?.post_platforms || []).filter(p => p.status === 'published').map(p => p.platform);
    return platforms.filter((p) => !published.includes(p));
  }, [platforms, post?.post_platforms]);"""
content = content.replace(old_unp, new_unp)

# useEffect published
old_eff_pub = """        const published = (post.post_platforms && post.post_platforms.length > 0)
          ? post.post_platforms.filter(p => p.status === 'published').map(p => p.platform)
          : post.published_platforms ?? [];"""
new_eff_pub = """        const published = (post.post_platforms || []).filter(p => p.status === 'published').map(p => p.platform);"""
content = content.replace(old_eff_pub, new_eff_pub)

# Platform render isPublished
old_plat_pub = """                const isPublished = (post?.post_platforms && post.post_platforms.length > 0)
                  ? post.post_platforms.some(p => p.platform === platform.id && p.status === 'published')
                  : (post?.published_platforms ?? []).includes(platform.id);"""
new_plat_pub = """                const isPublished = (post?.post_platforms || []).some(p => p.platform === platform.id && p.status === 'published');"""
content = content.replace(old_plat_pub, new_plat_pub)

with open('src/components/edit-post-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
