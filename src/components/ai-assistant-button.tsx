"use client";

import { useState, useCallback } from "react";
import { Sparkles, Wand2, Scissors, Hash, Loader2, ImagePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface AiTranslations {
  aiAssistant: string;
  improveText: string;
  shortenText: string;
  generateTags: string;
  aiThinking: string;
  aiSuccess: string;
  aiError: string;
  aiEmptyContent: string;
  generateFromImage: string;
  aiNoImage: string;
}

interface AIAssistantButtonProps {
  content: string;
  onContentReplace: (text: string) => void;
  onTagsAdd: (tags: string[]) => void;
  imageUrl?: string | null;
  t: AiTranslations;
}

export function AIAssistantButton({
  content,
  onContentReplace,
  onTagsAdd,
  imageUrl,
  t,
}: AIAssistantButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleTextAction = useCallback(
    async (action: "improve" | "shorten" | "hashtags") => {
      if (!content.trim()) {
        toast.info(t.aiEmptyContent);
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

        console.log("🤖 AI API Response:", { ok: response.ok, status: response.status, data });

        if (!response.ok || !data.success) {
          console.error("🤖 AI API Error:", data.error || "Unknown error");
          throw new Error(data.error || t.aiError);
        }

        if (action === "hashtags") {
          const hashtags = data.result
            .split(/\s+/)
            .filter((tag: string) => tag.startsWith("#"))
            .slice(0, 10);
          onTagsAdd(hashtags);
          toast.success(t.aiSuccess);
        } else {
          onContentReplace(data.result);
          toast.success(t.aiSuccess);
        }
      } catch {
        toast.error(t.aiError);
      } finally {
        setIsLoading(false);
      }
    },
    [content, onContentReplace, onTagsAdd, t.aiAssistant, t.aiEmptyContent, t.aiError, t.aiSuccess]
  );

  const handleGenerateFromImage = useCallback(async () => {
    if (!imageUrl) {
      toast.info(t.aiNoImage);
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

      console.log("🤖 AI Vision API Response:", { ok: response.ok, status: response.status, data });

      if (!response.ok || !data.success) {
        console.error("🤖 AI Vision API Error:", data.error || "Unknown error");
        throw new Error(data.error || t.aiError);
      }

      onContentReplace(data.result);
      toast.success(t.aiSuccess);
    } catch {
      toast.error(t.aiError);
    } finally {
      setIsLoading(false);
    }
  }, [content, imageUrl, onContentReplace, t.aiNoImage, t.aiError, t.aiSuccess]);

  return (
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
              <span>{t.aiThinking}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.aiAssistant}</span>
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
          <span>{t.improveText}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleTextAction("shorten")}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300"
        >
          <Scissors className="h-4 w-4 text-pink-400" />
          <span>{t.shortenText}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleTextAction("hashtags")}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300"
        >
          <Hash className="h-4 w-4 text-emerald-400" />
          <span>{t.generateTags}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleGenerateFromImage}
          disabled={!imageUrl}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-indigo-500/10 focus:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ImagePlus className="h-4 w-4 text-amber-400" />
          <span>{t.generateFromImage}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
