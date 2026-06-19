import re

# Fix delete-post-dialog.tsx
with open('src/components/dashboard/delete-post-dialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import type { PostPlatform } from "./_post-card";',
    'import type { PostPlatform } from "@/app/[locale]/(dashboard)/posts/_post-card";'
)

with open('src/components/dashboard/delete-post-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix posts.ts
with open('src/lib/actions/posts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '      const targetPlatform = platforms[0] ?? "facebook";',
    ''
)

content = content.replace(
    '    const targetPlatform = platforms[0] ?? "unknown";',
    '    const targetPlatform = postPlatforms[0]?.platform ?? "unknown";'
)

content = content.replace(
    '  if (post.status !== "published" || !externalId) {',
    '  if (!isPublished || !externalId) {'
)

content = content.replace(
    'data.post_platforms.map(p => p.status)',
    'data.post_platforms.map((p: any) => p.status)'
)
content = content.replace(
    'data.post_platforms.map(p => p.platform)',
    'data.post_platforms.map((p: any) => p.platform)'
)

with open('src/lib/actions/posts.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix publish.ts
with open('src/lib/actions/publish.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    """  if (post.status !== "published") {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }

  const platforms = (post.post_platforms || []).map((p: any) => p.platform);
  const publishedPlatforms = Array.isArray(post.published_platforms) ? post.published_platforms : [];""",
    """  const postPlatforms = post.post_platforms || [];
  const publishedPlatforms = postPlatforms.filter((p: any) => p.status === 'published');
  if (publishedPlatforms.length === 0) {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }
  const publishedPlatformNames = publishedPlatforms.map((p: any) => p.platform);"""
)

with open('src/lib/actions/publish.ts', 'w', encoding='utf-8') as f:
    f.write(content)
