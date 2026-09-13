"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ValidationIssue } from "@/lib/media/platform-policies";

/**
 * Small status badge shown next to a platform label when the selected media
 * has per-platform validation issues (media-policy work, KROK 2/3).
 *
 * Error-severity issues render a rose triangle, warnings an amber one.
 * Hovering shows the human-readable messages. Renders nothing when the
 * platform has no issues.
 *
 * Must be rendered inside a <TooltipProvider> (both post editors wrap their
 * platform/account pickers in one).
 */
export function PlatformMediaBadge({
  label,
  issues,
}: {
  label: string;
  issues: readonly ValidationIssue[];
}) {
  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === "error");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ml-1 inline-flex"
          role="img"
          aria-label={`${label}: ${hasError ? "chyba" : "varování"} médií`}
        >
          <AlertTriangle
            className={cn(
              "h-3 w-3",
              hasError
                ? "text-rose-500 dark:text-rose-400"
                : "text-amber-500 dark:text-amber-400",
            )}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          {issues.map((i) => (
            <span key={i.code} className="text-xs">
              {i.message}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}