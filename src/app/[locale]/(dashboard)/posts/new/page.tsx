"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createPost } from "@/lib/actions/posts";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

const PLATFORMS = [
  { id: "instagram", labelCs: "Instagram", labelEn: "Instagram", labelUk: "Instagram" },
  { id: "facebook", labelCs: "Facebook", labelEn: "Facebook", labelUk: "Facebook" },
  { id: "twitter", labelCs: "Twitter/X", labelEn: "Twitter/X", labelUk: "Twitter/X" },
  { id: "linkedin", labelCs: "LinkedIn", labelEn: "LinkedIn", labelUk: "LinkedIn" },
];

export default function NewPostPage() {
  const t = useTranslations("posts");
  const router = useRouter();
  const { locale } = useParams();
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSubmit = async (status: "draft" | "scheduled" | "published") => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createPost({
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: status === "scheduled" ? scheduledAt : null,
        status,
      });

      if (result.success) {
        router.push(`/${locale}/posts`);
      } else {
        setError(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
    } finally {
      setLoading(false);
    }
  };

  const charCount = content.length;

  return (
    <div className="relative">
      {/* Background grid & glow effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl space-y-8">
        {/* Top bar: Logo + Back */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/posts`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("title")}
          </Link>
        </div>

        <h1 className="text-center text-3xl font-bold">{t("newPost")}</h1>

        {/* Glass form container */}
        <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium text-muted-foreground/80">
              {t("content")}
            </Label>
            <Textarea
              id="content"
              placeholder={t("contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-y bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span />
              <span className={charCount > 280 ? "text-destructive" : ""}>
                {charCount} {t("characterCount")}
              </span>
            </div>
          </div>

          {/* Platform selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("selectPlatforms")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const label =
                  platform.id === "twitter"
                    ? t("twitter")
                    : platform.id === "linkedin"
                      ? t("linkedin")
                      : platform.id === "instagram"
                        ? t("instagram")
                        : t("facebook");
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all" +
                      (isSelected
                        ? " border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : " border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledAt" className="text-sm font-medium text-muted-foreground/80">
              {t("scheduledAt")}
            </Label>
            <div className="relative">
              <input
                type="datetime-local"
                id="scheduledAt"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-indigo-500/50 focus:ring-0 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleSubmit("draft")}
              disabled={!content.trim() || loading}
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            >
              {t("saveDraft")}
            </Button>
            <Button
              onClick={() => handleSubmit("scheduled")}
              disabled={!content.trim() || !scheduledAt || loading}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t("schedule")}
            </Button>
            <Button
              onClick={() => handleSubmit("published")}
              disabled={!content.trim() || selectedPlatforms.length === 0 || loading}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {t("publishNow")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
