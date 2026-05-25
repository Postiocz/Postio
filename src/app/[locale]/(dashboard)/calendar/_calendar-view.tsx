"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronRight as ChevronRightIcon, ArrowLeft, Film, Image as ImageIcon, Loader2, MapPin, X, Clock } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  eachDayOfInterval,
  startOfWeek as dfnStartOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Instagram, Facebook, Twitter, Linkedin, Youtube, TikTok } from "@/components/ui/social-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPostAction } from "@/lib/actions/posts";
import { publishToFacebook } from "@/lib/actions/publish";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import NextImage from "next/image";
import { EditPostDialog, EditPostData } from "@/components/edit-post-dialog";

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

const MAX_MEDIA_FILES = 10;

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

interface Post {
  id: string;
  content: string;
  platforms: string[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  media_urls: string[];
}

interface CalendarViewProps {
  posts: Post[];
  platforms: { id: string; label: string }[];
  platformFilter: string;
  statusFilter: string;
  weekdays: string[];
  months: string[];
  locale: string;
  tCalendar: {
    title: string;
    month: string;
    week: string;
    allPlatforms: string;
    noPostsThisDay?: string;
    addPost?: string;
    newPost?: string;
    content?: string;
    contentPlaceholder?: string;
    selectPlatforms?: string;
    saveDraft?: string;
    schedule?: string;
    publishNow?: string;
    scheduledAt?: string;
    saving?: string;
    addMedia?: string;
    addTags?: string;
    locationPlaceholder?: string;
    postCreated?: string;
    errorSaving?: string;
    maxFilesReached?: string;
    characterCount?: string;
    statusDraft?: string;
    statusScheduled?: string;
    statusPublished?: string;
    statusFailed?: string;
    filterAll?: string;
    editPost?: string;
    postUpdated?: string;
    uploadSuccess?: string;
    uploadError?: string;
    uploading?: string;
    fileTooLarge?: string;
    fileTooLargeImage?: string;
    fileTooLargeVideo?: string;
    fileDeleted?: string;
    invalidFileType?: string;
    dropMedia?: string;
  };
}

export function CalendarView({
  posts,
  platforms,
  platformFilter,
  statusFilter,
  weekdays,
  months,
  locale,
  tCalendar,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [modalDay, setModalDay] = useState<Date | null>(null);

  // Edit post modal state
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditPostData | null>(null);

  // Hover preview state
  const [hoveredPost, setHoveredPost] = useState<Post | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const postCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // New post form state
  const [formContent, setFormContent] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>([]);
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagDraft, setFormTagDraft] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const previousMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
  };

  const previousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = dfnStartOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStart = dfnStartOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const days = useMemo(() => {
    if (view === "week") {
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [view, calendarStart, calendarEnd, weekStart, weekEnd]);

  const formatTime = useCallback((isoString: string) => {
    const date = new Date(isoString);
    const h = getHours(date);
    const m = getMinutes(date);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, []);

  const getBaseUrl = useCallback(() => {
    const pathnames = window.location.pathname.split("/").filter(Boolean);
    const localePart = pathnames[0] || "";
    const base = localePart ? `/${localePart}` : "";
    return base;
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalDay(null);
    setFormContent("");
    setFormPlatforms([]);
    setFormScheduledAt("");
    setFormLocation("");
    setFormTags([]);
    setFormTagDraft("");
    setFormError(null);
  }, []);

  const handleOpenNewPostModal = useCallback((day: Date) => {
    setModalDay(day);
    const dateStr = format(day, "yyyy-MM-dd");
    const hour = getHours(day);
    const minute = getMinutes(day);
    setFormScheduledAt(`${dateStr}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    setFormContent("");
    setFormPlatforms([]);
    setFormLocation("");
    setFormTags([]);
    setFormTagDraft("");
    setFormError(null);
  }, []);

  const handleDayClick = useCallback((day: Date) => {
    handleOpenNewPostModal(day);
  }, [handleOpenNewPostModal]);

  const handleToggleFormPlatform = useCallback((platformId: string) => {
    setFormPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  }, []);

  const handleCommitTag = useCallback((raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
    const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
    if (!normalized) return;
    const tag = `#${normalized}`;
    setFormTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      return exists ? prev : [...prev, tag];
    });
    setFormTagDraft("");
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setFormTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const normalizeScheduledAt = useCallback((value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }, []);

  const handleFormSubmit = useCallback(async (status: "draft" | "scheduled" | "published") => {
    if (!formContent.trim()) return;
    setFormLoading(true);
    setFormError(null);

    try {
      const normalizedScheduledAt = normalizeScheduledAt(formScheduledAt);

      if (status === "published") {
        if (formPlatforms.length === 0 || !formPlatforms.includes("facebook")) {
          const msg = "Pro publikování vyber Facebook.";
          setFormError(msg);
          toast.error(msg);
          return;
        }

        const createResult = await createPostAction({
          content: formContent.trim(),
          platforms: formPlatforms,
          scheduledAt: null,
          status: "draft",
          location: formLocation.trim() || undefined,
          tags: formTags.length > 0 ? formTags : undefined,
          mediaUrls: [],
        });

        if (!createResult.success || !createResult.data?.id) {
          const msg = createResult.error ?? (tCalendar.errorSaving || "Chyba při ukládání");
          setFormError(msg);
          toast.error(msg);
          return;
        }

        const publishResult = await publishToFacebook({ postId: String(createResult.data.id) });
        if (publishResult.success) {
          toast.success("Příspěvek byl úspěšně publikován na Facebooku!");
          handleCloseModal();
          window.location.reload();
          return;
        }

        const msg = publishResult.error ?? "Publikování na Facebook selhalo.";
        setFormError(msg);
        toast.error(msg);
        return;
      }

      const result = await createPostAction({
        content: formContent.trim(),
        platforms: formPlatforms,
        scheduledAt: normalizedScheduledAt,
        status,
        location: formLocation.trim() || undefined,
        tags: formTags.length > 0 ? formTags : undefined,
        mediaUrls: [],
      });

      if (result.success) {
        toast.success(tCalendar.postCreated || "Příspěvek vytvořen!");
        handleCloseModal();
        window.location.reload();
        return;
      }

      setFormError(result.error ?? (tCalendar.errorSaving || "Chyba při ukládání"));
      toast.error(result.error ?? (tCalendar.errorSaving || "Chyba při ukládání"));
    } catch {
      setFormError(tCalendar.errorSaving || "Chyba při ukládání");
      toast.error(tCalendar.errorSaving || "Chyba při ukládání");
    } finally {
      setFormLoading(false);
    }
  }, [formContent, formPlatforms, formScheduledAt, formLocation, formTags, tCalendar, handleCloseModal, normalizeScheduledAt]);

  const handlePostClick = useCallback((post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPost({
      id: post.id,
      content: post.content,
      platforms: post.platforms ?? [],
      scheduled_at: post.scheduled_at,
      status: post.status,
      location: post.location ?? null,
      tags: post.tags ?? [],
      media_urls: post.media_urls ?? [],
    });
    setEditPostOpen(true);
  }, []);

  const effectiveFilteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (platformFilter) {
        const postPlatforms = post.platforms || [];
        if (!postPlatforms.includes(platformFilter)) return false;
      }
      if (statusFilter) {
        if (post.status !== statusFilter) return false;
      }
      return true;
    });
  }, [posts, platformFilter, statusFilter]);

  const getPostsForDayEffective = useCallback((day: Date) => {
    const today = new Date();
    return effectiveFilteredPosts.filter((post) => {
      if (!post.scheduled_at) {
        return isSameDay(today, day);
      }
      const postDate = new Date(post.scheduled_at);
      return isSameDay(postDate, day);
    });
  }, [effectiveFilteredPosts]);

  const monthLabel = months[month];

  const agendaDays = useMemo(() => {
    const result: Array<{ day: Date; posts: Post[] }> = [];
    const today = new Date();
    const checkDays = 30;
    for (let i = 0; i < checkDays; i++) {
      const day = addDays(today, i);
      const dayPosts = getPostsForDayEffective(day);
      if (dayPosts.length > 0) {
        result.push({ day, posts: dayPosts });
      }
    }
    return result;
  }, [effectiveFilteredPosts, getPostsForDayEffective]);

  const mobileAgendaDays = useMemo(() => {
    const result: Array<{ day: Date; posts: Post[] }> = [];
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const day = new Date(ms);
    while (day <= me) {
      result.push({ day: new Date(day), posts: getPostsForDayEffective(day) });
      day.setDate(day.getDate() + 1);
    }
    return result;
  }, [currentDate, effectiveFilteredPosts, getPostsForDayEffective]);

  const formatAgendaDate = useCallback((day: Date) => {
    if (locale === "cs") {
      return format(day, "EEEE, d. MMMM yyyy", { locale: cs });
    }
    return `${weekdays[day.getDay() === 0 ? 6 : day.getDay() - 1]}, ${format(day, "MMMM yyyy")}`;
  }, [locale, weekdays]);

  const handlePostHover = useCallback((post: Post, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPost(post);
      const previewWidth = 288;
      const previewHeight = 250;
      const gap = 12;
      let x = rect.right + gap;
      let y = rect.top - previewHeight + gap;
      if (x + previewWidth > window.innerWidth - 12) {
        x = rect.left - previewWidth - gap;
      }
      if (x < 12) {
        x = rect.left + rect.width / 2 - previewWidth / 2;
        y = rect.bottom + gap;
      }
      if (y < 12) {
        y = rect.bottom + gap;
      }
      setHoverPosition({ x, y });
    }, 100);
  }, []);

  const handlePostLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredPost(null);
  }, []);

  const getPlatformColor = useCallback((platformId: string): string => {
    const colors: Record<string, string> = {
      instagram: "text-pink-500",
      facebook: "text-blue-600",
      twitter: "text-sky-500",
      x: "text-sky-500",
      linkedin: "text-blue-700",
      youtube: "text-red-600",
      tiktok: "text-rose-500",
    };
    return colors[platformId?.toLowerCase()] || "text-foreground/60";
  }, []);

  return (
    <div className="space-y-4">
      {/* View Toggle & Month Navigation – Desktop Only */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-2">
            <button
              onClick={view === "month" ? previousMonth : previousWeek}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={view === "month" ? nextMonth : nextWeek}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 text-lg font-semibold tracking-tight">
              {monthLabel} {year}
            </h2>
          </div>

          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
            <button
              onClick={() => setView("month")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
                view === "month"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tCalendar.month}
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
                view === "week"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tCalendar.week}
            </button>
          </div>
        </div>

      {/* ======================== */}
      {/* DESKTOP: Calendar Grid   */}
      {/* ======================== */}
      <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-black/[0.08] dark:border-white/[0.06]">
          {weekdays.map((day, i) => (
            <div
              key={i}
              className="border-r border-black/[0.08] dark:border-white/[0.06] last:border-r-0 px-2 py-3 text-center text-xs font-medium text-muted-foreground/60"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, dayIndex) => {
            const dayPosts = getPostsForDayEffective(day);
            const inCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            return (
              <div
                key={dayIndex}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative min-h-[90px] border-r border-b border-black/[0.08] dark:border-white/[0.06] p-2 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                  !inCurrentMonth && "bg-gray-100/50 dark:bg-transparent",
                  today && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20",
                  dayIndex % 7 === 6 && "border-r-0"
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      today
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        : inCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/30"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Posts in this day */}
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((post) => {
                    const primaryPlatform = (post.platforms || [])[0];
                    const Icon = PlatformIconMap[primaryPlatform] || CalendarIcon;
                    const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";

                    return (
                      <div
                        key={post.id}
                        ref={(el) => {
                          if (el) postCardRefs.current.set(post.id, el);
                        }}
                        onClick={(e) => handlePostClick(post, e)}
                        onMouseEnter={(e) => {
                          const target = e.currentTarget as HTMLDivElement;
                          handlePostHover(post, target);
                        }}
                        onMouseLeave={handlePostLeave}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-all hover:scale-[1.02] cursor-pointer lg:hover:scale-[1.02]",
                          post.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/20"
                            : post.status === "scheduled"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20"
                            : post.status === "failed"
                            ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/20"
                            : post.status === "draft"
                            ? "bg-gray-50 text-muted-foreground border border-gray-200 opacity-70 dark:bg-white/[0.02] dark:text-muted-foreground/50 dark:border-white/5 dark:opacity-60"
                            : "bg-gray-50 text-muted-foreground border border-gray-200 dark:bg-white/5 dark:text-muted-foreground dark:border-white/5"
                        )}
                        title={post.content?.substring(0, 60)}
                      >
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="flex-shrink-0">{time}</span>
                        <span className="truncate">
                          {post.content?.substring(0, 20)}
                        </span>
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground/50 pl-1">
                      +{dayPosts.length - 3} {locale === "cs" ? "další" : locale === "uk" ? "більше" : "more"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================== */}
      {/* MOBILE: Agenda View      */}
      {/* ======================== */}
      <div className="lg:hidden flex flex-col rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
        {/* Mobile Navigation – Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between w-full px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.06] bg-white/90 dark:bg-card/95 backdrop-blur-xl">
          <button
            onClick={previousMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold tracking-tight">
            {monthLabel} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Agenda – All days of current month */}
        <div className="flex flex-col divide-y divide-gray-200 dark:divide-white/5 overflow-y-auto max-h-[calc(100vh-280px)]">
          {mobileAgendaDays.map(({ day, posts }) => {
            const todayFlag = isToday(day);
            const weekdayName = weekdays[day.getDay() === 0 ? 6 : day.getDay() - 1];

            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className="flex flex-col"
              >
                {/* Day Header */}
                <div
                  onClick={() => handleOpenNewPostModal(day)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      todayFlag
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        : "bg-white/[0.03] text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {weekdayName}, {format(day, "d.")} {months[day.getMonth()]}
                    </span>
                    {posts.length > 0 ? (
                      <span className="text-xs text-muted-foreground/60">
                        {posts.length}{" "}
                        {locale === "cs"
                          ? (posts.length === 1 ? "příspěvek" : posts.length < 5 ? "příspěvky" : "příspěvků")
                          : locale === "uk"
                          ? (posts.length === 1 ? "публікація" : posts.length < 5 ? "публікації" : "публікацій")
                          : (posts.length === 1 ? "post" : "posts")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">
                        {locale === "cs" ? "Žádné příspěvky" : locale === "uk" ? "Немає публікацій" : "No posts"}
                      </span>
                    )}
                  </div>
                  {posts.length > 0 ? (
                    <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground/40 flex items-center">+</span>
                  )}
                </div>

                {/* Posts for this day */}
                {posts.length > 0 && (
                  <div className="space-y-2 px-4 pb-3 pl-[52px]">
                    {posts.map((post) => {
                      const primaryPlatform = (post.platforms || [])[0];
                      const Icon = PlatformIconMap[primaryPlatform] || CalendarIcon;
                      const time = post.scheduled_at ? formatTime(post.scheduled_at) : "";

                      return (
                        <button
                          key={post.id}
                          onClick={(e) => handlePostClick(post, e)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]",
                            post.status === "published"
                              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                              : post.status === "scheduled"
                              ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20"
                              : post.status === "failed"
                              ? "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
                              : post.status === "draft"
                              ? "bg-gray-50 border-gray-200 opacity-70 dark:bg-white/[0.02] dark:border-white/5 dark:opacity-60"
                              : "bg-gray-50 border-gray-200 dark:bg-white/[0.02] dark:border-white/5"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              post.status === "published"
                                ? "text-emerald-400"
                                : post.status === "scheduled"
                                ? "text-indigo-400"
                                : post.status === "failed"
                                ? "text-red-400"
                                : "text-muted-foreground"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground/80 truncate">
                              {post.content?.substring(0, 60)}
                            </p>
                            {time && (
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                {time}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Post Modal */}
      <Dialog open={modalDay !== null} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="max-w-lg rounded-[20px] bg-white/90 dark:bg-card/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/10 p-0 sm:max-w-lg" showCloseButton>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold">
              {tCalendar.newPost || "Nový příspěvek"}
              {modalDay && (
                <span className="font-normal text-muted-foreground/60 text-sm ml-2">
                  – {format(modalDay, "d. MMMM yyyy", { locale: locale === "cs" ? cs : undefined })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {formError && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="modal-content" className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.content || "Obsah"}
              </Label>
              <Textarea
                id="modal-content"
                placeholder={tCalendar.contentPlaceholder || "Napište příspěvek..."}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="min-h-[120px] resize-y bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
              />
              <div className="flex justify-end text-xs text-muted-foreground/60">
                <span className={formContent.length > 280 ? "text-destructive" : ""}>
                  {formContent.length} {tCalendar.characterCount || "/ 280"}
                </span>
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.selectPlatforms || "Vyberte platformy"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const isSelected = formPlatforms.includes(platform.id);
                  const Icon = PlatformIconMap[platform.id];
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => handleToggleFormPlatform(platform.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "border-gray-200 bg-gray-50 text-muted-foreground hover:bg-gray-100 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                      )}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {platform.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">Lokace</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder={tCalendar.locationPlaceholder || "Přidejte lokaci..."}
                  className="h-10 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 pl-10 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.addTags || "Štítky"}
              </Label>
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 px-3 py-1 text-xs text-indigo-100"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                value={formTagDraft}
                onChange={(e) => setFormTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCommitTag(formTagDraft);
                  }
                  if (e.key === "Backspace" && formTagDraft.length === 0 && formTags.length > 0) {
                    handleRemoveTag(formTags[formTags.length - 1] ?? "");
                  }
                }}
                placeholder={tCalendar.addTags || "Přidat štítky..."}
                className="h-10 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.scheduledAt || "Naplánovat"}
              </Label>
              <DateTimePicker
                value={formScheduledAt}
                onChange={setFormScheduledAt}
                locale={locale}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-white/5">
            <Button
              type="button"
              onClick={() => handleFormSubmit("draft")}
              disabled={!formContent.trim() || formLoading}
              variant="outline"
              className="rounded-xl border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            >
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formLoading ? (tCalendar.saving || "Ukládání...") : (tCalendar.saveDraft || "Koncept")}
            </Button>
            <Button
              type="button"
              onClick={() => handleFormSubmit("scheduled")}
              disabled={!formContent.trim() || !formScheduledAt || formLoading}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
              {formLoading ? (tCalendar.saving || "Ukládání...") : (tCalendar.schedule || "Naplánovat")}
            </Button>
            <Button
              type="button"
              onClick={() => handleFormSubmit("published")}
              disabled={!formContent.trim() || formPlatforms.length === 0 || formLoading}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formLoading ? (tCalendar.saving || "Ukládání...") : (tCalendar.publishNow || "Publikovat")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      <EditPostDialog
        open={editPostOpen}
        onOpenChange={(isOpen) => {
          setEditPostOpen(isOpen);
          if (!isOpen) setEditingPost(null);
        }}
        post={editingPost}
        locale={locale}
        tLabels={{
          newPost: tCalendar.newPost || "Nový příspěvek",
          editPost: tCalendar.editPost || "Upravit příspěvek",
          content: tCalendar.content || "Obsah",
          contentPlaceholder: tCalendar.contentPlaceholder || "Napište příspěvek...",
          selectPlatforms: tCalendar.selectPlatforms || "Vyberte platformy",
          saveDraft: tCalendar.saveDraft || "Koncept",
          schedule: tCalendar.schedule || "Naplánovat",
          publishNow: tCalendar.publishNow || "Publikovat",
          scheduledAt: tCalendar.scheduledAt || "Naplánovat",
          saving: tCalendar.saving || "Ukládání...",
          addTags: tCalendar.addTags || "Štítky",
          locationPlaceholder: tCalendar.locationPlaceholder || "Přidejte lokaci...",
          postCreated: tCalendar.postCreated || "Příspěvek vytvořen!",
          postUpdated: tCalendar.postUpdated || "Příspěvek aktualizován",
          errorSaving: tCalendar.errorSaving || "Chyba při ukládání",
          characterCount: tCalendar.characterCount || "/ 280",
          maxFilesReached: tCalendar.maxFilesReached || "Maximální počet souborů dosažen",
          addMedia: tCalendar.addMedia || "Média",
          dropMedia: tCalendar.dropMedia || "",
          uploading: tCalendar.uploading || "",
          uploadError: tCalendar.uploadError || "",
          uploadSuccess: tCalendar.uploadSuccess || "",
          fileTooLarge: tCalendar.fileTooLarge || "",
          fileTooLargeImage: tCalendar.fileTooLargeImage || "",
          fileTooLargeVideo: tCalendar.fileTooLargeVideo || "",
          fileDeleted: tCalendar.fileDeleted || "",
          invalidFileType: tCalendar.invalidFileType || "",
          statusDraft: tCalendar.statusDraft || "Koncept",
          statusScheduled: tCalendar.statusScheduled || "Naplánované",
          statusPublished: tCalendar.statusPublished || "Publikované",
          statusFailed: tCalendar.statusFailed || "Neúspěšné",
        }}
      />

      {/* Hover Preview – Desktop Only */}
      <AnimatePresence>
        {hoveredPost && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="hidden lg:block fixed z-[9999] pointer-events-none"
            style={{
              left: hoverPosition.x,
              top: hoverPosition.y,
            }}
          >
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[16px] p-4 w-72 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {hoveredPost.media_urls && hoveredPost.media_urls.length > 0 && (
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-black/5 dark:bg-white/5">
                  <NextImage
                    src={hoveredPost.media_urls[0]}
                    alt="Media preview"
                    width={384}
                    height={216}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-3">
                {hoveredPost.content?.substring(0, 80)}
                {hoveredPost.content?.length > 80 ? "..." : ""}
              </p>
              <div className="flex items-center justify-between border-t border-black/5 dark:border-white/10 pt-3">
                <div className="flex items-center gap-1.5">
                  {(hoveredPost.platforms || []).slice(0, 4).map((platformId) => {
                    const Icon = PlatformIconMap[platformId];
                    return Icon ? (
                      <Icon
                        key={platformId}
                        className={`h-3.5 w-3.5 ${getPlatformColor(platformId)}`}
                      />
                    ) : null;
                  })}
                </div>
                {hoveredPost.scheduled_at && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(hoveredPost.scheduled_at).toLocaleTimeString(
                        locale === "cs" ? "cs-CZ" : locale === "uk" ? "uk-UA" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
