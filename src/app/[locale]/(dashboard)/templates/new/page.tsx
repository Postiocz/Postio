"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createTemplate } from "@/lib/actions/templates";

export default function NewTemplatePage() {
  const t = useTranslations("templates");
  const commonT = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const result = await createTemplate({
        name: name.trim(),
        content: content.trim(),
      });

      if (result.success) {
        router.push(`/${locale}/templates`);
      } else {
        setError(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/templates`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <h1 className="text-3xl font-bold">{t("newTemplate")}</h1>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("contentPlaceholder")}
          className="min-h-[220px] resize-y"
        />
      </div>

      <div className="flex gap-3">
        <Link href={`/${locale}/templates`}>
          <Button variant="outline" disabled={saving}>
            {commonT("cancel")}
          </Button>
        </Link>
        <Button onClick={handleCreate} disabled={!name.trim() || !content.trim() || saving}>
          {saving ? commonT("loading") : commonT("create")}
        </Button>
      </div>
    </div>
  );
}

