"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";

const PlatformIconMap: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
];

export function PostsFilters({
  initialStatus,
  initialPlatform,
  onFilterChange,
  tAllPlatforms,
  tFilterAll,
  tStatusDraft,
  tStatusScheduled,
  tStatusPublished,
  tStatusFailed,
}: {
  initialStatus?: string;
  initialPlatform?: string;
  onFilterChange: (platform: string, status: string) => void;
  tAllPlatforms: string;
  tFilterAll: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
}) {
  const [activePlatform, setActivePlatform] = useState(initialPlatform || "");
  const [activeStatus, setActiveStatus] = useState(initialStatus || "");

  useEffect(() => {
    setActivePlatform(initialPlatform || "");
  }, [initialPlatform]);

  useEffect(() => {
    setActiveStatus(initialStatus || "");
  }, [initialStatus]);

  const handlePlatformChange = useCallback((platformId: string) => {
    const newPlatform = activePlatform === platformId ? "" : platformId;
    setActivePlatform(newPlatform);
    onFilterChange(newPlatform, activeStatus);
  }, [activePlatform, activeStatus, onFilterChange]);

  const handleStatusChange = useCallback((status: string) => {
    const newStatus = activeStatus === status ? "" : status;
    setActiveStatus(newStatus);
    onFilterChange(activePlatform, newStatus);
  }, [activePlatform, activeStatus, onFilterChange]);

  const statusFilters = [
    { value: "", label: tFilterAll },
    { value: "draft", label: tStatusDraft },
    { value: "scheduled", label: tStatusScheduled },
    { value: "published", label: tStatusPublished },
    { value: "failed", label: tStatusFailed },
  ];

  const pillBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200";
  const pillActive =
    "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-white/10 dark:border-white/20 dark:text-white";
  const pillInactive =
    "bg-gray-50 border-gray-200 text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:bg-white/[0.03] dark:border-white/5 dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground";

  return (
    <div className="flex flex-col gap-3">
      {/* Platform Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handlePlatformChange("")}
          className={cn(
            pillBase,
            activePlatform === ""
              ? pillActive
              : pillInactive
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {tAllPlatforms}
        </button>
        {PLATFORMS.map((platform) => {
          const Icon = PlatformIconMap[platform.id];
          const isActive = activePlatform === platform.id;
          return (
            <button
              key={platform.id}
              onClick={() => handlePlatformChange(platform.id)}
              className={cn(
                pillBase,
                isActive
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300"
                  : pillInactive
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {platform.label}
            </button>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const isActive = activeStatus === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => handleStatusChange(filter.value)}
              className={cn(
                pillBase,
                isActive
                  ? pillActive
                  : pillInactive
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
