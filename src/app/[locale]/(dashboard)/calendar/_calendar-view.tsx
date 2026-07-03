"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronRight as ChevronRightIcon, Loader2, MapPin, X, Clock, AlertCircle, Play } from "lucide-react";
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
  startOfYear,
  endOfYear,
  addMonths,
  subMonths,
  addYears,
  subYears,
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
import { publishPost } from "@/lib/actions/publish";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { EditPostDialog, EditPostData } from "@/components/edit-post-dialog";
import { PreviewDialog } from "@/components/preview-dialog";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";
import { StatsCards } from "@/components/calendar/stats-cards";
import { ViewSwitcher, type CalendarViewMode } from "@/components/calendar/view-switcher";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { CurrentTimeIndicator } from "@/components/calendar/current-time-indicator";
import type { PostPlatform, Post } from "@/types/calendar";
import { PLATFORMS } from "@/lib/constants/platforms";
import { PostCalendarChip, PlatformIconsGroup, getChipStatusStyles, PlatformIconMap } from "@/components/calendar/post-calendar-chip";

const MAX_MEDIA_FILES = 10;

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

interface CalendarViewProps {
  posts: Post[];
  platforms: { id: string; label: string }[];
  platformFilter: string;
  statusFilter: string;
  tagFilter?: string;
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
    // Internal organization tags
    internalTags?: string;
    internalTagsPlaceholder?: string;
    createTag?: string;
    noInternalTags?: string;
    selectColor?: string;
    add?: string;
    cancel?: string;
    // Prompt 003 – Post detail preview mode
    viewLivePost?: string;
    editPostButton?: string;
    postDetail?: string;
    noPublishedPlatforms?: string;
    previewTitle?: string;
    previewPlaceholderName?: string;
    previewCaptionHint?: string;
    previewNoMedia?: string;
    previewFacebookTab?: string;
    previewInstagramTab?: string;
    previewYoutubeTab?: string;
    previewLinkedinTab?: string;
    // New view modes (Prompt 002 – Dashboard-style redesign)
    day?: string;
    year?: string;
    agenda?: string;
    miniCalendar?: string;
    currentTime?: string;
    allDay?: string;
    noPostsInRange?: string;
    // Stats card labels (Prompt 002)
    stats?: {
      totalPublished: string;
      totalScheduled: string;
      failedPosts: string;
      drafts: string;
      thisMonth: string;
    };
  };
 }

export function CalendarView({
  posts,
  platforms,
  platformFilter,
  statusFilter,
  tagFilter = "",
  weekdays,
  months,
  locale,
  tCalendar,
}: CalendarViewProps) {
  if (!posts) return null;

  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Prompt 002 – rozšířený view state: Agenda / Day / Week / Month / Year.
  // Typ `CalendarViewMode` je importovaný z `@/components/calendar/view-switcher`,
  // aby byl single source of truth pro přepínač i interní logiku.
  const [view, setView] = useState<CalendarViewMode>("month");
  const [modalDay, setModalDay] = useState<Date | null>(null);

  // Edit post modal state
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditPostData | null>(null);

  // Preview modal state – default action on post click (Prompt 007)
  const [previewPostOpen, setPreviewPostOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);

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
  const [formSelectedTagIds, setFormSelectedTagIds] = useState<string[]>([]);
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

  // Prompt 002 – nové navigační helpery pro Day / Year módy.
  const previousDay = () => {
    setCurrentDate(addDays(currentDate, -1));
  };
  const nextDay = () => {
    setCurrentDate(addDays(currentDate, 1));
  };
  const previousYear = () => {
    setCurrentDate(subYears(currentDate, 1));
  };
  const nextYear = () => {
    setCurrentDate(addYears(currentDate, 1));
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
    // Prompt 002 – Day view: pole s jedním dnem (obaleno pro konzistenci
    // s ostatními módy, které pracují s `days.map`).
    if (view === "day") {
      return [currentDate];
    }
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [view, calendarStart, calendarEnd, weekStart, weekEnd, currentDate]);

  // Prompt 002 – Year view: 12 měsíců aktuálního roku (použito v JSX pro grid).
  const yearMonths = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [currentDate]);

  // Prompt 002 – Agenda view: delší horizont příspěvků (60 dní dopředu),
  // vhodný pro desktop "seznam" zobrazení.
  const AGENDA_RANGE_DAYS = 60;
  // Definujeme zde (za `days`) – `getPostsForDayEffective` je deklarovaný níže,
  // ale přes useCallback closure se správně inicializuje. Pokud by se zde
  // undefined choval nekonzistentně, fallbackujeme na prázdné pole.

  const formatTime = useCallback((isoString: string) => {
    const date = new Date(isoString);
    const h = getHours(date);
    const m = getMinutes(date);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, []);

  // Returns the date the post should appear on in the calendar grid.
  // - For published posts: earliest published_at across published platforms
  //   (a post published "today" but created as a draft "yesterday" must show on today's cell)
  // - Otherwise: post.scheduled_at (server fills this with post.created_at as fallback)
  // - Last resort: null (caller falls back to "today")
  const getPostDisplayDate = useCallback((post: Post): string | null => {
    const publishedPlatforms = (post.post_platforms ?? []).filter(
      (p) => p.status === "published" && p.published_at
    );
    if (publishedPlatforms.length > 0) {
      const sorted = publishedPlatforms
        .map((p) => p.published_at as string)
        .sort();
      return sorted[0] ?? null;
    }
    return post.scheduled_at ?? null;
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
    setFormSelectedTagIds([]);
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
    setFormSelectedTagIds([]);
    setFormError(null);
  }, []);

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
        if (formPlatforms.length === 0) {
          const msg = "Pro publikování vyber alespoň jednu platformu.";
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
          tagIds: formSelectedTagIds,
          mediaUrls: [],
        });

        if (!createResult.success || !createResult.data?.id) {
          const msg = createResult.error ?? (tCalendar.errorSaving || "Chyba při ukládání");
          setFormError(msg);
          toast.error(msg);
          return;
        }

        const publishResult = await publishPost({ postId: String(createResult.data.id) });
        if (publishResult.success) {
          toast.success("Příspěvek byl úspěšně publikován!");
          handleCloseModal();
          router.refresh();
          return;
        }

        const msg = publishResult.error ?? "Publikování selhalo.";
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
        tagIds: formSelectedTagIds,
        mediaUrls: [],
      });

      if (result.success) {
        toast.success(tCalendar.postCreated || "Příspěvek vytvořen!");
        handleCloseModal();
        router.refresh();
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
  }, [formContent, formPlatforms, formScheduledAt, formLocation, formTags, formSelectedTagIds, tCalendar, handleCloseModal, normalizeScheduledAt]);

  const handlePostClick = useCallback((post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    // Prompt 007: Default action in Calendar is Preview (Eye), not Edit
    setPreviewPost(post);
    setPreviewPostOpen(true);
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
      if (tagFilter) {
        const postTagIds = (post.post_tags ?? []).map((t) => t.id);
        if (!postTagIds.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [posts, platformFilter, statusFilter, tagFilter]);

  // Memoizovaná mapa den → posty. Místo O(n) filteru pro každý den
  // se jednou projdou všechny posty a rozloží do Map podle display date.
  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    const today = new Date();
    effectiveFilteredPosts.forEach((post) => {
      const displayDate = getPostDisplayDate(post);
      let key: string;
      if (displayDate) {
        key = format(new Date(displayDate), "yyyy-MM-dd");
      } else {
        // Post bez data → zobrazíme na dnešku
        key = format(today, "yyyy-MM-dd");
      }
      map.set(key, [...(map.get(key) ?? []), post]);
    });
    return map;
  }, [effectiveFilteredPosts, getPostDisplayDate]);

  const getPostsForDayEffective = useCallback((day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    return postsByDay.get(key) ?? [];
  }, [postsByDay]);

  // #10 - Zakázat vytváření NOVÝCH příspěvků v minulosti
  // Pokud je den v minulosti a nejsou na něj žádné příspěvky, zobrazíme toast a neotevřeme modal
  const handleDayClick = useCallback((day: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clickedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    if (clickedDay < today) {
      const dayPosts = getPostsForDayEffective(day);
      if (dayPosts.length === 0) {
        toast.info(
          locale === "cs"
            ? "Nelze vytvořit příspěvek pro minulý den."
            : locale === "uk"
            ? "Неможливо створити публікацію для минулого дня."
            : "Cannot create a post for a past date."
        );
        return;
      }
      // Pokud jsou příspěvky, necháme otevřít Preview (klik na post) – handleDayClick se pro existující posty nevolá
    }

    handleOpenNewPostModal(day);
  }, [handleOpenNewPostModal, getPostsForDayEffective, locale, toast]);

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

  // Prompt 002 – Desktop Agenda view: 60 dní dopředu, konzistentní s `AGENDA_RANGE_DAYS`.
  // Tento useMemo je single source of truth pro desktop Agenda – v JSX
  // nahrazuje měsíční grid, když `view === "agenda"`.
  const desktopAgendaDays = useMemo(() => {
    const result: Array<{ day: Date; posts: Post[] }> = [];
    const today = new Date();
    for (let i = 0; i < AGENDA_RANGE_DAYS; i++) {
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

  // #11 — Skrýt hover preview při scrollu, aby fixed tooltip nepřekrýval obsah
  useEffect(() => {
    const handleScroll = () => setHoveredPost(null);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
      {/* Prompt 002 – Stats Cards (zobrazí se vždy, nad všemi view módy) */}
      <StatsCards
        posts={effectiveFilteredPosts}
        currentDate={currentDate}
        getDisplayDate={getPostDisplayDate}
        t={{
          totalPublished: tCalendar.stats?.totalPublished ?? "Total Published",
          totalScheduled: tCalendar.stats?.totalScheduled ?? "Total Scheduled",
          failedPosts: tCalendar.stats?.failedPosts ?? "Failed Posts",
          drafts: tCalendar.stats?.drafts ?? "Drafts",
          thisMonth: tCalendar.stats?.thisMonth ?? "This month",
        }}
      />

      {/* Desktop: dvousloupcový layout – MiniCalendar vlevo (sticky), kalendář vpravo.
          Mobile: jednosloupcový, MiniCalendar se nezobrazuje (šetří místo). */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-4 lg:items-start">
        {/* Mini-Calendar – sticky sidebar pro rychlý výběr data (desktop only) */}
        <div className="hidden lg:block lg:sticky lg:top-4">
          <MiniCalendar
            selectedDate={currentDate}
            onSelectDate={(d) => setCurrentDate(d)}
            onMonthChange={(d) => setCurrentDate(d)}
            weekdayShort={weekdays.map((d) => d.slice(0, 2))}
            months={months}
            locale={locale}
          />
        </div>

        {/* Hlavní obsah kalendáře (desktop) – zabírá pravý sloupec */}
        <div className="space-y-4 min-w-0">
      {/* View Toggle & Navigation – Desktop Only (Prompt 002: rozšířeno o Day/Agenda/Year) */}
      <div className="hidden lg:flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={
                view === "month" ? previousMonth :
                view === "week" ? previousWeek :
                view === "day" ? previousDay :
                view === "year" ? previousYear :
                previousMonth
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={
                view === "month" ? nextMonth :
                view === "week" ? nextWeek :
                view === "day" ? nextDay :
                view === "year" ? nextYear :
                nextMonth
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 text-lg font-semibold tracking-tight truncate">
              {view === "year"
                ? year
                : view === "agenda"
                ? `${tCalendar.agenda ?? "Agenda"} – ${tCalendar.stats?.thisMonth ?? "This month"}`
                : `${monthLabel} ${year}`}
            </h2>
          </div>

          {/* Nový ViewSwitcher s 5 módy (Agenda / Day / Week / Month / Year) */}
          <ViewSwitcher
            value={view}
            onChange={setView}
            t={{
              agenda: tCalendar.agenda ?? "Agenda",
              day: tCalendar.day ?? "Day",
              week: tCalendar.week ?? "Week",
              month: tCalendar.month ?? "Month",
              year: tCalendar.year ?? "Year",
            }}
          />
        </div>

      {/* ======================== */}
      {/* DESKTOP: Month View      */}
      {/* ======================== */}
      {view === "month" && (
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
                    const displayDate = getPostDisplayDate(post);
                    const time = displayDate ? formatTime(displayDate) : "";

                    return (
                      <PostCalendarChip
                        key={post.id}
                        post={post}
                        ref={(el) => {
                          if (el) postCardRefs.current.set(post.id, el);
                        }}
                        iconSize="xs"
                        contentLength={20}
                        time={time}
                        showPlatformBadges
                        onClick={(e) => handlePostClick(post, e)}
                        onMouseEnter={(e) => {
                          const target = e.currentTarget as HTMLDivElement;
                          handlePostHover(post, target);
                        }}
                        onMouseLeave={handlePostLeave}
                      />
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
      )}

      {/* ======================== */}
      {/* DESKTOP: Week View       */}
      {/* ======================== */}
      {view === "week" && (
      <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
        {/* Weekday Headers – pro week view stejné jako month, ale 7 dní */}
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
        {/* 7 dní aktuálního týdne (days je již správně naplněn dle view) */}
        <div className="grid grid-cols-7">
          {days.map((day, dayIndex) => {
            const dayPosts = getPostsForDayEffective(day);
            const today = isToday(day);
            return (
              <div
                key={dayIndex}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative min-h-[180px] border-r border-b border-black/[0.08] dark:border-white/[0.06] p-2 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                  today && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20",
                  dayIndex % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      today
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 6).map((post) => {
                    const displayDate = getPostDisplayDate(post);
                    const time = displayDate ? formatTime(displayDate) : "";
                    return (
                      <PostCalendarChip
                        key={post.id}
                        post={post}
                        ref={(el) => {
                          if (el) postCardRefs.current.set(post.id, el);
                        }}
                        iconSize="xs"
                        contentLength={16}
                        time={time}
                        onClick={(e) => handlePostClick(post, e)}
                        onMouseEnter={(e) => {
                          const target = e.currentTarget as HTMLDivElement;
                          handlePostHover(post, target);
                        }}
                        onMouseLeave={handlePostLeave}
                      />
                    );
                  })}
                  {dayPosts.length > 6 && (
                    <div className="text-[10px] text-muted-foreground/50 pl-1">
                      +{dayPosts.length - 6} {locale === "cs" ? "další" : locale === "uk" ? "більше" : "more"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ======================== */}
      {/* DESKTOP: Day View        */}
      {/* ======================== */}
      {/* 24hodinová vertikální osa s posty umístěnými podle času.
          CurrentTimeIndicator (červená linka) ukazuje aktuální čas. */}
      {view === "day" && (() => {
        const HOUR_HEIGHT = 60; // px na hodinu
        const dayPosts = getPostsForDayEffective(currentDate);
        // Seradit posty podle casu publikovani / naplanovani.
        const sortedDayPosts = [...dayPosts].sort((a, b) => {
          const da = getPostDisplayDate(a);
          const db = getPostDisplayDate(b);
          if (!da) return 1;
          if (!db) return -1;
          return new Date(da).getTime() - new Date(db).getTime();
        });
        return (
          <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
            {/* Hlavička dne */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  {format(currentDate, "EEEE", { locale: locale === "cs" ? cs : undefined })}
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {format(currentDate, "d. MMMM yyyy", { locale: locale === "cs" ? cs : undefined })}
                </div>
              </div>
              <div className="text-xs text-muted-foreground/60">
                {dayPosts.length}{" "}
                {locale === "cs"
                  ? (dayPosts.length === 1 ? "příspěvek" : dayPosts.length < 5 ? "příspěvky" : "příspěvků")
                  : locale === "uk"
                  ? (dayPosts.length === 1 ? "публікація" : dayPosts.length < 5 ? "публікації" : "публікацій")
                  : (dayPosts.length === 1 ? "post" : "posts")}
              </div>
            </div>

            {/* 24h časová osa + absolutně umístěné posty */}
            <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
              <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                {/* Hodinové linky + popisky */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-black/[0.04] dark:border-white/[0.04]"
                    style={{ top: `${h * HOUR_HEIGHT}px` }}
                  >
                    <span className="absolute -top-2 left-2 bg-white/90 dark:bg-card/90 px-1 text-[10px] text-muted-foreground/50 rounded">
                      {h.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                ))}

                {/* Prompt 002 – červená linka "Current Time" (live update každých 30s) */}
                <CurrentTimeIndicator hourHeight={HOUR_HEIGHT} label={tCalendar.currentTime ?? "Current time"} />

                {/* Posty – absolutně podle času publikování */}
                {sortedDayPosts.map((post) => {
                  const displayDate = getPostDisplayDate(post);
                  if (!displayDate) return null;
                  const d = new Date(displayDate);
                  const top = (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT;
                  const platformsToRender = post.post_platforms || [];
                  return (
                    <button
                      key={post.id}
                      onClick={() => handlePostClick(post, { stopPropagation: () => {} } as React.MouseEvent)}
                      className={cn(
                        "absolute left-16 right-4 rounded-lg border px-3 py-1.5 text-left transition-all hover:scale-[1.01]",
                        getChipStatusStyles(post.status)
                      )}
                      style={{ top: `${top}px`, minHeight: "32px" }}
                    >
                      <div className="flex items-center gap-2">
                        <PlatformIconsGroup platforms={platformsToRender} size="sm" />
                        <span className="text-[10px] font-semibold text-muted-foreground/70 shrink-0">
                          {formatTime(displayDate)}
                        </span>
                        <span className="text-xs truncate text-foreground/90">
                          {post.content?.substring(0, 60)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================== */}
      {/* DESKTOP: Agenda View     */}
      {/* ======================== */}
      {view === "agenda" && (
        <div className="hidden lg:flex flex-col rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
          <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.05] overflow-y-auto max-h-[calc(100vh-360px)]">
            {desktopAgendaDays.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground/60">
                {tCalendar.noPostsInRange ?? "No posts in this range"}
              </div>
            )}
            {desktopAgendaDays.map(({ day, posts }) => (
              <div key={format(day, "yyyy-MM-dd")} className="flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-white/90 dark:bg-card/95 backdrop-blur-md z-10">
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      isToday(day)
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        : "bg-white/[0.03] text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {formatAgendaDate(day)}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      {posts.length}{" "}
                      {locale === "cs"
                        ? (posts.length === 1 ? "příspěvek" : posts.length < 5 ? "příspěvky" : "příspěvků")
                        : locale === "uk"
                        ? (posts.length === 1 ? "публікація" : posts.length < 5 ? "публікації" : "публікацій")
                        : (posts.length === 1 ? "post" : "posts")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-3 pl-[52px]">
                  {posts.map((post) => {
                    const platformsToRender = post.post_platforms || [];
                    const displayDate = getPostDisplayDate(post);
                    const time = displayDate ? formatTime(displayDate) : "";
                    return (
                      <button
                        key={post.id}
                        onClick={(e) => handlePostClick(post, e)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.005]",
                          getChipStatusStyles(post.status)
                        )}
                      >
                        <PlatformIconsGroup platforms={platformsToRender} size="md" />
                        {time && (
                          <span className="text-xs text-muted-foreground/70 shrink-0 font-mono">
                            {time}
                          </span>
                        )}
                        <p className="text-xs text-foreground/80 truncate flex-1">
                          {post.content?.substring(0, 100)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================== */}
      {/* DESKTOP: Year View       */}
      {/* ======================== */}
      {/* 12 mini-měsíců v gridu 3x4. Každý mini-měsíc = 7x6 grid,
          klik na den = přepne currentDate a vrátí se do month view. */}
      {view === "year" && (
        <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden p-4">
          <div className="grid grid-cols-3 gap-3">
            {yearMonths.map((m, mIdx) => {
              const mStart = startOfMonth(m);
              const mEnd = endOfMonth(m);
              const mGridStart = dfnStartOfWeek(mStart, { weekStartsOn: 1 });
              const mGridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
              const mDays: Date[] = [];
              let d = mGridStart;
              while (d <= mGridEnd) {
                mDays.push(d);
                d = addDays(d, 1);
              }
              // Počty příspěvků v tomto měsíci (podle display date)
              const postsInMonth = effectiveFilteredPosts.filter((p) => {
                const dd = getPostDisplayDate(p);
                if (!dd) return false;
                const dt = new Date(dd);
                return dt.getFullYear() === m.getFullYear() && dt.getMonth() === m.getMonth();
              });
              return (
                <div
                  key={mIdx}
                  className="rounded-[14px] border border-black/[0.06] dark:border-white/[0.05] bg-white/40 dark:bg-white/[0.02] p-3 transition-all hover:bg-white/60 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold tracking-tight">
                      {months[m.getMonth()]}
                    </span>
                    {postsInMonth.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                        {postsInMonth.length}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {weekdays.map((wd, i) => (
                      <div key={i} className="flex h-4 items-center justify-center text-[8px] font-medium text-muted-foreground/40">
                        {wd.slice(0, 1)}
                      </div>
                    ))}
                    {mDays.map((day, dayIdx) => {
                      const inMonth = isSameMonth(day, m);
                      const today = isToday(day);
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayPosts = postsByDay.get(dayKey) ?? [];
                      const hasPosts = dayPosts.length > 0;
                      return (
                        <button
                          key={dayIdx}
                          type="button"
                          onClick={() => {
                            setCurrentDate(day);
                            setView("month");
                          }}
                          className={cn(
                            "relative flex h-5 w-full items-center justify-center rounded text-[9px] transition-all",
                            !inMonth && "text-transparent",
                            inMonth && !today && !hasPosts && "text-foreground/70 hover:bg-white/70 dark:hover:bg-white/[0.06]",
                            today && "bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold",
                            hasPosts && !today && "font-semibold text-foreground"
                          )}
                        >
                          {format(day, "d")}
                          {hasPosts && (
                            <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 flex h-[3px] w-[3px]">
                              <span className="h-[3px] w-[3px] rounded-full bg-indigo-500 dark:bg-indigo-400" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

        </div>
        {/* Konec: hlavní obsah kalendáře (pravý sloupec) + MiniCalendar grid */}
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
                  onClick={() => handleDayClick(day)}
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
                      const platformsToRender = post.post_platforms || [];
                      const displayDate = getPostDisplayDate(post);
                      const time = displayDate ? formatTime(displayDate) : "";

                      return (
                        <button
                          key={post.id}
                          onClick={(e) => handlePostClick(post, e)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]",
                            getChipStatusStyles(post.status)
                          )}
                        >
                          <PlatformIconsGroup platforms={platformsToRender} size="md" showBadges />
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
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-content" className="text-sm font-medium text-muted-foreground/80">
                  {tCalendar.content || "Obsah"}
                </Label>
                <AIAssistantButton
                  content={formContent}
                  onContentReplace={(text) => setFormContent(text)}
                  onTagsAdd={(newTags) => {
                    setFormTags((prev) => {
                      const existing = new Set(prev.map((tag) => tag.toLowerCase()));
                      const added = newTags.filter((tag) => !existing.has(tag.toLowerCase()));
                      return added.length > 0 ? [...prev, ...added] : prev;
                    });
                  }}
                />
              </div>
              <Textarea
                id="modal-content"
                placeholder={tCalendar.contentPlaceholder || "Napište příspěvek..."}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="min-h-[120px] resize-y bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
              />
              {/* #12 — Dynamický character limit podle vybraných platforem */}
              {(() => {
                const limits: Record<string, number> = {
                  twitter: 280, x: 280, instagram: 2200, linkedin: 3000,
                  facebook: Infinity, youtube: 5000, tiktok: 4000,
                };
                const maxLimit = formPlatforms.length > 0
                  ? Math.min(...formPlatforms.map((p) => limits[p] ?? Infinity))
                  : Infinity;
                return (
                  <div className="flex justify-end text-xs text-muted-foreground/60">
                    <span className={maxLimit !== Infinity && formContent.length > maxLimit ? "text-destructive" : ""}>
                      {formContent.length}
                      {maxLimit !== Infinity ? ` / ${maxLimit}` : ""}
                    </span>
                  </div>
                );
              })()}
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

            {/* Internal organization tags (Nastavení → Štítky) – interní, neodesílá se na sítě */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.internalTags || "Interní štítky"}
              </Label>
              <TagPicker
                selectedTagIds={formSelectedTagIds}
                onChange={setFormSelectedTagIds}
                t={{
                  placeholder: tCalendar.internalTagsPlaceholder || "Vyberte štítky…",
                  createTag: tCalendar.createTag || "Vytvořit štítek",
                  noTags: tCalendar.noInternalTags || "Žádné další štítky",
                  selectColor: tCalendar.selectColor || "Barva:",
                  add: tCalendar.add || "Přidat",
                  cancel: tCalendar.cancel || "Zrušit",
                }}
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
      />

      {/* Prompt 007 – Standalone Preview Dialog (Eye mode) */}
      <PreviewDialog
        open={previewPostOpen}
        onOpenChange={(isOpen) => {
          setPreviewPostOpen(isOpen);
          if (!isOpen) setPreviewPost(null);
        }}
        post={previewPost ? {
          id: previewPost.id,
          content: previewPost.content,
          platforms: previewPost.platforms ?? [],
          post_platforms: previewPost.post_platforms ?? [],
          scheduled_at: previewPost.scheduled_at,
          status: previewPost.status,
          location: previewPost.location ?? null,
          tags: previewPost.tags ?? [],
          media_urls: previewPost.media_urls ?? [],
        } : null}
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
              {hoveredPost.media_urls && hoveredPost.media_urls.length > 0 && (() => {
                const firstMedia = hoveredPost.media_urls[0];
                // Detect video from URL extension – mirrors the helper used in
                // src/app/[locale]/(dashboard)/posts/_post-card.tsx so the
                // calendar stays consistent with the posts list.
                const isVideo = firstMedia
                  ? /\.(mp4|mov|webm)(\?.*)?$/i.test(firstMedia)
                  : false;
                return (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-black/5 dark:bg-white/5">
                    {isVideo ? (
                      <>
                        <video
                          src={firstMedia}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20">
                            <Play className="h-4 w-4 text-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <NextImage
                        src={firstMedia ?? ""}
                        alt="Media preview"
                        width={384}
                        height={216}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                );
              })()}
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
                {(() => {
                  const hoverDisplayDate = getPostDisplayDate(hoveredPost);
                  if (!hoverDisplayDate) return null;
                  return (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(hoverDisplayDate).toLocaleTimeString(
                          locale === "cs" ? "cs-CZ" : locale === "uk" ? "uk-UA" : "en-US",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
