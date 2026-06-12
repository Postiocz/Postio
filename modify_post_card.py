import re

with open('src/app/[locale]/(dashboard)/posts/_post-card.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# handleDeleteConfirm
old_del = """      const isPublished = post.status === "published" && (post.published_platforms?.length ?? 0) > 0;"""
new_del = """      const isPublished = (post.post_platforms || []).some(p => p.status === 'published');"""
content = content.replace(old_del, new_del)

# Zobrazujeme platformy z post_platforms, nebo fallback na starý systém
old_plat = """              {/* Zobrazujeme platformy z post_platforms, nebo fallback na starý systém */}
              {(post.post_platforms && post.post_platforms.length > 0) ? (
                post.post_platforms.map((p) => {
                  const Icon = platformIcons[p.platform.toLowerCase()] ?? FileText;
                  const isPublished = p.status === "published";
                  const isFailed = p.status === "failed";
                  return (
                    <div
                      key={p.id || p.platform}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border shadow-sm shrink-0",
                        isPublished ? "bg-white dark:bg-white/[0.03] border-emerald-200 dark:border-emerald-500/30" :
                        isFailed ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" :
                        "bg-white/50 dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60"
                      )}
                      title={`Status: ${p.status}`}
                    >
                      <Icon className={cn("h-4 w-4", isPublished ? "text-emerald-600 dark:text-emerald-400" : isFailed ? "text-red-600 dark:text-red-400" : "text-foreground/80")} />
                    </div>
                  );
                })
              ) : post.status === "published" && (post.published_platforms ?? []).length > 0 ? (
                (post.published_platforms ?? []).map((platformId) => {
                  const Icon = platformIcons[platformId.toLowerCase()] ?? FileText;
                  return (
                    <div
                      key={platformId}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/5 shadow-sm shrink-0"
                    >
                      <Icon className="h-4 w-4 text-foreground/80" />
                    </div>
                  );
                })
              ) : (
                /* Pokud není publikováno a post_platforms chybí, ukaž plánované s nízkou opacitou */
                (post.platforms ?? []).map((platformId) => {
                  const Icon = platformIcons[platformId.toLowerCase()] ?? FileText;
                  return (
                    <div
                      key={platformId}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 shrink-0 opacity-40"
                    >
                      <Icon className="h-4 w-4 text-foreground/60" />
                    </div>
                  );
                })
              )}"""

new_plat = """              {/* Zobrazujeme platformy z post_platforms */}
              {(post.post_platforms || []).map((p) => {
                const Icon = platformIcons[p.platform.toLowerCase()] ?? FileText;
                const isPublished = p.status === "published";
                const isFailed = p.status === "failed";
                return (
                  <div
                    key={p.id || p.platform}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border shadow-sm shrink-0",
                      isPublished ? "bg-white dark:bg-white/[0.03] border-emerald-200 dark:border-emerald-500/30" :
                      isFailed ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" :
                      "bg-white/50 dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60"
                    )}
                    title={`Status: ${p.status}`}
                  >
                    <Icon className={cn("h-4 w-4", isPublished ? "text-emerald-600 dark:text-emerald-400" : isFailed ? "text-red-600 dark:text-red-400" : "text-foreground/80")} />
                  </div>
                );
              })}"""
content = content.replace(old_plat, new_plat)

# Removed externally warning
old_warn = """          {post.status === "removed_externally" && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {tRemovedExternallyMsg.replace("__platform__", (post.removed_from_platform ?? "platform").charAt(0).toUpperCase() + (post.removed_from_platform ?? "platform").slice(1))}
                </span>
                {post.removed_at && (
                  <span className="text-[11px] text-orange-600/70 dark:text-orange-400/70">
                    {new Date(post.removed_at).toLocaleDateString(localeTag, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          )}"""

new_warn = """          {post.status === "removed_externally" && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {tRemovedExternallyMsg.replace("__platform__", (post.post_platforms?.find(p => p.status === 'removed_externally')?.platform ?? "platform").charAt(0).toUpperCase() + (post.post_platforms?.find(p => p.status === 'removed_externally')?.platform ?? "platform").slice(1))}
                </span>
                {post.post_platforms?.find(p => p.status === 'removed_externally')?.updated_at && (
                  <span className="text-[11px] text-orange-600/70 dark:text-orange-400/70">
                    {new Date(post.post_platforms.find(p => p.status === 'removed_externally')!.updated_at).toLocaleDateString(localeTag, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          )}"""
content = content.replace(old_warn, new_warn)

# EditPostDialog props
old_edit = """    <EditPostDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      tAi={tAi}
      post={{
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
      }}
      locale={locale}
      tLabels={tLabels}
    />"""

new_edit = """    <EditPostDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      tAi={tAi}
      post={{
        id: post.id,
        content: post.content,
        platforms: post.platforms ?? [],
        post_platforms: post.post_platforms ?? [],
        scheduled_at: post.scheduled_at,
        status: post.status,
        location: post.location ?? null,
        tags: post.tags ?? [],
        media_urls: post.media_urls ?? [],
      }}
      locale={locale}
      tLabels={tLabels}
    />"""
content = content.replace(old_edit, new_edit)

# DeletePostDialog props
old_delete_props = """    <DeletePostDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      post={{
        id: post.id,
        status: post.status,
        published_platforms: post.published_platforms ?? [],
        external_ids: post.external_ids ?? null,
      }}
      onConfirm={handleDeleteConfirm}
      isDeleting={isDeleting}
    />"""

new_delete_props = """    <DeletePostDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      post={{
        id: post.id,
        status: post.status,
        post_platforms: post.post_platforms ?? [],
      }}
      onConfirm={handleDeleteConfirm}
      isDeleting={isDeleting}
    />"""
content = content.replace(old_delete_props, new_delete_props)

with open('src/app/[locale]/(dashboard)/posts/_post-card.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
