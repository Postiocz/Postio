import re

with open('src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# EditPostDialog props passing in handlePostClick
old_click = """    setEditingPost({
      id: post.id,
      content: post.content,
      platforms: post.platforms ?? [],
      scheduled_at: post.scheduled_at,
      status: post.status,
      location: post.location ?? null,
      tags: post.tags ?? [],
      media_urls: post.media_urls ?? [],
      published_platforms: post.published_platforms ?? [],
      external_ids: post.external_ids ?? null,
    });"""

new_click = """    setEditingPost({
      id: post.id,
      content: post.content,
      platforms: post.platforms ?? [],
      post_platforms: post.post_platforms ?? [],
      scheduled_at: post.scheduled_at,
      status: post.status,
      location: post.location ?? null,
      tags: post.tags ?? [],
      media_urls: post.media_urls ?? [],
    });"""
content = content.replace(old_click, new_click)

# Desktop view
old_desktop = """                  {dayPosts.slice(0, 3).map((post) => {
                    const platformsToRender = (post.post_platforms && post.post_platforms.length > 0)
                      ? post.post_platforms
                      : (post.platforms || []).map(p => ({ platform: p, status: post.status }));
                    const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";"""

new_desktop = """                  {dayPosts.slice(0, 3).map((post) => {
                    const platformsToRender = post.post_platforms || [];
                    const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";"""
content = content.replace(old_desktop, new_desktop)

# Mobile view
old_mobile = """                    {posts.map((post) => {
                      const platformsToRender = (post.post_platforms && post.post_platforms.length > 0)
                        ? post.post_platforms
                        : (post.platforms || []).map(p => ({ platform: p, status: post.status }));
                      const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";"""

new_mobile = """                    {posts.map((post) => {
                      const platformsToRender = post.post_platforms || [];
                      const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";"""
content = content.replace(old_mobile, new_mobile)

with open('src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
