"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, Wand2, Scissors, Hash, Loader2, ImagePlus, Brush } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface AIAssistantButtonProps {
  content: string;
  onContentReplace: (text: string) => void;
  onTagsAdd: (tags: string[]) => void;
  imageUrl?: string | null;
  onImageGenerated?: (imageUrl: string) => void;
  aiCredits?: number;
}

export function AIAssistantButton({
  content,
  onContentReplace,
  onTagsAdd,
  imageUrl,
  onImageGenerated,
  aiCredits,
}: AIAssistantButtonProps) {
  // #14 — Own i18n instead of props drilling (was 9 tAi props)
  const t = useTranslations("ai");
  const { locale } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");

  // KROK 1 (Prompt 057): AI image credits gating. 1 image = 1 ai_credits.
  const hasAiCredits = (aiCredits ?? 0) > 0;
  // ?reason=ai_credits lets the Billing page show a targeted toast on arrival.
  const billingUrl = `/${locale}/settings/billing?reason=ai_credits`;

  const handleTextAction = useCallback(
    async (action: "improve" | "shorten" | "hashtags") => {
      if (!content.trim()) {
        toast.info(t("aiEmptyContent"));
        setOpen(false);
        return;
      }

      setIsLoading(true);
      setOpen(false);

      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, text: content.trim() }),
        });

        const data = await response.json();

        logger.debug("🤖 AI API Response:", { ok: response.ok, status: response.status, data });

        if (!response.ok || !data.success) {
          logger.error("🤖 AI API Error:", data.error || "Unknown error");
          throw new Error(data.error || t("aiError"));
        }

        if (action === "hashtags") {
          const hashtags = data.result
            .split(/\s+/)
            .filter((tag: string) => tag.startsWith("#"))
            .slice(0, 10);
          onTagsAdd(hashtags);
          toast.success(t("aiSuccess"));
        } else {
          onContentReplace(data.result);
          toast.success(t("aiSuccess"));
        }
      } catch {
        toast.error(t("aiError"));
      } finally {
        setIsLoading(false);
      }
    },
    [content, onContentReplace, onTagsAdd, t]
  );

  const handleGenerateFromImage = useCallback(async () => {
    if (!imageUrl) {
      toast.info(t("aiNoImage"));
      setOpen(false);
      return;
    }

    setIsLoading(true);
    setOpen(false);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_from_image",
          text: content.trim() || undefined,
          imageUrl,
        }),
      });

      const data = await response.json();

      logger.debug("🤖 AI Vision API Response:", { ok: response.ok, status: response.status, data });

      if (!response.ok || !data.success) {
        logger.error("🤖 AI Vision API Error:", data.error || "Unknown error");
        throw new Error(data.error || t("aiError"));
      }

      onContentReplace(data.result);
      toast.success(t("aiSuccess"));
    } catch {
      toast.error(t("aiError"));
    } finally {
      setIsLoading(false);
    }
  }, [content, imageUrl, onContentReplace, t]);

  const handleGenerateImage = useCallback(async () => {
    // KROK 1 (Prompt 057): never allow generation without credits (UI + client guard).
    if (!hasAiCredits) {
      router.push(billingUrl);
      return;
    }
    if (!imagePrompt.trim()) {
      toast.info(t("aiEmptyContent"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 402) {
          toast.error(t("aiNoCredits"));
        } else {
          toast.error(data.error || t("aiError"));
        }
        return;
      }

      onImageGenerated?.(data.imageUrl);
      setImagePrompt("");
      setShowImagePrompt(false);
      toast.success(t("aiImageSuccess"));
    } catch {
      toast.error(t("aiError"));
    } finally {
      setIsLoading(false);
    }
  }, [imagePrompt, onImageGenerated, t]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isLoading}
          className={
            "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg px-3 py-1 text-xs flex items-center gap-2 transition-all hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t("aiThinking")}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("aiAssistant")}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        className="w-48 rounded-xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-2xl"
      >
        <DropdownMenuItem
          onClick={() => handleTextAction("improve")}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300"
        >
          <Wand2 className="h-4 w-4 text-indigo-400" />
          <span>{t("improveText")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleTextAction("shorten")}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300"
        >
          <Scissors className="h-4 w-4 text-pink-400" />
          <span>{t("shortenText")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleTextAction("hashtags")}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300"
        >
          <Hash className="h-4 w-4 text-emerald-400" />
          <span>{t("generateTags")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleGenerateFromImage}
          disabled={!imageUrl}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ImagePlus className="h-4 w-4 text-amber-400" />
          <span>{t("generateFromImage")}</span>
        </DropdownMenuItem>

        {/* KROK 1 (Prompt 057): render as Link so the "buy more" navigation is a
            client-side Link (same proven pattern as the X credits link) and the
            toast survives the transition. With credits it opens the generator. */}
        <DropdownMenuItem
          asChild
          aria-disabled={!hasAiCredits}
          className={cn(
            "flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300",
            !hasAiCredits && "opacity-50 cursor-not-allowed"
          )}
        >
          <Link
            href={billingUrl}
            onClick={(e) => {
              if (hasAiCredits) {
                e.preventDefault();
                setShowImagePrompt(true);
                setOpen(false);
              } else {
                // No AI credits – inform the user how to get more, then navigate
                // to Billing. Long duration + "I understand" dismiss button so the
                // message stays readable and is closed on purpose, not missed.
                toast.info(t("aiLimitToast"), {
                  duration: 7000,
                  action: {
                    label: t("aiGotIt"),
                    onClick: () => toast.dismiss(),
                  },
                });
              }
            }}
          >
            <Brush className={cn("h-4 w-4", hasAiCredits ? "text-violet-400" : "text-destructive/60")} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span>{t("generateImage")}</span>
                {/* KROK 5: AI credits indicator */}
                {aiCredits !== undefined && (
                  <span className={cn(
                    "text-[10px] font-medium",
                    aiCredits > 0 ? "text-muted-foreground/50" : "text-destructive/60"
                  )}>
                    🎨{aiCredits}
                  </span>
                )}
              </span>
              {/* KROK 1 (Prompt 057): exhausted-limit hint with a link to Billing */}
              {!hasAiCredits && (
                <span className="text-[10px] font-normal leading-tight text-red-500 dark:text-red-400/90">
                  {t("aiLimitExhausted")}{" "}
                  <span className="font-semibold text-indigo-500 underline underline-offset-2 dark:text-indigo-400">
                    {t("aiBuyMore")}
                  </span>
                </span>
              )}
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* AI Image Generation prompt input */}
    {showImagePrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
          className="w-full max-w-md rounded-[20px] border border-white/10 bg-card/80 backdrop-blur-xl p-6 shadow-2xl space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brush className="h-5 w-5 text-violet-400" />
            {t("generateImage")}
          </h3>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder={t("aiImagePrompt")}
            className="w-full min-h-[120px] resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerateImage();
              }
              if (e.key === "Escape") {
                setShowImagePrompt(false);
                setImagePrompt("");
              }
            }}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setShowImagePrompt(false); setImagePrompt(""); }}
              className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isLoading || !imagePrompt.trim()}
              className="bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl px-4 py-2 text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("aiGeneratingImage")}</span>
                </>
              ) : (
                <span>{t("aiGenerateBtn")}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
