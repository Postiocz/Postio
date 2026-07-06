"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  getHours,
  getMinutes,
  startOfYear,
  addMonths,
  subYears,
  addYears,
} from "date-fns";
import {
  eachDayOfInterval,
  startOfWeek as dfnStartOfWeek,
  endOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, Film, Image as ImageIcon, ListOrdered, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createPostAction } from "@/lib/actions/posts";
import { publishPost } from "@/lib/actions/publish";
import { getNextAvailableQueueSlot } from "@/lib/actions/queue";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { EditPostDialog, EditPostData } from "@/components/edit-post-dialog";
import { PreviewDialog } from "@/components/preview-dialog";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";
import { PLATFORMS } from "@/lib/constants/platforms";
import { PlatformIconMap } from "@/components/calendar/post-calendar-chip";
import { StatsCards } from "@/components/calendar/stats-cards";
import { ViewSwitcher, type CalendarViewMode } from "@/components/calendar/view-switcher";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import type { Post } from "@/types/calendar";
// Extracted view components (#13)
import { MonthGridView } from "@/components/calendar/month-grid-view";
import { WeekGridView } from "@/components/calendar/week-grid-view";
import { DayTimelineView } from "@/components/calendar/day-timeline-view";
import { AgendaListView } from "@/components/calendar/agenda-list-view";
import { YearMiniGrid } from "@/components/calendar/year-mini-grid";
import { MobileAgendaView } from "@/components/calendar/mobile-agenda-view";
import { HoverPreview } from "@/components/calendar/hover-preview";

const MAX_MEDIA_FILES = 10;

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
    // Auto-Queue
    addToQueue?: string;
    queueLoading?: string;
    queuedSuccess?: string;
  };
 }

export function CalendarView({
  posts = [],
  platforms,
  platformFilter,
  statusFilter,
  tagFilter = "",
  weekdays,
  months,
  locale,
  tCalendar,
}: CalendarViewProps) {
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
  const [queuing, setQueuing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const uploadLabels = {
    tooManyFiles: tCalendar.maxFilesReached || "Maximum number of files reached",
    uploadSuccess: tCalendar.uploadSuccess || "File uploaded successfully",
    uploadError: tCalendar.uploadError || "Error uploading file",
    fileDeleted: tCalendar.fileDeleted || "File has been deleted",
    invalidFileType: tCalendar.invalidFileType || "Unsupported file format",
    unsupportedFormat: ({ type }: { type: string }) =>
      `Formát ${type || "unknown"} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV.`,
    videoTooLarge: tCalendar.fileTooLargeVideo || "Video je příliš velké (max. 50 MB).",
    videoLowResolution: "Video má nízké rozlišení (méně než 640px).",
    instagramVideoTooSmall: "Toto video nelze na Instagramu publikovat.",
    instagramVideoTooSmallHint: "Instagram nepodporuje videa s nízkým rozlišením.",
    fileTooLargeImage: tCalendar.fileTooLargeImage || "Image is too large (max 50 MB).",
    fileTooLargeVideo: tCalendar.fileTooLargeVideo || "File is too large. Max limit for videos is 20MB.",
    optimizingImage: "Soubor je příliš velký, optimalizuji...",
    fileOptimized: "Obrázek optimalizován",
    compressionError: "Nelze optimalizovat obrázek, nahrávám originál.",
  };
  const { items: mediaItems, addFiles: addMediaFiles, removeItem: removeMediaItem, getMediaUrls, hasUploading } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

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

  // First uploaded image URL for AI Vision (only ready uploads have server-accessible URLs)
  const firstImageUrl = useMemo(() => {
    const firstImage = mediaItems.find((item) => item.kind === "image" && item.status === "ready" && item.url);
    return firstImage?.url ?? null;
  }, [mediaItems]);

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
    if (hasUploading()) {
      toast.info(tCalendar.uploading || "Nahrávání médií...");
      return;
    }
    setFormLoading(true);
    setFormError(null);

    try {
      const normalizedScheduledAt = normalizeScheduledAt(formScheduledAt);
      const mediaUrls = getMediaUrls();

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
          mediaUrls,
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
        mediaUrls,
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
  }, [formContent, formPlatforms, formScheduledAt, formLocation, formTags, formSelectedTagIds, tCalendar, handleCloseModal, normalizeScheduledAt, getMediaUrls, hasUploading]);

  // Queue post to next available slot from user's posting schedule
  const handleQueueSubmit = useCallback(async () => {
    if (!formContent.trim()) return;
    if (hasUploading()) {
      toast.info(tCalendar.uploading || "Nahrávání médií...");
      return;
    }
    setQueuing(true);
    setFormError(null);

    try {
      const slotResult = await getNextAvailableQueueSlot();
      if (!slotResult.success || !slotResult.scheduledAt) {
        const msg = slotResult.error ?? (tCalendar.errorSaving || "Chyba při ukládání");
        setFormError(msg);
        toast.error(msg);
        return;
      }

      // Format the queued date/time for the success toast
      const queuedDate = new Date(slotResult.scheduledAt);
      const formattedDate = queuedDate.toLocaleString(
        locale === "en" ? "en-US" : locale === "uk" ? "uk-UA" : "cs-CZ",
        { dateStyle: "medium", timeStyle: "short" },
      );

      const mediaUrls = getMediaUrls();

      const result = await createPostAction({
        content: formContent.trim(),
        platforms: formPlatforms,
        scheduledAt: slotResult.scheduledAt,
        status: "scheduled",
        location: formLocation.trim() || undefined,
        tags: formTags.length > 0 ? formTags : undefined,
        tagIds: formSelectedTagIds,
        mediaUrls,
      });

      if (result.success) {
        toast.success(
          (tCalendar.queuedSuccess ?? "Příspěvek byl zařazen do fronty na __DATE__")
            .replace("__DATE__", formattedDate),
        );
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
      setQueuing(false);
    }
  }, [formContent, formPlatforms, formLocation, formTags, formSelectedTagIds, locale, tCalendar, handleCloseModal, getMediaUrls, hasUploading]);

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


  return (
    <div className="space-y-4">
      {/* Stats Cards */}
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

      {/* Desktop: two-column layout – MiniCalendar left (sticky), calendar right */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-4 lg:items-start">
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

        <div className="space-y-4 min-w-0">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={view === "month" ? previousMonth : view === "week" ? previousWeek : view === "day" ? previousDay : view === "year" ? previousYear : previousMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
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
            <h2 className="text-lg font-semibold tracking-tight truncate">
              {view === "year" ? year : view === "agenda" ? `${tCalendar.agenda ?? "Agenda"} – ${tCalendar.stats?.thisMonth ?? "This month"}` : `${monthLabel} ${year}`}
            </h2>
          </div>

          {/* #13 — Extracted View Components */}
          {view === "month" && (
            <MonthGridView
              days={days}
              currentDate={currentDate}
              weekdays={weekdays}
              locale={locale}
              getPostsForDayEffective={getPostsForDayEffective}
              getPostDisplayDate={getPostDisplayDate}
              formatTime={formatTime}
              postCardRefs={postCardRefs}
              handleDayClick={handleDayClick}
              handlePostClick={handlePostClick}
              handlePostHover={handlePostHover}
              handlePostLeave={handlePostLeave}
            />
          )}

          {view === "week" && (
            <WeekGridView
              days={days}
              weekdays={weekdays}
              locale={locale}
              getPostsForDayEffective={getPostsForDayEffective}
              getPostDisplayDate={getPostDisplayDate}
              formatTime={formatTime}
              postCardRefs={postCardRefs}
              handleDayClick={handleDayClick}
              handlePostClick={handlePostClick}
              handlePostHover={handlePostHover}
              handlePostLeave={handlePostLeave}
            />
          )}

          {view === "day" && (
            <DayTimelineView
              currentDate={currentDate}
              locale={locale}
              dayPosts={getPostsForDayEffective(currentDate)}
              getPostDisplayDate={getPostDisplayDate}
              formatTime={formatTime}
              handlePostClick={handlePostClick}
              currentTimeLabel={tCalendar.currentTime}
            />
          )}

          {view === "agenda" && (
            <AgendaListView
              agendaDays={desktopAgendaDays}
              locale={locale}
              noPostsLabel={tCalendar.noPostsInRange}
              getPostDisplayDate={getPostDisplayDate}
              formatTime={formatTime}
              handlePostClick={handlePostClick}
            />
          )}

          {view === "year" && (
            <YearMiniGrid
              yearMonths={yearMonths}
              weekdays={weekdays}
              months={months}
              effectiveFilteredPosts={effectiveFilteredPosts}
              getPostDisplayDate={getPostDisplayDate}
              postsByDay={postsByDay}
              onDayClick={(day) => { setCurrentDate(day); setView("month"); }}
            />
          )}
        </div>
      </div>

      {/* Mobile Agenda View (#7 — with view switcher: Month + Agenda) */}
      <MobileAgendaView
        currentDate={currentDate}
        months={months}
        weekdays={weekdays}
        mobileAgendaDays={mobileAgendaDays}
        locale={locale}
        getPostDisplayDate={getPostDisplayDate}
        formatTime={formatTime}
        handleDayClick={handleDayClick}
        handlePostClick={handlePostClick}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
        calendarDays={days}
        getPostsForDayEffective={getPostsForDayEffective}
        tMobileView={{
          month: tCalendar.month ?? "Month",
          agenda: tCalendar.agenda ?? "Agenda",
        }}
      />

      {/* New Post Modal */}
      <Dialog open={modalDay !== null} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg rounded-[20px] bg-white/90 dark:bg-card/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/10 p-0 md:max-w-lg" showCloseButton>
          <DialogHeader className="px-4 sm:px-6 pt-6">
            <DialogTitle className="text-lg font-semibold">
              {tCalendar.newPost || "Nový příspěvek"}
              {modalDay && (
                <span className="font-normal text-muted-foreground/60 text-sm ml-2">
                  – {format(modalDay, "d. MMMM yyyy", { locale: locale === "cs" ? cs : undefined })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 sm:px-6 space-y-4 max-h-[60vh] overflow-y-auto">
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
                  imageUrl={firstImageUrl}
                />
              </div>
              <Textarea
                id="modal-content"
                placeholder={tCalendar.contentPlaceholder || "Napište příspěvek..."}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="min-h-[120px] resize-y bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
              />
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

            {/* Media Upload (#9) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tCalendar.addMedia || "Média"}
              </Label>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) {
                    const tooLarge = files.some(f => f.size > 50 * 1024 * 1024);
                    if (tooLarge) {
                      toast.error(tCalendar.fileTooLarge || "Soubor je příliš velký (max. 50 MB).");
                      return;
                    }
                    addMediaFiles(files);
                  }
                  e.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMedia(false);
                  const files = Array.from(e.dataTransfer.files ?? []);
                  if (files.length > 0) {
                    const tooLarge = files.some(f => f.size > 50 * 1024 * 1024);
                    if (tooLarge) {
                      toast.error(tCalendar.fileTooLarge || "Soubor je příliš velký (max. 50 MB).");
                      return;
                    }
                    addMediaFiles(files);
                  }
                }}
                className={cn(
                  "group relative w-full rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]",
                  isDraggingMedia && "border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.05]">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground/80 truncate">
                      {tCalendar.addMedia || "Přidat média"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                      <Film className="h-3 w-3" />
                      <span>{mediaItems.length}/{MAX_MEDIA_FILES}</span>
                    </div>
                  </div>
                </div>
              </button>

              {mediaItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
                    >
                      {item.status === "optimizing" && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                        </div>
                      )}
                      {item.status === "uploading" && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                        </div>
                      )}
                      {item.status === "ready" && (
                        <div className="absolute left-1.5 top-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/80">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      {item.kind === "image" ? (
                        <NextImage
                          src={item.previewUrl}
                          alt="Media preview"
                          width={0}
                          height={0}
                          sizes="100vw"
                          style={{ width: "100%", height: "auto" }}
                          className="h-20 w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <video
                          src={item.previewUrl}
                          className="h-20 w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaItem(item.id)}
                        className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Internal organization tags */}
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
          <div className="flex flex-wrap gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-gray-200 dark:border-white/5">
            <Button
              type="button"
              onClick={() => handleFormSubmit("draft")}
              disabled={!formContent.trim() || formLoading || hasUploading()}
              variant="outline"
              className="rounded-xl border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            >
              {(formLoading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(formLoading || hasUploading()) ? (tCalendar.saving || "Ukládání...") : (tCalendar.saveDraft || "Koncept")}
            </Button>
            <Button
              type="button"
              onClick={handleQueueSubmit}
              disabled={!formContent.trim() || formLoading || queuing || hasUploading()}
              variant="outline"
              className="rounded-xl border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:hover:bg-cyan-500/10 transition-all"
            >
              {queuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-2 h-4 w-4" />}
              {queuing ? (tCalendar.queueLoading || "Výpočet času...") : (tCalendar.addToQueue || "Přidat do fronty")}
            </Button>
            <Button
              type="button"
              onClick={() => handleFormSubmit("scheduled")}
              disabled={!formContent.trim() || !formScheduledAt || formLoading || hasUploading()}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {(formLoading || hasUploading()) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
              {(formLoading || hasUploading()) ? (tCalendar.saving || "Ukládání...") : (tCalendar.schedule || "Naplánovat")}
            </Button>
            <Button
              type="button"
              onClick={() => handleFormSubmit("published")}
              disabled={!formContent.trim() || formPlatforms.length === 0 || formLoading || hasUploading()}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {(formLoading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(formLoading || hasUploading()) ? (tCalendar.saving || "Ukládání...") : (tCalendar.publishNow || "Publikovat")}
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

      {/* Preview Dialog */}
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

      {/* Hover Preview */}
      <HoverPreview
        hoveredPost={hoveredPost}
        hoverPosition={hoverPosition}
        getPostDisplayDate={getPostDisplayDate}
        locale={locale}
      />
    </div>
  );
}
