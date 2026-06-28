"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagIcon, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagBreakdownData {
  id: string;
  name: string;
  color: string;
  count: number;
  percentage: number;
  statusBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
}

interface TagBreakdownProps {
  tags: TagBreakdownData[];
  total: number;
  isLoading: boolean;
}

const statusLabels: Record<string, string> = {
  draft: "Koncept",
  scheduled: "Naplánované",
  publishing: "Publikování",
  published: "Publikované",
  failed: "Neúspěšné",
  removed_externally: "Odstraněno externě",
  archived: "Archivováno",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export function TagBreakdown({ tags, total, isLoading }: TagBreakdownProps) {
  const t = useTranslations("analytics");
  const [selectedTag, setSelectedTag] = useState<TagBreakdownData | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("postsByTag")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tags.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("postsByTag")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
              <TagIcon className="relative h-10 w-10 text-indigo-500/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground/60">
              {t("noTagsBreakdown")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/40">
              {t("noTagsBreakdownSubtitle")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("postsByTag")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/5 dark:hover:bg-white/[0.03]",
                  tag.id === "__other__" && "opacity-70",
                )}
              >
                {/* Color dot */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />

                {/* Name */}
                <span className="min-w-[80px] text-sm font-medium text-foreground">
                  {tag.id === "__other__" ? t("other") : tag.name}
                </span>

                {/* Bar + count */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(tag.percentage, 100)}%`,
                        backgroundColor: tag.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tag.count} ({tag.percentage.toFixed(0)}%)
                  </span>
                </div>

                {/* Chevron */}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTag} onOpenChange={(open) => !open && setSelectedTag(null)}>
        <DialogContent className="max-w-lg rounded-[20px] border border-white/10 bg-zinc-950/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTag && (
                <>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedTag.color }}
                    aria-hidden
                  />
                  <span>{selectedTag.id === "__other__" ? t("other") : selectedTag.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    — {selectedTag.count}{" "}
                    {selectedTag.count === 1
                      ? t("postSingular")
                      : selectedTag.count < 5
                        ? t("postsFew")
                        : t("postsMany")}
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTag && selectedTag.id !== "__other__" && (
            <div className="space-y-6 pt-2">
              {/* Status breakdown */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("statusBreakdown")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedTag.statusBreakdown).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">
                        {statusLabels[status] ?? status}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform breakdown */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("platformBreakdown")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedTag.platformBreakdown).map(([platform, count]) => (
                    <div
                      key={platform}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">
                        {platformLabels[platform] ?? platform}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTag && selectedTag.id === "__other__" && (
            <p className="py-4 text-center text-sm text-muted-foreground/60">
              {t("otherTagsDescription")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
