"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updatePost } from "@/lib/actions/posts";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin"];

export default function EditPostPage() {
  const t = useTranslations("posts");
  const router = useRouter();
  const { locale, id } = useParams() as { locale: string; id: string };
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: postData, error: err } = (await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single()) as {
        data: { content: string; platforms: string[]; status: string; scheduled_at: string | null } | null;
        error: Error | null;
      };

      if (err || !postData) return;

      setContent(postData.content);
      setSelectedPlatforms(postData.platforms ?? []);
      setStatus(postData.status);
      if (postData.scheduled_at) {
        const d = new Date(postData.scheduled_at);
        setScheduledAt(d.toISOString().slice(0, 16));
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await updatePost(id, {
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: scheduledAt || null,
        status: status as "draft" | "scheduled" | "published",
      });

      if (result.success) {
        router.push(`/${locale}/posts`);
      } else {
        setError(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/posts`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <h1 className="text-3xl font-bold">{t("editPost")}</h1>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="space-y-2">
        <Label>{t("status")}</Label>
        <div className="flex gap-2">
          {["draft", "scheduled", "published"].map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {t(s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] resize-y"
        />
      </div>

      {/* Platforms */}
      <div className="space-y-2">
        <Label>{t("selectPlatforms")}</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors" +
                  (isSelected
                    ? " border-primary bg-primary text-primary-foreground"
                    : " border-border bg-background hover:bg-muted")
                }
              >
                {t(platform)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label htmlFor="scheduledAt">{t("scheduledAt")}</Label>
        <input
          type="datetime-local"
          id="scheduledAt"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving || !content.trim()}>
        {saving ? t("loading") : t("save")}
      </Button>
    </div>
  );
}
