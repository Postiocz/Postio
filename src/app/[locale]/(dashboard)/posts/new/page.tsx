"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Link href={`/${locale}/posts`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <h1 className="text-3xl font-bold">{t("newPost")}</h1>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <Textarea
          id="content"
          placeholder={t("contentPlaceholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] resize-y"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span />
          <span className={charCount > 280 ? "text-destructive" : ""}>
            {charCount} {t("characterCount")}
          </span>
        </div>
      </div>

      {/* Platform selection */}
      <div className="space-y-2">
        <Label>{t("selectPlatforms")}</Label>
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
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors" +
                  (isSelected
                    ? " border-primary bg-primary text-primary-foreground"
                    : " border-border bg-background hover:bg-muted")
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
        <Label htmlFor="scheduledAt">{t("scheduledAt")}</Label>
        <div className="relative">
          <input
            type="datetime-local"
            id="scheduledAt"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => handleSubmit("draft")}
          disabled={!content.trim() || loading}
          variant="outline"
        >
          {t("saveDraft")}
        </Button>
        <Button
          onClick={() => handleSubmit("scheduled")}
          disabled={!content.trim() || !scheduledAt || loading}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t("schedule")}
        </Button>
        <Button
          onClick={() => handleSubmit("published")}
          disabled={!content.trim() || selectedPlatforms.length === 0 || loading}
        >
          {t("publishNow")}
        </Button>
      </div>
    </div>
  );
}
