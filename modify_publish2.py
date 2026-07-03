import re

with open('src/lib/actions/publish.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# remove append_published_platform
old_rpc_append = """  // Atomic append to published_platforms via PostgreSQL RPC function.
  // Pass explicit user_id because auth.uid() returns NULL in RPC context.
  const { data: rpcResult, error: rpcError } = await supabase.rpc("append_published_platform", {
    p_post_id: postId,
    p_platform: platform,
    p_user_id: userId,
  });

  if (rpcError) {
    console.error("handlePublishSuccess: RPC append_published_platform FAILED:", rpcError.message);
  } else {
    console.log("handlePublishSuccess: RPC append_published_platform OK, result:", rpcResult);
    console.log("🔥 SERVER: Úspěšně zapsána platforma do DB!");
    // IHNED po úspěchu zavolej revalidaci
    revalidatePath("/", "layout");
  }"""
content = content.replace(old_rpc_append, """  // Hard revalidate – clear all Next.js cache
  revalidatePath("/", "layout");""")

# remove remove_published_platform
old_rpc_remove = """  // Remove platform from published_platforms via RPC (s explicitním user_id)
  const { error: rpcError } = await supabase.rpc("remove_published_platform", {
    p_post_id: input.postId,
    p_platform: input.platform,
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error("deleteFromMeta: RPC remove_published_platform FAILED:", rpcError.message);
    return { success: false, error: `Chyba při aktualizaci DB: ${rpcError.message}` };
  }

  console.log(`deleteFromMeta: Platforma ${input.platform} odstraněna z published_platforms`);"""
content = content.replace(old_rpc_remove, "")

with open('src/lib/actions/publish.ts', 'w', encoding='utf-8') as f:
    f.write(content)
