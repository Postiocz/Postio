import re

with open('src/lib/actions/posts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. createPostAction insert
content = re.sub(
    r'content:\s*cleanData\.content,\s*platforms:\s*cleanData\.platforms,\s*scheduled_at:\s*cleanData\.scheduledAt,\s*status:\s*cleanData\.status,',
    r'content: cleanData.content,',
    content
)

# 2. updatePost updates
content = re.sub(
    r'if\s*\(cleanData\.platforms\s*!==\s*undefined\)\s*updateData\.platforms\s*=\s*cleanData\.platforms;\n\s*if\s*\(cleanData\.scheduledAt\s*!==\s*undefined\)\s*updateData\.scheduled_at\s*=\s*cleanData\.scheduledAt;\n\s*if\s*\(safeStatus\s*!==\s*undefined\)\s*updateData\.status\s*=\s*safeStatus;',
    r'',
    content
)

# 3. deletePost fetch
content = content.replace(
    '.select("id, platforms, external_ids, status")',
    '.select("id, post_platforms(*)")'
)

# 4. deletePost targetPlatform logic
old_target = """  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const targetPlatform = platforms[0] ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;"""
new_target = """  const postPlatforms = post.post_platforms || [];
  const publishedPlatform = postPlatforms.find(p => p.status === 'published' && p.external_id);
  const targetPlatform = publishedPlatform?.platform ?? "facebook";
  const externalId = publishedPlatform?.external_id ?? null;
  const isPublished = postPlatforms.some(p => p.status === 'published');"""
content = content.replace(old_target, new_target)

# 5. deletePost isPublished check
content = content.replace(
    'if (externalId && post.status === "published") {',
    'if (externalId && isPublished) {'
)

# 6. syncPostStatus fetch
content = content.replace(
    """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, platforms, external_ids, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const targetPlatform = platforms[0] ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;

  if (post.status !== "published" || !externalId) {""",
    """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const postPlatforms = post.post_platforms || [];
  const publishedPlatform = postPlatforms.find(p => p.status === 'published' && p.external_id);
  const targetPlatform = publishedPlatform?.platform ?? "facebook";
  const externalId = publishedPlatform?.external_id ?? null;

  if (!publishedPlatform || !externalId) {"""
)

# 7. syncPostStatus update status
content = content.replace(
    """      const { error: updateError } = await supabase
        .from("posts")
        .update({
          status: "removed_externally",
          removed_at: new Date().toISOString(),
          removed_from_platform: targetPlatform,
        })
        .eq("id", id)
        .eq("user_id", user.id);""",
    """      const { error: updateError } = await supabase
        .from("post_platforms")
        .update({
          status: "removed_externally",
          removed_at: new Date().toISOString(),
        })
        .eq("post_id", id)
        .eq("platform", targetPlatform);"""
)

# 8. resetPostStatus select
content = content.replace(
    """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();""",
    """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();"""
)

content = content.replace(
    """  if (post.status !== "removed_externally") {""",
    """  const hasRemoved = (post.post_platforms || []).some(p => p.status === "removed_externally");
  if (!hasRemoved) {"""
)

content = content.replace(
    """  const { error: updateError } = await supabase
    .from("posts")
    .update({
      status: "draft",
      removed_at: null,
      removed_from_platform: null,
      external_ids: {},
    })
    .eq("id", id)
    .eq("user_id", user.id);""",
    """  const { error: updateError } = await supabase
    .from("post_platforms")
    .update({
      status: "draft",
      removed_at: null,
    })
    .eq("post_id", id)
    .eq("status", "removed_externally");"""
)

# 9. getPosts query
content = content.replace(
    """  let query = supabase.from("posts").select("*, post_platforms(*)").order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return { success: false, error: error.message };
  }

  // Sort post_platforms to be consistent (e.g. by platform name)
  const dataWithSortedPlatforms = data?.map(post => {
    if (post.post_platforms && Array.isArray(post.post_platforms)) {
      post.post_platforms.sort((a: { platform: string }, b: { platform: string }) => a.platform.localeCompare(b.platform));
    }
    return post;
  });

  return { success: true, data: dataWithSortedPlatforms ?? [] };""",
    """  const { data, error } = await supabase.from("posts").select("*, post_platforms(*)").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return { success: false, error: error.message };
  }

  const processedData = data?.map(post => {
    const postPlatforms = post.post_platforms || [];
    postPlatforms.sort((a: any, b: any) => a.platform.localeCompare(b.platform));
    
    const statuses = postPlatforms.map((p: any) => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";

    return {
      ...post,
      status: computedStatus,
      platforms: postPlatforms.map((p: any) => p.platform),
      post_platforms: postPlatforms
    };
  });

  const filteredData = status ? processedData?.filter(p => p.status === status) : processedData;
  return { success: true, data: filteredData ?? [] };"""
)

# 10. getPost compute status
content = content.replace(
    """  if (data?.post_platforms && Array.isArray(data.post_platforms)) {
    data.post_platforms.sort((a: { platform: string }, b: { platform: string }) => a.platform.localeCompare(b.platform));
  }

  return { success: true, data };""",
    """  if (data?.post_platforms && Array.isArray(data.post_platforms)) {
    data.post_platforms.sort((a: { platform: string }, b: { platform: string }) => a.platform.localeCompare(b.platform));
    const statuses = data.post_platforms.map(p => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";
    
    data.status = computedStatus;
    data.platforms = data.post_platforms.map(p => p.platform);
  }

  return { success: true, data };"""
)

# 11. syncPublishedPosts
content = content.replace(
    """  const { data: posts, error: queryError } = await supabase
    .from("posts")
    .select("id, platforms, external_ids, status, last_sync_at")
    .eq("user_id", user.id)
    .eq("status", "published")
    .not("external_ids", "is", null)
    .or(`last_sync_at.is.null,last_sync_at.lt.${thirtyMinAgo}`);""",
    """  const { data: postsData, error: queryError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("user_id", user.id);
  // Post-filter to find published ones
  const posts = (postsData || []).filter(p => {
    return (p.post_platforms || []).some(pp => pp.status === 'published' && pp.external_id && (!pp.last_sync_at || new Date(pp.last_sync_at) < new Date(thirtyMinAgo)));
  });"""
)

old_loop = """  for (const post of posts) {
    const platforms = Array.isArray(post.platforms) ? post.platforms : [];
    const targetPlatform = platforms[0] ?? "facebook";
    
    const externalIds = (post.external_ids as Record<string, string>) ?? {};
    const externalId = externalIds[targetPlatform]
      ? externalIds[targetPlatform].trim()
      : null;

    if (!externalId) continue;"""

new_loop = """  for (const post of posts) {
    const pp = post.post_platforms.find((p: any) => p.status === 'published' && p.external_id && (!p.last_sync_at || new Date(p.last_sync_at) < new Date(thirtyMinAgo)));
    if (!pp) continue;
    const targetPlatform = pp.platform;
    const externalId = pp.external_id;"""

content = content.replace(old_loop, new_loop)

old_update_removed = """        await supabase
          .from("posts")
          .update({
            status: "removed_externally",
            removed_at: now,
            removed_from_platform: targetPlatform,
            last_sync_at: now,
          })
          .eq("id", post.id)
          .eq("user_id", user.id);"""

new_update_removed = """        await supabase
          .from("post_platforms")
          .update({
            status: "removed_externally",
            removed_at: now,
            last_sync_at: now,
          })
          .eq("post_id", post.id)
          .eq("platform", targetPlatform);"""

content = content.replace(old_update_removed, new_update_removed)

old_update_sync = """        await supabase
          .from("posts")
          .update({ last_sync_at: now })
          .eq("id", post.id)
          .eq("user_id", user.id);"""

new_update_sync = """        await supabase
          .from("post_platforms")
          .update({ last_sync_at: now })
          .eq("post_id", post.id)
          .eq("platform", targetPlatform);"""

content = content.replace(old_update_sync, new_update_sync)

with open('src/lib/actions/posts.ts', 'w', encoding='utf-8') as f:
    f.write(content)
