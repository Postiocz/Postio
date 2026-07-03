import re

with open('src/lib/actions/publish.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'async function updatePostPublishState[\s\S]*?\}\n\n', '', content)

old_hps = """  // Update other fields (status, external_ids, etc.) – do NOT touch published_platforms here.
  await updatePostPublishState(supabase, {
    userId,
    postId,
    values: {
      status: "published",
      scheduled_at: null,
      published_at: publishedAt,
      external_ids: newExternalIds,
      publish_error: null,
    },
  });"""
content = content.replace(old_hps, "")

old_hpe1 = """  if (isAlreadyPublished) {
    // Post is already published on at least one platform – only record the error,
    // do NOT reset status or published_at
    await updatePostPublishState(supabase, {
      userId,
      postId,
      values: {
        publish_error: errorMessage,
      },
    });
  } else {
    // First publish attempt failed – mark as failed
    await updatePostPublishState(supabase, {
      userId,
      postId,
      values: {
        status: "failed",
        publish_error: errorMessage,
        published_at: null,
      },
    });
  }"""
content = content.replace(old_hpe1, "")

old_pp_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, platforms, media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
new_pp_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_platforms(*), media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
content = content.replace(old_pp_fetch, new_pp_fetch)

content = content.replace(
    """const platforms = Array.isArray(post.platforms) ? post.platforms : [];""",
    """const platforms = (post.post_platforms || []).map((p: any) => p.platform);"""
)

old_urp_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, status, platforms, external_ids, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
new_urp_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
content = content.replace(old_urp_fetch, new_urp_fetch)

old_urp_vars = """  if (post.status !== "published") {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const publishedPlatforms = Array.isArray(post.published_platforms) ? post.published_platforms : [];"""
new_urp_vars = """  const postPlatforms = post.post_platforms || [];
  const publishedPlatforms = postPlatforms.filter((p: any) => p.status === 'published');
  if (publishedPlatforms.length === 0) {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }
  const platforms = postPlatforms.map((p: any) => p.platform);
  const publishedPlatformNames = publishedPlatforms.map((p: any) => p.platform);"""
content = content.replace(old_urp_vars, new_urp_vars)

old_urp_plat = """  const targetPlatform = publishedPlatforms.find((p) => editablePlatforms.includes(p))
    ?? platforms[0]
    ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;"""
new_urp_plat = """  const targetPlatform = publishedPlatformNames.find((p: string) => editablePlatforms.includes(p))
    ?? publishedPlatformNames[0]
    ?? "facebook";

  const targetPlatformData = publishedPlatforms.find((p: any) => p.platform === targetPlatform);
  const externalId = targetPlatformData?.external_id ?? null;"""
content = content.replace(old_urp_plat, new_urp_plat)

old_dfm_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, status, external_ids, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
new_dfm_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
content = content.replace(old_dfm_fetch, new_dfm_fetch)

old_dfm_vars = """  if (post.status !== "published") {
    return { success: false, error: "Příspěvek není publikován." };
  }

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[input.platform]
    ? externalIds[input.platform].trim()
    : null;

  if (!externalId) {
    console.log(`deleteFromMeta: Na platformě ${input.platform} není ID (externalId chybí). Přeskakujeme API volání na Meta.`);
  }

  const publishedPlatforms = Array.isArray(post.published_platforms) ? post.published_platforms : [];"""
new_dfm_vars = """  const postPlatforms = post.post_platforms || [];
  const publishedPlatforms = postPlatforms.filter((p: any) => p.status === 'published');
  if (publishedPlatforms.length === 0) {
    return { success: false, error: "Příspěvek není publikován." };
  }

  const targetPlatformData = publishedPlatforms.find((p: any) => p.platform === input.platform);
  const externalId = targetPlatformData?.external_id ?? null;

  if (!externalId) {
    console.log(`deleteFromMeta: Na platformě ${input.platform} není ID (externalId chybí). Přeskakujeme API volání na Meta.`);
  }

  const publishedPlatformNames = publishedPlatforms.map((p: any) => p.platform);"""
content = content.replace(old_dfm_vars, new_dfm_vars)

content = content.replace(
    """if (!publishedPlatforms.includes(input.platform)) {""",
    """if (!publishedPlatformNames.includes(input.platform)) {"""
)

old_dfm_end = """  // If this was the last published platform, update status back to 'draft'
  const remainingPlatforms = publishedPlatforms.filter((p) => p !== input.platform);
  
  // Update external_ids locally by removing the key
  const updatedExternalIds = { ...externalIds };
  delete updatedExternalIds[input.platform];
  
  if (remainingPlatforms.length === 0) {
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: input.postId,
      values: {
        status: "draft",
        published_at: null,
        external_ids: updatedExternalIds,
      },
    });
  } else {
    // Just update external_ids without changing status
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: input.postId,
      values: {
        external_ids: updatedExternalIds,
      },
    });
  }"""
new_dfm_end = """  // Status updates on post_platforms are handled by remove_published_platform RPC or locally
  // Here we just make sure we update post_platforms status to draft
  await supabase.from("post_platforms").update({
      status: "draft",
      published_at: null,
      external_id: null
  }).eq("post_id", input.postId).eq("platform", input.platform);"""
content = content.replace(old_dfm_end, new_dfm_end)

old_pap_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, platforms, media_urls, location, tags, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
new_pap_fetch = """  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_platforms(*), media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();"""
content = content.replace(old_pap_fetch, new_pap_fetch)

old_pap_vars = """  const publishedPlatforms = (post.published_platforms as string[] | null) ?? [];

  // Already published to this platform
  if (publishedPlatforms.includes(input.platform)) {"""
new_pap_vars = """  const postPlatforms = post.post_platforms || [];
  const publishedPlatformNames = postPlatforms.filter((p: any) => p.status === 'published').map((p: any) => p.platform);

  // Already published to this platform
  if (publishedPlatformNames.includes(input.platform)) {"""
content = content.replace(old_pap_vars, new_pap_vars)

# Remove currentExternalIds / newExternalIds in handlePublishSuccess
content = re.sub(r'  const currentExternalIds = \(updatedPost\?\.external_ids as Record<string, string>\) \?\? \{\};\n  const newExternalIds = \{ \.\.\.currentExternalIds, \[platform\]: externalId \};\n\n  console\.log\("🔥 SAVING external_ids to DB:", newExternalIds, "for post:", postId\);\n', '', content)
content = re.sub(r'  const \{ data: updatedPost \} = await supabase[\s\S]*?\.single\(\);\n\n', '', content)
content = re.sub(r'  console\.log\("AKTUALIZOVANÉ PLATFORMY V DB:", updatedPost\?\.published_platforms\);\n\n', '', content)

with open('src/lib/actions/publish.ts', 'w', encoding='utf-8') as f:
    f.write(content)
