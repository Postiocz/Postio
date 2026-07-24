"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, MapPin, Loader2, Film, Image as ImageIcon, AlertTriangle, Info, Check, ExternalLink, Pencil, Lock, ListOrdered } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createPostAction, updatePost } from "@/lib/actions/posts";
import { publishPost, updateRemotePostAction, publishAdditionalPlatforms, updateOnPlatformAction } from "@/lib/actions/publish";
import { getNextAvailableQueueSlot } from "@/lib/actions/queue";
import {
  getTikTokCreatorInfoAction,
  type TikTokCreatorInfo,
  type TikTokPrivacyLevel,
} from "@/lib/actions/publish-tiktok";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS,
  isTikTokSandboxPrivateOnlyError,
  TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE,
} from "@/lib/tiktok-publish-errors";
import NextImage from "next/image";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";
import { PostPreview, type PostPreviewMedia, type PostPreviewProfile } from "@/components/post-preview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
const DEFAULT_TIKTOK_PRIVACY_LEVEL: TikTokPrivacyLevel = "PUBLIC_TO_EVERYONE";
const TIKTOK_SUPPORTED_PRIVACY_LEVELS: TikTokPrivacyLevel[] = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
];

/**
 * Platforms that support remote text editing of published posts.
 * Extend this array as new platforms are implemented in updateOnPlatformAction.
 *
 * - facebook: ✅ POST /{post_id}?message=...
 * - linkedin: ✅ (placeholder in backend, ready for implementation)
 * - youtube: ✅ (placeholder in backend, ready for implementation)
 *
 * NOT supported (do NOT add here):
 * - instagram: API does not allow caption edits
 * - twitter/x: API does not support edits (free tier write-only)
 * - tiktok: Full lock after publishing
 */
const SUPPORTED_UPDATE_PLATFORMS = ["facebook", "linkedin", "youtube"] as const;

function resolveLocalizedPublishError(params: {
  error?: string;
  errorCode?: string;
  t: (key: string) => string;
  /** Accounts namespace translations for platform-specific messages. */
  ta?: (key: string) => string;
}): string {
  const { error, errorCode, t, ta } = params;

  if (
    errorCode === TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE ||
    isTikTokSandboxPrivateOnlyError(error)
  ) {
    return (
      t("tiktokSandboxPrivateOnlyError") ??
      DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS
    );
  }

  // KROK 7: Localized X credits error.
  if (error && error.includes("Nemáš dostatek X kreditů") && ta) {
    return ta("xConnect.noCredits");
  }

  return error ?? t("errorSaving");
}

export type PostPlatform = {
  id: string;
  post_id: string;
  platform: string;
  account_id?: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export interface EditPostData {
  id?: string;
  content: string;
  platforms: string[];
  post_platforms?: PostPlatform[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  /** Internal organization tags attached via post_tags. */
  post_tags?: { id: string; name: string; color: string }[];
  media_urls: string[];
  published_platforms?: string[];
  external_ids?: Record<string, string> | null;
}

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: EditPostData | null;
  locale: string;
}

/** A connected social account loaded for the account-picker UI. */
type AccountInfo = {
  id: string;
  platform: string;
  account_name: string;
  avatar_url: string | null;
};

export function EditPostDialog({
  open,
  onOpenChange,
  post,
  locale,
}: EditPostDialogProps) {
  // #14 — Own i18n instead of props drilling (was 30+ tLabels + 9 tAi props)
  const t = useTranslations("posts");
  const ta = useTranslations("accounts");
  const isEdit = !!post?.id;
  const router = useRouter();
  const previewPlaceholderName = t("previewPlaceholderName") ?? "Postio";

  const [content, setContent] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountInfo[]>([]);
  // KROK 5 (Prompt 043-C): User credits for UI indicators.
  const [aiCredits, setAiCredits] = useState(0);
  const [twitterAutoCredits, setTwitterAutoCredits] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [isPublishingAdditional, setIsPublishingAdditional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // Prompt 003 – Post Detail view mode: 'preview' (social preview) or 'edit' (form)
  // Default to 'preview' for published posts, 'edit' for new posts.
  const [viewMode, setViewMode] = useState<"preview" | "edit">("edit");
  // Currently selected platform tab in preview mode (first published platform)
  const [selectedPreviewPlatform, setSelectedPreviewPlatform] = useState<string>("");

  const [userId, setUserId] = useState<string | null>(null);
  // Profiles used by the live post preview (FB page name/avatar, IG username/avatar,
  // YT channel name/thumbnail, LinkedIn profile name/avatar). Loaded once per
  // dialog open from the `users` + `social_accounts` tables.
  const [facebookProfile, setFacebookProfile] = useState<PostPreviewProfile | null>(null);
  const [instagramProfile, setInstagramProfile] = useState<PostPreviewProfile | null>(null);
  const [youtubeProfile, setYoutubeProfile] = useState<PostPreviewProfile | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<PostPreviewProfile | null>(null);
  const [tiktokProfile, setTiktokProfile] = useState<PostPreviewProfile | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (userId || !open) return;
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch {
        // silently ignore – user will be fetched when needed
      }
    };
    getUser();
  }, [open, supabase, userId]);

  // Load the user's profile + connected social accounts for the live preview.
  // Runs once we have a userId. We deliberately fetch BOTH the `users` row
  // (full_name + avatar_url fallback) and the `social_accounts` rows
  // (platform-specific display name + avatar). The social account takes
  // priority because it reflects the actual page/username/channel that will be
  // shown on the network; the `users` row is a graceful fallback.
  //
  // We pull FB / IG / YT / LinkedIn in a single round trip; we deliberately
  // do NOT pull Twitter/X or TikTok because those platforms don't have a
  // preview renderer yet. Add them here when their previews land.
  useEffect(() => {
    if (!userId || !open) return;
    let cancelled = false;
    const loadProfiles = async () => {
      try {
        const [userRes, accountsRes] = await Promise.all([
          supabase
            .from("users")
            .select("full_name, avatar_url")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("social_accounts")
            .select("platform, account_name, avatar_url")
            .eq("user_id", userId)
            .eq("is_active", true)
            .in("platform", ["facebook", "instagram", "youtube", "linkedin", "tiktok"]),
        ]);
        if (cancelled) return;
        const fallbackName = userRes.data?.full_name ?? previewPlaceholderName;
        const fallbackAvatar = userRes.data?.avatar_url ?? null;
        const fb = accountsRes.data?.find((a) => a.platform === "facebook");
        const ig = accountsRes.data?.find((a) => a.platform === "instagram");
        const yt = accountsRes.data?.find((a) => a.platform === "youtube");
        const li = accountsRes.data?.find((a) => a.platform === "linkedin");
        const tt = accountsRes.data?.find((a) => a.platform === "tiktok");
        setFacebookProfile({
          displayName: fb?.account_name ?? fallbackName,
          avatarUrl: fb?.avatar_url ?? fallbackAvatar,
        });
        setInstagramProfile({
          displayName: ig?.account_name ?? fallbackName,
          avatarUrl: ig?.avatar_url ?? fallbackAvatar,
        });
        setYoutubeProfile({
          displayName: yt?.account_name ?? fallbackName,
          avatarUrl: yt?.avatar_url ?? fallbackAvatar,
        });
        setLinkedinProfile({
          displayName: li?.account_name ?? fallbackName,
          avatarUrl: li?.avatar_url ?? fallbackAvatar,
        });
        setTiktokProfile({
          displayName: tt?.account_name ?? fallbackName,
          avatarUrl: tt?.avatar_url ?? fallbackAvatar,
        });
      } catch {
        // non-fatal – preview falls back to placeholder name
      }
    };
    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [open, previewPlaceholderName, supabase, userId]);

  // Load all connected accounts for the account-based platform picker (Krok 3).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = (await res.json()) as { accounts?: AccountInfo[]; credits?: { ai_credits: number; twitter_auto_credits: number } };
          if (!cancelled) {
            setAllAccounts(data.accounts ?? []);
            setAiCredits(data.credits?.ai_credits ?? 0);
            setTwitterAutoCredits(data.credits?.twitter_auto_credits ?? 0);
          }
        }
      } catch {
        // non-fatal – account picker shows empty state
      }
    };
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const uploadLabels = {
    tooManyFiles: t("maxFilesReached"),
    uploadSuccess: t("uploadSuccess"),
    uploadError: t("uploadError"),
    fileDeleted: t("fileDeleted") ?? "File deleted",
    invalidFileType: t("invalidFileType") ?? "Unsupported file format",
    // Default to a function (the hook expects a callable for unsupportedFormat
    // so it can pass the offending MIME type). Consumers that don't supply
    // their own get a generic English fallback.
    unsupportedFormat: (values: { type: string }) => t("unsupportedFormat", values) ?? `Format ${values.type} is not supported.`,
    videoTooLarge: t("videoTooLarge") ?? "Video is too large (max 50 MB). Please reduce its size.",
    videoLowResolution: t("videoLowResolution") ?? "Video has a low resolution (less than 640px). It may look blurry on social networks.",
    instagramVideoTooSmall:
      t("instagramVideoTooSmall") ?? "This video cannot be published on Instagram.",
    instagramVideoTooSmallHint:
      t("instagramVideoTooSmallHint") ??
      "Instagram does not support videos with low resolution (minimum 640 × 1138 px). Please regenerate the video at a higher resolution (recommended 1080 × 1920 px).",
    fileTooLargeImage: t("fileTooLargeImage") ?? "Image is too large (max 50 MB).",
    fileTooLargeVideo: t("fileTooLargeVideo") ?? "File is too large. Max limit for videos is 20MB.",
    optimizingImage: t("optimizingImage") ?? "File is too large (over 5 MB). Postio is now automatically optimizing it for social networks...",
    fileOptimized: t("fileOptimized") ?? "Image optimized",
    compressionError: t("compressionError") ?? "Could not optimize the image, uploading the original file.",
  };
  const {
    items: mediaItems,
    addFiles: addMediaFiles,
    removeItem: removeMediaItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
    getInstagramIncompatibleVideos,
    addImageUrl,
  } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

  // First uploaded image URL for AI Vision (only ready uploads have server-accessible URLs)
  const firstImageUrl = useMemo(() => {
    const firstImage = mediaItems.find((item) => item.kind === "image" && item.status === "ready" && item.url);
    return firstImage?.url ?? null;
  }, [mediaItems]);

  // Media items projected into the shape expected by PostPreview.
  // We include BOTH in-progress uploads (object URL preview) and ready
  // uploads (public URL) so the preview reflects the current state in
  // real time, even before the upload finishes.
  const previewMedia = useMemo<PostPreviewMedia[]>(
    () =>
      mediaItems
        .filter((i) => i.status !== "error")
        .map((i) => ({
          previewUrl: i.previewUrl,
          kind: i.kind,
        })),
    [mediaItems],
  );

  // Krok 3 – Derive platform IDs from selected accounts for backward
  // compatibility with code that expects platform-level info (preview,
  // media requirements, button disabling).
  const selectedPlatforms = useMemo(() => {
    const fromAccounts = selectedAccountIds
      .map((id) => allAccounts.find((a) => a.id === id)?.platform)
      .filter((p): p is string => !!p);
    // Also consider post.post_platforms rows (for initial load before accounts arrive)
    const fromPost = (post?.post_platforms ?? [])
      .filter((pp) => selectedAccountIds.includes(pp.account_id ?? ""))
      .map((pp) => pp.platform);
    return [...new Set([...fromAccounts, ...fromPost])];
  }, [selectedAccountIds, allAccounts, post?.post_platforms]);

  // Prompt 023 (Krok 1) – Media presence flags that gate platform selection.
  // TikTok/YouTube require a video; Instagram requires any media. Derived
  // once from `mediaItems`, excluding failed uploads so an erroring file
  // does not satisfy a requirement.
  const hasVideoAttachment = useMemo(
    () => mediaItems.some((i) => i.kind === "video" && i.status !== "error"),
    [mediaItems],
  );
  const hasAnyMediaAttachment = useMemo(
    () => mediaItems.some((i) => i.status !== "error"),
    [mediaItems],
  );

  // Prompt 023 (Krok 1) – Whether the current media satisfies a platform's
  // attachment requirement. facebook/twitter/linkedin accept anything.
  function isPlatformMediaRequirementMet(platformId: string): boolean {
    if (platformId === "tiktok" || platformId === "youtube") {
      return hasVideoAttachment;
    }
    if (platformId === "instagram") {
      return hasAnyMediaAttachment;
    }
    return true;
  }

  // Prompt 023 (Krok 4) – When the user removes a media item, deselect any
  // platform whose attachment requirement is no longer met (e.g. removing the
  // only video while TikTok/YouTube is selected). We only ever REMOVE platforms
  // here, never re-add them: if a platform regains its requirement (user
  // re-adds media) it stays deselected until chosen again. Computed against the
  // post-removal media set so the selection updates in the same tick as removal.
  const handleRemoveMedia = (id: string) => {
    const nextMedia = mediaItems.filter((i) => i.id !== id);
    const nextHasVideo = nextMedia.some((i) => i.kind === "video" && i.status !== "error");
    const nextHasAnyMedia = nextMedia.some((i) => i.status !== "error");
    removeMediaItem(id);
    setSelectedAccountIds((prev) =>
      prev.filter((accountId) => {
        const account = allAccounts.find((a) => a.id === accountId);
        if (!account) return true;
        if (account.platform === "tiktok" || account.platform === "youtube") return nextHasVideo;
        if (account.platform === "instagram") return nextHasAnyMedia;
        return true;
      }),
    );
  };

  // Prompt 023 (Krok 2) – Tooltip text explaining why a platform chip is
  // disabled (its attachment requirement is not met by the current media).
  // Returns null for platforms that are always enabled.
  function getPlatformRequirementTooltip(platformId: string): string | null {
    if (platformId === "tiktok") return t("tiktokRequiresVideo") ?? "TikTok vyžaduje video soubor";
    if (platformId === "youtube") return t("youtubeRequiresVideo") ?? "YouTube vyžaduje video soubor";
    if (platformId === "instagram") return t("instagramRequiresMedia") ?? "Instagram vyžaduje fotku nebo video";
    return null;
  }

  // Labels for PostPreview with safe fallbacks so the dialog works even
  // when a consumer didn't wire up the new optional translation keys.
  const previewLabels = useMemo(
    () => ({
      previewTitle: t("previewTitle") ?? "Náhled",
      facebookTab: t("previewFacebookTab") ?? "Facebook",
      instagramTab: t("previewInstagramTab") ?? "Instagram",
      youtubeTab: t("previewYoutubeTab") ?? "YouTube",
      linkedinTab: t("previewLinkedinTab") ?? "LinkedIn",
      tiktokTab: t("previewTikTokTab") ?? "TikTok",
      noMedia: t("previewNoMedia") ?? "Žádná média",
      tiktokVideoRequired: t("tiktokVideoRequired") ?? "TikTok vyžaduje video",
      placeholderName: t("previewPlaceholderName") ?? "Postio",
      captionHint: t("previewCaptionHint") ?? "Sem napište text příspěvku…",
    }),
    [t],
  );

  // Decide which preview tabs should be visible. A tab is shown only when
  // the post actually targets that platform – we union three sources so the
  // preview stays accurate across all editor states:
  //  1. `selectedPlatforms` – derived form state (from selected accounts)
  //  2. `post.platforms` – platforms persisted on the post row
  //  3. `post.post_platforms` – platform rows already created (incl. published)
  // The list is then mapped to the subset of platforms that PostPreview
  // knows how to render today (FB / IG / YT / LinkedIn / TikTok). Other platforms are
  // deliberately filtered out until their previews are implemented.
  const availablePreviewPlatforms = useMemo<
    Array<"facebook" | "instagram" | "youtube" | "linkedin" | "tiktok">
  >(() => {
    const all = new Set<string>([
      ...selectedPlatforms,
      ...(post?.platforms ?? []),
      ...(post?.post_platforms ?? []).map((p) => p.platform),
    ]);
    const order: Array<"facebook" | "instagram" | "youtube" | "linkedin" | "tiktok"> = [
      "facebook",
      "instagram",
      "youtube",
      "linkedin",
      "tiktok",
    ];
    return order.filter((id) => all.has(id));
  }, [selectedPlatforms, post?.platforms, post?.post_platforms]);

  // Prompt 003 – Published platforms for preview tabs (only platforms with status 'published')
  const publishedPlatforms = !isEdit || !post?.post_platforms
    ? []
    : post.post_platforms
        .filter((p) => p.status === "published")
        .map((p) => p.platform);

  // Prompt 003 – Build a live URL for a published post on a given platform
  function buildLiveUrl(platform: string, externalId: string | null): string | null {
    if (!externalId) return null;
    switch (platform) {
      case "facebook":
        return `https://www.facebook.com/${externalId}`;
      case "instagram":
        return `https://www.instagram.com/p/${externalId}/`;
      case "linkedin":
        // external_id can be a full URN or just the post ID
        if (externalId.startsWith("urn:li:share:")) {
          // We need the author to build the URL – use a generic LinkedIn share link
          return `https://www.linkedin.com/feed/update/${externalId}/`;
        }
        return `https://www.linkedin.com/feed/update/urn:li:share:${externalId}/`;
      case "youtube":
        return `https://www.youtube.com/watch?v=${externalId}`;
      case "twitter":
      case "x":
        return `https://x.com/i/status/${externalId}`;
      case "tiktok":
        return /^\d+$/.test(externalId)
          ? `https://www.tiktok.com/@user/video/${externalId}`
          : null;
      default:
        return null;
    }
  }

  // Prompt 003 – Get the external_id for the currently selected preview platform
  function getLiveUrlForPlatform(platform: string): string | null {
    if (!post?.post_platforms) return null;
    const pp = post.post_platforms.find(
      (p) => p.platform === platform && p.status === "published"
    );
    return buildLiveUrl(platform, pp?.external_id ?? null);
  }

  // Detect if the published post is on Instagram
  const isInstagramPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'instagram' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);

  // Detect if the published post is on Twitter (X) – edits are not supported
  const isTwitterPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'twitter' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);

  // Detect if the published post is on TikTok – edits are not supported
  const isTikTokPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'tiktok' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);

  // Detect which published platforms support remote text editing
  const updatablePlatforms = useMemo(() => {
    if (!isEdit) return [];
    return (post?.post_platforms || [])
      .filter(p => p.status === 'published' && (SUPPORTED_UPDATE_PLATFORMS as unknown as string[]).includes(p.platform))
      .map(p => p.platform);
  }, [isEdit, post?.post_platforms]);

  // Per-platform loading state for update buttons
  const [updatingPlatforms, setUpdatingPlatforms] = useState<Record<string, boolean>>({});
  const [tiktokCreatorInfo, setTikTokCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokCreatorInfoLoading, setTikTokCreatorInfoLoading] = useState(false);
  const [tiktokPrivacyLevel, setTikTokPrivacyLevel] =
    useState<TikTokPrivacyLevel>(DEFAULT_TIKTOK_PRIVACY_LEVEL);

  // Detect if any platform update is in progress
  const isUpdating = Object.values(updatingPlatforms).some(v => v);

  // Detect if any platform is published
  const isAnyPublished = useMemo(() => {
    return (post?.post_platforms || []).some(p => p.status === 'published');
  }, [post?.post_platforms]);

  // Detect if media was changed for published posts
  const mediaChanged = useMemo(() => {
    if (!isEdit || !isAnyPublished) return false;
    const originalMedia = post?.media_urls ?? [];
    const currentMedia = getMediaUrls();
    return (
      originalMedia.length !== currentMedia.length ||
      originalMedia.some((url, i) => url !== currentMedia[i])
    );
  }, [getMediaUrls, isAnyPublished, isEdit, post?.media_urls]);

  const hasTikTokIntent = useMemo(() => {
    const all = new Set<string>([
      ...selectedPlatforms,
      ...(post?.platforms ?? []),
      ...(post?.post_platforms ?? []).map((row) => row.platform),
    ]);
    return all.has("tiktok");
  }, [selectedPlatforms, post?.platforms, post?.post_platforms]);

  const allowedTikTokPrivacyLevels = useMemo(() => {
    const options = tiktokCreatorInfo?.privacyLevelOptions?.filter((level) =>
      TIKTOK_SUPPORTED_PRIVACY_LEVELS.includes(level),
    );
    return options && options.length > 0 ? options : TIKTOK_SUPPORTED_PRIVACY_LEVELS;
  }, [tiktokCreatorInfo]);

  const isTikTokPrivateOnly = useMemo(
    () =>
      allowedTikTokPrivacyLevels.length === 1 &&
      allowedTikTokPrivacyLevels[0] === "SELF_ONLY",
    [allowedTikTokPrivacyLevels],
  );

  const platformMetadata = useMemo<Record<string, Record<string, unknown>> | undefined>(() => {
    if (!hasTikTokIntent) return undefined;
    return {
      tiktok: {
        privacy_level: tiktokPrivacyLevel,
      },
    };
  }, [hasTikTokIntent, tiktokPrivacyLevel]);

  // Determine which selected platforms are not yet published
  const unpublishedSelectedPlatforms = useMemo(() => {
    const published = (post?.post_platforms || []).filter(p => p.status === 'published').map(p => p.platform);

    // Zahrneme všechny vybrané sítě z post.platforms i ze stavu formuláře (selectedPlatforms)
    const allIntended = post?.platforms || [];
    const fromPostPlatforms = (post?.post_platforms || []).map(p => p.platform);

    // Vytvoříme unikátní seznam všech zamýšlených platforem
    const allPlatforms = Array.from(new Set([...allIntended, ...fromPostPlatforms, ...selectedPlatforms]));

    // Vrátíme ty, které ještě nebyly publikovány
    return allPlatforms.filter(p => !published.includes(p));
  }, [selectedPlatforms, post?.platforms, post?.post_platforms]);

  // If any platform is intended but not published → show "Publish to selected" button
  const canPublishAdditional = unpublishedSelectedPlatforms.length > 0;

  // Detect if content text was changed from the original post
  const isContentChanged = isEdit && post && content.trim() !== post.content?.trim();

  // Detect changes in internal-only metadata (never sent to social networks).
  // Shown as an explicit "Uložit interní metadata" button in the published-post UI.
  const hasMetadataChanges = useMemo(() => {
    if (!isEdit || !post) return false;
    const originalTagIds = (post.post_tags ?? []).map((t) => t.id).sort().join(",");
    const currentTagIds = [...selectedTagIds].sort().join(",");
    const originalLocation = (post.location ?? "").trim();
    const currentLocation = location.trim();
    const originalTags = [...(post.tags ?? [])].sort().join(",");
    const currentTags = [...tags].sort().join(",");
    // #18b — Detect platform changes: compare form state + published platforms vs original
    const originalPlatforms = (post.platforms ?? []).sort().join(",");
    const publishedPlatforms = (post.post_platforms ?? [])
      .filter((p) => p.status === "published")
      .map((p) => p.platform)
      .sort();
    // Current intended platforms = form selection union published (locked) platforms
    const currentPlatforms = [...new Set([...selectedPlatforms, ...publishedPlatforms])].sort().join(",");
    return (
      originalTagIds !== currentTagIds ||
      originalLocation !== currentLocation ||
      originalTags !== currentTags ||
      originalPlatforms !== currentPlatforms
    );
  }, [isEdit, post, selectedTagIds, location, tags, selectedPlatforms]);

  // ---------------------------------------------------------------------
  // Instagram hard-block: if the post is destined for Instagram AND it has
  // at least one video whose shorter side is below the platform minimum
  // (< 640 px), we surface a banner and disable Publish / Schedule buttons.
  //
  // Phrased as a platform limitation (Instagram nepodporuje…), not an
  // app limitation – the user must regenerate the file, we cannot help.
  // ---------------------------------------------------------------------
  const instagramIncompatibleVideos = useMemo(() => {
    if (!selectedPlatforms.includes("instagram")) return [];
    return getInstagramIncompatibleVideos();
  }, [selectedPlatforms, getInstagramIncompatibleVideos]);

  const isInstagramVideoIncompatible = instagramIncompatibleVideos.length > 0;

  const getInitialTikTokPrivacyLevel = useCallback(
    (sourcePost: EditPostData | null): TikTokPrivacyLevel => {
      const rawValue = sourcePost?.post_platforms
        ?.find((platformRow) => platformRow.platform === "tiktok")
        ?.metadata?.privacy_level;

      if (
        rawValue === "PUBLIC_TO_EVERYONE" ||
        rawValue === "MUTUAL_FOLLOW_FRIENDS" ||
        rawValue === "SELF_ONLY"
      ) {
        return rawValue;
      }

      return DEFAULT_TIKTOK_PRIVACY_LEVEL;
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      if (isEdit && post) {
        setContent(post.content);
        // Initialize account selection from post_platforms, excluding published/archived ones
        const publishedAccountIds = (post.post_platforms || []).filter(p => p.status === 'published').map(p => p.account_id ?? "");
        const archivedAccountIds = (post.post_platforms || []).filter(p => p.status === 'archived').map(p => p.account_id ?? "");
        const lockedAccountIds = [...publishedAccountIds, ...archivedAccountIds];
        const allAccountIds = (post.post_platforms || []).map(p => p.account_id ?? "").filter(Boolean);
        // Pre-select non-published/non-archived accounts; published/archived ones are locked in the UI
        setSelectedAccountIds(allAccountIds.filter(id => !lockedAccountIds.includes(id)));
        setStatus(post.status);
        setLocation(post.location ?? "");
        setTags(post.tags ?? []);
        setScheduledAt(post.scheduled_at ?? "");
        if (post.media_urls && post.media_urls.length > 0) {
          loadExistingUrls(post.media_urls);
        }
        // Hydrate selected internal organization tags from post_tags (passed in via props)
        const initialTagIds = (post.post_tags ?? []).map((t) => t.id);
        setSelectedTagIds(initialTagIds);
        setTikTokPrivacyLevel(getInitialTikTokPrivacyLevel(post));

        // Always open in 'edit' mode when clicking the pencil/edit icon.
        // Preview mode is still accessible via the preview tab in edit mode.
        setViewMode("edit");
      } else {
        setContent("");
        setSelectedAccountIds([]);
        setStatus("draft");
        setLocation("");
        setTags([]);
        setScheduledAt("");
        setSelectedTagIds([]);
        setTikTokPrivacyLevel(DEFAULT_TIKTOK_PRIVACY_LEVEL);
        setViewMode("edit");
        setSelectedPreviewPlatform("");
      }
      setTagDraft("");
      setError(null);
    });
  }, [getInitialTikTokPrivacyLevel, isEdit, loadExistingUrls, open, post]);

  useEffect(() => {
    if (!open || !hasTikTokIntent) return;

    let cancelled = false;
    const loadTikTokCreatorInfo = async () => {
      setTikTokCreatorInfoLoading(true);

      try {
        const result = await getTikTokCreatorInfoAction();
        if (cancelled) return;

        if (!result.success) {
          setTikTokCreatorInfo(null);
          return;
        }

        setTikTokCreatorInfo(result.data);
        setTikTokPrivacyLevel((current) => {
          if (result.data.privacyLevelOptions.includes(current)) {
            return current;
          }

          return (
            TIKTOK_SUPPORTED_PRIVACY_LEVELS.find((level) =>
              result.data.privacyLevelOptions.includes(level),
            ) ?? DEFAULT_TIKTOK_PRIVACY_LEVEL
          );
        });
      } catch {
        if (!cancelled) {
          setTikTokCreatorInfo(null);
        }
      } finally {
        if (!cancelled) {
          setTikTokCreatorInfoLoading(false);
        }
      }
    };

    void loadTikTokCreatorInfo();

    return () => {
      cancelled = true;
    };
  }, [hasTikTokIntent, open]);

  const toggleAccount = useCallback((id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    );
  }, []);

  const commitTag = useCallback((raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
    const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
    if (!normalized) return;
    const tag = `#${normalized}`;
    setTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      return exists ? prev : [...prev, tag];
    });
    setTagDraft("");
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleCommitRemainingTag = useCallback(() => {
    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t) => t.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");
    return finalTags;
  }, [tags, tagDraft]);

  const normalizeScheduledAt = useCallback((value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }, []);

  const handleSubmit = useCallback(
    async (newStatus: "draft" | "scheduled") => {
      if (!content.trim()) return;
      if (hasUploading()) {
        toast.info(t("uploading"));
        return;
      }
      // -------------------------------------------------------------------
      // Instagram video-resolution hard-block. Applies only to "scheduled"
      // (and to "draft" too – we silently allow the draft to be saved
      // without media, but if the user picked Instagram AND attached an
      // incompatible video, even saving a draft is meaningless because it
      // can never be published).
      // -------------------------------------------------------------------
      if (isInstagramVideoIncompatible && selectedPlatforms.includes("instagram") && newStatus === "scheduled") {
        const msg =
          t("instagramVideoTooSmall") ??
          "Toto video nelze na Instagramu publikovat.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setLoading(true);
      setError(null);
      const finalTags = handleCommitRemainingTag();
      const mediaUrls = getMediaUrls();
      const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);

      try {
        let result;

        // Remote Edit: if editing a published post, sync text changes to social network
        if (isEdit && post?.id && isAnyPublished) {
          // Instagram does not support editing captions of published posts
          if (isInstagramPublished) {
            const msg = t("igEditNotSupported") ?? "Instagram neumožňuje úpravu textu u již zveřejněných příspěvků. Pokud chcete text změnit, musíte příspěvek v Postio smazat a publikovat znovu.";
            setError(msg);
            toast.error(msg);
            setLoading(false);
            return;
          }
          // Twitter (X) does not support editing tweets via API
          if (isTwitterPublished) {
            const msg = t("twEditNotSupported") ?? "X (Twitter) nepodporuje editaci příspěvků přes API. Pokud chcete text změnit, musíte příspěvek smazat a publikovat znovu.";
            setError(msg);
            toast.error(msg);
            setLoading(false);
            return;
          }
          // Check if media was changed — photo/video changes are not allowed for published posts
          const originalMedia = post.media_urls ?? [];
          const currentMedia = mediaUrls;
          const mediaChanged =
            originalMedia.length !== currentMedia.length ||
            originalMedia.some((url, i) => url !== currentMedia[i]);

          if (mediaChanged) {
            toast.error(t("photoChangeNotAllowed") ?? "Změna fotky u publikovaného postu není možná. Pro změnu fotky musíte příspěvek publikovat znovu.");
            setLoading(false);
            return;
          }

          result = await updateRemotePostAction({
            postId: post.id,
            newContent: content.trim(),
          });

          if (result.success) {
            toast.success(t("remoteEditSuccess") ?? "Text byl upraven v Postio i na sociální síti.");
            onOpenChange(false);
            router.refresh();
            return;
          }

          setError(result.error ?? t("errorSaving"));
          toast.error(result.error ?? t("errorSaving"));
          setLoading(false);
          return;
        }

        if (isEdit && post?.id) {
          result = await updatePost(post.id, {
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: normalizedScheduledAt,
            status: newStatus,
            location: location.trim() || "",
            tags: finalTags,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          });
        } else {
          result = await createPostAction({
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: normalizedScheduledAt,
            status: newStatus,
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          });
        }

        if (result.success) {
          toast.success(isEdit ? t("postUpdated") : t("postCreated"));
          await router.refresh();
          onOpenChange(false);
        } else {
          setError(result.error ?? t("errorSaving"));
          toast.error(result.error ?? t("errorSaving"));
        }
      } catch {
        setError(t("errorSaving"));
        toast.error(t("errorSaving"));
      } finally {
        setLoading(false);
      }
    },
    [
      content,
      getMediaUrls,
      handleCommitRemainingTag,
      hasUploading,
      isAnyPublished,
      isEdit,
      isInstagramPublished,
      isInstagramVideoIncompatible,
      isTwitterPublished,
      location,
      normalizeScheduledAt,
      onOpenChange,
      platformMetadata,
      selectedAccountIds,
      selectedPlatforms,
      post,
      router,
      scheduledAt,
      selectedTagIds,
      t,
    ]
  );

  /**
   * Save only the internal-only metadata of a published post (location, inline hashtags,
   * internal organization tags via post_tags, platforms). Does NOT touch the published content
   * on social networks. Safe to call repeatedly – updatePost never modifies
   * published_platforms, published_at, external_ids or status.
   *
   * #18b — Platforms are included: new platforms get added as `draft` rows in
   * `post_platforms`. Published platforms cannot be removed (they are locked
   * in the UI and excluded from the toggle state). updatePost handles the
   * diff internally (adds new, skips published/publishing for removal).
   */
  const handleSaveMetadata = useCallback(async () => {
    if (!isEdit || !post?.id) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // #18b — Include account selection in metadata save.
      // selectedAccountIds contains only non-published/non-archived accounts
      // (published/archived ones are filtered out on dialog open). Union with
      // published and archived accounts from post_platforms for the full list.
      const publishedAccountIds = (post.post_platforms ?? [])
        .filter((p) => p.status === "published")
        .map((p) => p.account_id ?? "")
        .filter(Boolean);
      const archivedAccountIds = (post.post_platforms ?? [])
        .filter((p) => p.status === "archived")
        .map((p) => p.account_id ?? "")
        .filter(Boolean);
      const allAccountIds = [...new Set([...selectedAccountIds, ...publishedAccountIds, ...archivedAccountIds])];

      const result = await updatePost(post.id, {
        accountIds: allAccountIds,
        location: location.trim() || "",
        tags,
        tagIds: selectedTagIds,
        platformMetadata,
      });
      if (result.success) {
        toast.success(t("metadataSaved") ?? "Interní metadata byla uložena.");
        await router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error ?? t("errorSaving"));
        toast.error(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setLoading(false);
    }
  }, [hasUploading, isEdit, location, onOpenChange, platformMetadata, selectedAccountIds, post, router, selectedTagIds, t, tags]);

  /**
   * Per-platform update handler – calls updateOnPlatformAction for a specific platform.
   * Shows loading state per button and toast on success.
   */
  const handleUpdatePlatform = async (targetPlatform: string) => {
    if (!content.trim() || !isEdit || !post?.id) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    if (mediaChanged) {
      toast.error(t("onlyTextUpdatePossible") ?? "U publikovaného postu lze měnit pouze text.");
      return;
    }

    const platformLabel = PLATFORMS.find((p) => p.id === targetPlatform)?.label ?? targetPlatform;
    setUpdatingPlatforms((prev) => ({ ...prev, [targetPlatform]: true }));
    setError(null);

    try {
      const result = await updateOnPlatformAction({
        postId: post.id,
        platform: targetPlatform,
        newContent: content.trim(),
      });

      if (result.success) {
        toast.success(`Text na ${platformLabel} byl úspěšně upraven.`);
        await router.refresh();
        onOpenChange(false);
        return;
      }

      const localizedError = resolveLocalizedPublishError({
        error: result.error,
        errorCode: result.errorCode,
        t,
        ta,
      });
      setError(localizedError);
      toast.error(localizedError);
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, [targetPlatform]: false }));
    }
  };

  const handlePublishAdditional = async (targetPlatform: string) => {
    if (!isEdit || !post?.id) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block.
    //
    // The user is about to (re-)publish an existing post to a new
    // platform. If that platform is Instagram AND the post contains a
    // video that we already know is below 640 px on its shorter side,
    // we refuse the call here. Without this guard the request would
    // reach `publishAdditionalPlatforms` and the Meta container would
    // just fail with error_subcode 2207082 after ~30 s of polling –
    // a confusing experience for the user.
    // -------------------------------------------------------------------
    if (targetPlatform === "instagram" && isInstagramVideoIncompatible) {
      const msg =
        t("instagramVideoTooSmall") ??
        "Toto video nelze na Instagramu publikovat.";
      // NOTE: we intentionally do NOT call `setError(msg)` here – that would
      // show a red error banner at the top of the dialog (in the scrollable
      // area), which would compete with the dedicated Instagram resolution
      // banner that already lives next to the action buttons. A single
      // unified banner + a toast is enough feedback.
      toast.error(msg);
      return;
    }

    setIsPublishingAdditional(true);
    setError(null);

    try {
      const result = await publishAdditionalPlatforms({
        postId: post.id,
        platform: targetPlatform,
        platformMetadata: targetPlatform === "tiktok" ? platformMetadata?.tiktok ?? null : null,
      });

      if (result.success) {
        console.log("handlePublishAdditional: úspěšně publikováno na", targetPlatform);
        toast.success(t("additionalPublishSuccess") ?? `Příspěvek byl publikován na ${targetPlatform}!`);
        if (result.data?.warningCode === "tiktok_private_only") {
          toast.info(t("tiktokPrivateOnlyNotice"));
        }
        await router.refresh();
        onOpenChange(false);
        return;
      }

      setError(result.error ?? t("errorSaving"));
      toast.error(result.error ?? t("errorSaving"));
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setIsPublishingAdditional(false);
    }
  };

  const handlePublishNow = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block. If the post is destined for
    // Instagram but contains a video whose shorter side is below 640 px,
    // we refuse to even attempt publishing – Meta's API would just fail
    // with error_subcode 2207082 and the user would see a cryptic error.
    // -------------------------------------------------------------------
    if (isInstagramVideoIncompatible) {
      const msg =
        t("instagramVideoTooSmall") ??
        "Toto video nelze na Instagramu publikovat.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setPublishing(true);
    setError(null);

    const finalTags = handleCommitRemainingTag();
    const mediaUrls = getMediaUrls();

    try {
        let postId: string | undefined;

        // EDIT FLOW: Save content/media changes to DB before publishing.
        // updatePost strips published_platforms internally – it NEVER touches publish state.
        if (isEdit && post?.id) {
          const saveResult = await updatePost(post.id, {
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: null,
            location: location.trim() || "",
            tags: finalTags,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          });

          if (!saveResult.success) {
            const msg = saveResult.error ?? t("errorSaving");
            setError(msg);
            toast.error(msg);
            return;
          }
          postId = post.id;
        } else {
          // NEW POST FLOW: Create draft, then publish.
          const createResult = await createPostAction({
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: null,
            status: "draft",
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          });

          if (!createResult.success || !createResult.data?.id) {
            const msg = createResult.error ?? t("errorSaving");
            setError(msg);
            toast.error(msg);
            return;
          }
          postId = createResult.data.id as string;
        }

        // PUBLISH FLOW: publishPost calls handlePublishSuccess which uses RPC append_published_platform.
        // This is the ONLY place where published_platforms gets modified.
        const publishResult = await publishPost({ postId });

      if (publishResult.success) {
        console.log("handlePublishNow: úspěšně publikováno, publishResult:", publishResult);
        toast.success("Příspěvek byl úspěšně publikován!");
        if (publishResult.data?.warningCode === "tiktok_private_only") {
          toast.info(t("tiktokPrivateOnlyNotice"));
        }
        await router.refresh();
        onOpenChange(false);
        return;
      }

      const msg = resolveLocalizedPublishError({
        error: publishResult.error,
        errorCode: publishResult.errorCode,
        t,
      });
      setError(msg);
      toast.error(msg);
    } catch {
      setError("Publikování selhalo.");
      toast.error("Publikování selhalo.");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /**
   * Queue a post to the next available slot from the user's posting schedule.
   * Calls getNextAvailableQueueSlot server action, then submits as "scheduled".
   */
  const handleQueueToSchedule = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    if (isInstagramVideoIncompatible) {
      const msg =
        t("instagramVideoTooSmall") ??
        "Toto video nelze na Instagramu publikovat.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setQueuing(true);
    setError(null);

    try {
      const slotResult = await getNextAvailableQueueSlot();
      if (!slotResult.success || !slotResult.scheduledAt) {
        const msg = slotResult.error ?? t("errorSaving");
        setError(msg);
        toast.error(msg);
        return;
      }

      // Format the queued date/time for the success toast
      const queuedDate = new Date(slotResult.scheduledAt);
      const formattedDate = queuedDate.toLocaleString(
        locale === "en" ? "en-US" : locale === "uk" ? "uk-UA" : "cs-CZ",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      );

      // Now submit as scheduled with the computed time
      const finalTags = handleCommitRemainingTag();
      const mediaUrls = getMediaUrls();

      const result = isEdit && post?.id
        ? await updatePost(post.id, {
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: slotResult.scheduledAt,
            status: "scheduled",
            location: location.trim() || "",
            tags: finalTags,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          })
        : await createPostAction({
            content: content.trim(),
            accountIds: selectedAccountIds,
            scheduledAt: slotResult.scheduledAt,
            status: "scheduled",
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            tagIds: selectedTagIds,
            platformMetadata,
            mediaUrls,
          });

      if (result.success) {
        toast.success(t("queuedSuccess", { date: formattedDate }) ?? `Příspěvek byl zařazen do fronty na ${formattedDate}`);
        await router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error ?? t("errorSaving"));
        toast.error(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setQueuing(false);
    }
  };

  // Prompt 003 – Platform accent colors for tab icons
  const PLATFORM_ACCENTS_MAP: Record<string, string> = {
    facebook: "text-[#1877F2]",
    instagram: "text-[#E1306C]",
    twitter: "text-[#1DA1F2]",
    linkedin: "text-[#0A66C2]",
    youtube: "text-[#FF0000]",
    tiktok: "text-[#010101]",
  };

  // Prompt 003 – Inline avatar with graceful fallback to initial-letter bubble.
  // Lightweight version of the Avatar from post-preview.tsx, scoped to the
  // preview mode so we don't need to import the full PostPreview module.
  function AvatarInline({
    url,
    name,
    size = 40,
  }: {
    url: string | null;
    name: string;
    size?: number;
  }) {
    const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white"
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  // Prompt 003 – Media area renderer for platform previews.
  // Picks <img> or <video> based on kind. Shows an empty placeholder
  // when no media is attached.
  function PreviewMediaArea({
    media,
    aspect,
  }: {
    media: PostPreviewMedia[];
    aspect: "square" | "feed" | "video";
  }) {
    if (media.length === 0) {
      const emptyAspect = aspect === "video" ? "aspect-video" : "aspect-square";
      return (
        <div
          className={cn(
            "flex w-full items-center justify-center bg-white/[0.02] text-xs text-muted-foreground/50",
            emptyAspect,
          )}
        >
          {t("previewNoMedia") ?? "Žádná média"}
        </div>
      );
    }
    const first = media[0];
    // Prompt 013 – object-contain + no forced aspect ratio so the full
    // composition is always visible. The container height follows the
    // natural aspect ratio of the uploaded file.
    return (
      <div className="relative w-full overflow-hidden bg-black">
        {first.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={first.previewUrl}
            alt="Preview"
            className="w-full h-auto object-contain"
          />
        ) : (
          <video
            src={first.previewUrl}
            className="w-full h-auto object-contain"
            muted
            playsInline
            preload="metadata"
          />
        )}
        {media.length > 1 && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            1/{media.length}
          </span>
        )}
      </div>
    );
  }

  // Prompt 003 – Render a faithful platform preview for the post detail view.
  // Uses the same profile/media data as the existing PostPreview component,
  // but renders only the selected platform's feed card (no outer glass shell).
  function renderPlatformPreview(platformId: string) {
    const profileMap = {
      facebook: facebookProfile,
      instagram: instagramProfile,
      youtube: youtubeProfile,
      linkedin: linkedinProfile,
      tiktok: tiktokProfile,
    };
    const profile = profileMap[platformId as keyof typeof profileMap]
      ?? { displayName: t("previewPlaceholderName") ?? "Postio" };

    if (platformId === "facebook") {
      return (
        <div className="flex h-full flex-col bg-[#242526] text-[#e4e6eb]">
          <div className="flex-1 overflow-y-auto px-3 pb-3 postio-scrollbar">
            <article className="rounded-lg bg-[#18191a] p-2.5">
              <header className="mb-1.5 flex items-center gap-2">
                <AvatarInline url={profile?.avatarUrl ?? null} name={profile?.displayName ?? ""} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#e4e6eb]">{profile?.displayName ?? ""}</p>
                  <p className="flex items-center gap-1 text-[10px] text-[#b0b3b8]">
                    {location ? <span>{location} · </span> : null}
                    <span>Právě teď</span>
                    <span aria-hidden> · 🌐</span>
                  </p>
                </div>
              </header>
              {content.trim() ? (
                <p className="mb-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#e4e6eb]">{content}</p>
              ) : (
                <p className="mb-1.5 text-[13px] italic text-[#b0b3b8]/60">
                  {t("previewCaptionHint") ?? "Sem napište text příspěvku…"}
                </p>
              )}
              <PreviewMediaArea media={previewMedia} aspect="feed" />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#b0b3b8]">
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-1">
                    <span className="inline-block rounded-full bg-[#1877F2] h-4 w-4 flex items-center justify-center text-[8px] text-white">👍</span>
                    <span className="inline-block rounded-full bg-[#F33E58] h-4 w-4 flex items-center justify-center text-[8px]">❤️</span>
                  </span>
                  0
                </span>
                <span>0 komentářů · 0 sdílení</span>
              </div>
              <div className="my-1.5 border-t border-white/5" />
              <div className="grid grid-cols-3 gap-1 text-[11px] font-medium text-[#b0b3b8]">
                <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-base">👍</span>
                  Líbí se mi
                </span>
                <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-base">💬</span>
                  Komentář
                </span>
                <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-base">↗</span>
                  Sdílet
                </span>
              </div>
            </article>
          </div>
        </div>
      );
    }

    if (platformId === "instagram") {
      return (
        <div className="flex h-full flex-col bg-black text-white">
          <article className="flex-1 overflow-y-auto postio-scrollbar">
            <header className="flex items-center gap-2 px-3 py-2">
              <div className="rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
                <div className="rounded-full bg-black p-[2px]">
                  <AvatarInline url={profile?.avatarUrl ?? null} name={profile?.displayName ?? ""} size={28} />
                </div>
              </div>
              <p className="truncate text-[13px] font-semibold">{profile?.displayName ?? ""}</p>
            </header>
            <PreviewMediaArea media={previewMedia} aspect="square" />
            <div className="flex items-center gap-4 px-3 py-1.5 text-lg">
              <span aria-hidden className="cursor-default">♡</span>
              <span aria-hidden className="cursor-default">💬</span>
              <span aria-hidden className="cursor-default">✈️</span>
              <span aria-hidden className="ml-auto cursor-default text-lg">🔖</span>
            </div>
            <div className="px-3 pb-0.5 text-[13px] font-semibold">0 líbenek</div>
            <div className="px-3 pb-3 text-[13px]">
              {content.trim() ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  <span className="mr-1.5 font-semibold">{profile?.displayName ?? ""}</span>
                  {content}
                </p>
              ) : (
                <p className="italic text-white/40">{t("previewCaptionHint") ?? "Sem napište text příspěvku…"}</p>
              )}
            </div>
          </article>
        </div>
      );
    }

    if (platformId === "linkedin") {
      return (
        <div className="flex h-full flex-col bg-[#1a1a2e] text-[#e4e6eb]">
          <div className="flex-1 overflow-y-auto px-3 py-2.5 postio-scrollbar">
            <article className="rounded-lg bg-[#1e1e36] shadow-sm">
              <header className="flex items-start gap-2 px-2.5 pt-2.5">
                <AvatarInline url={profile?.avatarUrl ?? null} name={profile?.displayName ?? ""} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#e4e6eb]">{profile?.displayName ?? ""}</p>
                  <p className="truncate text-[10px] text-[#b0b3b8]">Professional · 1. stupen</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#b0b3b8]">
                    <span>Právě teď</span>
                    <span aria-hidden>·</span>
                    <span aria-hidden>🌐</span>
                  </p>
                </div>
                <span aria-hidden className="text-sm text-[#b0b3b8]">⋯</span>
              </header>
              {content.trim() ? (
                <p className="whitespace-pre-wrap break-words px-2.5 pt-1.5 text-[13px] leading-relaxed text-[#e4e6eb]">{content}</p>
              ) : (
                <p className="px-2.5 pt-1.5 text-[13px] italic text-[#b0b3b8]/60">
                  {t("previewCaptionHint") ?? "Sem napište text příspěvku…"}
                </p>
              )}
              {previewMedia.length > 0 && (
                <div className="mt-1.5 overflow-hidden bg-black">
                  <PreviewMediaArea media={previewMedia} aspect="feed" />
                </div>
              )}
              <div className="flex items-center justify-between px-2.5 pb-0.5 pt-1.5 text-[10px] text-[#b0b3b8]">
                <span aria-hidden>👍❤️👏 0</span>
                <span>0 komentářů</span>
              </div>
              <div className="mx-2.5 border-t border-white/5" />
              <div className="grid grid-cols-4 gap-1 px-1.5 py-1 text-[10px] font-medium text-[#b0b3b8]">
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">👍</span>
                  <span>To se mi líbí</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">💬</span>
                  <span>Komentovat</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">🔁</span>
                  <span>Přeposlat</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">✈️</span>
                  <span>Odeslat</span>
                </span>
              </div>
            </article>
          </div>
        </div>
      );
    }

    if (platformId === "youtube") {
      return (
        <div className="flex h-full flex-col bg-[#0f0f0f] text-white">
          <article className="flex-1 overflow-y-auto postio-scrollbar">
            <PreviewMediaArea media={previewMedia} aspect="video" />
            <h2 className="px-3 pt-2 text-[13px] font-semibold leading-snug text-white">
              {content.trim() ? (
                <span className="line-clamp-2 whitespace-pre-wrap break-words">{content}</span>
              ) : (
                <span className="italic text-white/40">{t("previewCaptionHint") ?? "Sem napište text příspěvku…"}</span>
              )}
            </h2>
            <div className="flex items-center gap-2 px-3 pt-2">
              <AvatarInline url={profile?.avatarUrl ?? null} name={profile?.displayName ?? ""} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">{profile?.displayName ?? ""}</p>
                <p className="text-[10px] text-white/60">0 subscribers</p>
              </div>
              <span className="rounded-full bg-[#FF0000] px-2.5 py-0.5 text-[10px] font-semibold text-white">Subscribe</span>
            </div>
            <div className="mx-3 mt-2 rounded-xl bg-white/[0.06] p-2 text-[11px] text-white/85">
              <p className="font-medium text-white/70">0 views · just now</p>
              {content.trim() && (
                <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{content}</p>
              )}
            </div>
            <div className="flex items-center justify-around px-3 py-2 text-[10px] text-white/80">
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">👍</span>
                <span>Like</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">👎</span>
                <span>Dislike</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">↗</span>
                <span>Share</span>
              </span>
            </div>
          </article>
        </div>
      );
    }

    // TikTok – vertical full-screen player, action icons on right, text overlay at bottom
    if (platformId === "tiktok") {
      const videoMedia = previewMedia.find((m) => m.kind === "video") ?? previewMedia[0];
      return (
        <div className="flex h-full flex-col bg-black text-white">
          <article className="flex-1 overflow-hidden relative">
            {/* Background / Video Area */}
            <div className="absolute inset-0">
              {videoMedia ? (
                videoMedia.kind === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={videoMedia.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={videoMedia.previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center bg-[#121212]">
                  <div className="text-center text-white/50">
                    <span className="mb-2 block text-3xl">🎵</span>
                    <p className="text-xs font-medium">{t("previewNoMediaHint") ?? "Žádná média"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Content overlay */}
            <div className="relative z-10 flex flex-col justify-end min-h-0">
              <div className="flex flex-row items-end justify-between p-3 pb-4">
                {/* Left column: Author & Description */}
                <div className="flex-1 pr-8 min-w-0">
                  <div className="mb-1.5 font-semibold text-[13px]">
                    @{(profile?.displayName ?? "user").replace(/\s+/g, "").toLowerCase()}
                  </div>

                  {content.trim() ? (
                    <div className="text-[12px] text-white/90 font-normal leading-[1.3] line-clamp-3 mb-1.5">
                      {content}
                    </div>
                  ) : null}

                  {/* Original Sound */}
                  <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                    <svg className="w-3 h-3 animate-[spin_3s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <span className="truncate">původní zvuk - {profile?.displayName ?? "user"}</span>
                  </div>
                </div>

                {/* Right column: Action buttons */}
                <div className="flex flex-col items-center justify-end gap-3.5">
                  {/* Avatar + Follow */}
                  <div className="relative mb-1">
                    <AvatarInline
                      url={profile?.avatarUrl ?? null}
                      name={profile?.displayName ?? ""}
                      size={36}
                    />
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#EA4359] w-4 h-4 flex items-center justify-center text-white shadow-sm">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    </div>
                  </div>

                  {/* Like */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <span className="text-[9px] font-semibold">12.4K</span>
                  </div>

                  {/* Comment */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 20.01c.01.27-.1.52-.29.71-.2.2-.45.3-.71.29l-3.32-.23c-1.63.85-3.56 1.3-5.67 1.3-6.63 0-12-4.93-12-11C0 4.93 5.37 0 12 0s12 4.93 12 11c0 3.3-1.63 6.27-4.18 8.19l2.17 1.05v-.23z"></path></svg>
                    <span className="text-[9px] font-semibold">134</span>
                  </div>

                  {/* Bookmark */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>
                    <span className="text-[9px] font-semibold">456</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "scale(-1,1)" }}><path d="M21 11.5L9 4v5C4 9 2 13.5 2 19c2.5-3.5 6-4.5 7-4.5v5l12-7.5z"></path></svg>
                    <span className="text-[9px] font-semibold">12</span>
                  </div>

                  {/* Spinning Record */}
                  <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center animate-[spin_4s_linear_infinite] mt-1 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <AvatarInline
                      url={profile?.avatarUrl ?? null}
                      name={profile?.displayName ?? ""}
                      size={18}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      );
    }

    // Fallback – unknown platform
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground/40 text-sm">
        Náhled není dostupný
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="max-w-[1100px] w-[95vw] rounded-[20px] bg-white/80 dark:bg-card/40 backdrop-blur-xl border border-black/5 dark:border-white/10 p-0 sm:max-w-[1100px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        showCloseButton
      >
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {viewMode === "preview"
                ? (t("postDetail") ?? "Detail příspěvku")
                : (isEdit ? t("editPost") : t("newPost"))}
            </DialogTitle>
            {viewMode === "preview" && isEdit && (
              <Button
                type="button"
                onClick={() => setViewMode("edit")}
                size="sm"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] gap-1.5 text-sm"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("editPostButton") ?? "Upravit"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Prompt 003 – Preview Mode: social preview with platform tabs + action buttons */}
        {viewMode === "preview" && isEdit && (
          <div className="px-6 pb-6 space-y-4">
            {publishedPlatforms.length > 0 ? (
              <>
                {/* Platform tabs – only platforms where post is actually published */}
                <div className="flex items-center gap-2">
                  {publishedPlatforms.map((platformId) => {
                    const Icon = PlatformIconMap[platformId];
                    const platformLabel = PLATFORMS.find((p) => p.id === platformId)?.label ?? platformId;
                    const isActive = selectedPreviewPlatform === platformId;
                    const accent = PLATFORM_ACCENTS_MAP[platformId] ?? "text-muted-foreground";
                    return (
                      <button
                        key={platformId}
                        type="button"
                        onClick={() => setSelectedPreviewPlatform(platformId)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                          isActive
                            ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                            : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10"
                        )}
                      >
                        {Icon && <Icon className={cn("h-3.5 w-3.5", isActive ? "" : accent)} />}
                        {platformLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Social preview for selected platform – constrained height */}
                <div className="max-h-[480px] overflow-hidden rounded-[20px] border border-white/5 bg-black">
                  {renderPlatformPreview(selectedPreviewPlatform)}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const liveUrl = getLiveUrlForPlatform(selectedPreviewPlatform);
                    if (liveUrl) {
                      return (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/20"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t("viewLivePost") ?? "View live post"}
                        </a>
                      );
                    }
                    return null;
                  })()}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60">
                <Info className="mb-2 h-8 w-8" />
                <p className="text-sm">{t("noPublishedPlatforms") ?? "Tento příspěvek ještě nebyl publikován."}</p>
              </div>
            )}
          </div>
        )}

        {/* Edit Mode: original two-column layout (form + live preview) */}
        {viewMode === "edit" && (
        <>
        {/* Two-column layout: form (left) + live preview (right).
            On screens below `lg` the preview collapses below the form. */}
        <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,45%)]">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 postio-scrollbar">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Status pills – only in edit mode */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {t("statusDraft")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "draft", label: t("statusDraft") },
                  { value: "scheduled", label: t("statusScheduled") },
                  { value: "published", label: t("statusPublished") },
                  { value: "failed", label: t("statusFailed") },
                ].map((s) => {
                  const isSelected = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                          : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-content" className="text-sm font-medium text-muted-foreground/80">
                {t("content")}
              </Label>
              <AIAssistantButton
                  content={content}
                  onContentReplace={(text) => setContent(text)}
                  onTagsAdd={(newTags) => {
                    setTags((prev) => {
                      const existing = new Set(prev.map((tag) => tag.toLowerCase()));
                      const added = newTags.filter((tag) => !existing.has(tag.toLowerCase()));
                      return added.length > 0 ? [...prev, ...added] : prev;
                    });
                  }}
                  imageUrl={firstImageUrl}
                  onImageGenerated={(url) => addImageUrl(url)}
                  aiCredits={aiCredits}
                />
            </div>
            <Textarea
              id="edit-content"
              placeholder={t("contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-y rounded-xl transition-all focus:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus:bg-white focus:border-indigo-500/30 dark:focus:bg-black/40 dark:focus:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
            />
            <div className="flex justify-end text-xs text-muted-foreground/60">
              <span className={content.length > 280 ? "text-destructive" : ""}>
                {content.length} {t("characterCount")}
              </span>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("addMedia")}
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
                  const tooLarge = files.some((f) => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(t("fileTooLarge"));
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
                  const tooLarge = files.some((f) => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(t("fileTooLarge"));
                    return;
                  }
                  addMediaFiles(files);
                }
              }}
              className={cn(
                "group relative w-full rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-left backdrop-blur-md transition-colors hover:bg-white/[0.05]",
                isDraggingMedia && "border-indigo-500/50 bg-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/[0.03] backdrop-blur-md">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {t("addMedia")}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                    <Film className="h-3.5 w-3.5" />
                    <span>
                      {mediaItems.length}/{MAX_MEDIA_FILES}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02] backdrop-blur-md"
                  >
                    {item.status === "optimizing" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        <span className="text-[10px] font-medium text-purple-200/80">
                          {t("optimizingImage") ?? "Optimalizuji..."}
                        </span>
                      </div>
                    )}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-200/80">
                          {t("uploading")}
                        </span>
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
                        className="h-24 w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <video
                        src={item.previewUrl}
                        className="h-24 w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning: media changed for published post */}
          {isEdit && mediaChanged && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{t("onlyTextUpdatePossible") ?? "U publikovaného postu lze měnit pouze text. Pro změnu fotky musíte příspěvek smazat a vytvořit znovu."}</span>
            </div>
          )}

          {/* Platforms / Accounts */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("selectPlatforms")}
            </Label>
            {allAccounts.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="mb-3 text-sm text-muted-foreground/60">
                  {t("noConnectedAccounts") ?? "Nemáte připojený žádný účet. Nejprve připojte účet sociální sítě."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${locale}/accounts`)}
                  className="rounded-xl"
                >
                  {t("connectAccount") ?? "Připojit účet"}
                </Button>
              </div>
            ) : (
              <TooltipProvider delayDuration={150}>
                {(() => {
                  // Pre-compute published & archived account IDs with legacy NULL-account_id fallback
                  const publishedAccountIds = new Set<string>();
                  const archivedAccountIds = new Set<string>();
                  const pp = post?.post_platforms ?? [];
                  for (const row of pp) {
                    if (row.account_id) {
                      if (row.status === "published") publishedAccountIds.add(row.account_id);
                      if (row.status === "archived") archivedAccountIds.add(row.account_id);
                    } else {
                      const firstOfPlatform = allAccounts.find(
                        (a) => a.platform === row.platform
                      );
                      if (firstOfPlatform) {
                        if (row.status === "published") publishedAccountIds.add(firstOfPlatform.id);
                        if (row.status === "archived") archivedAccountIds.add(firstOfPlatform.id);
                      }
                    }
                  }
                  // Group accounts by platform
                  const groups = allAccounts.reduce<Record<string, AccountInfo[]>>(
                    (acc, a) => {
                      if (!acc[a.platform]) acc[a.platform] = [];
                      acc[a.platform].push(a);
                      return acc;
                    },
                    {},
                  );
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(groups).map(([platformId, accounts]) => {
                        const Icon = PlatformIconMap[platformId];
                        const platformColor = {
                          instagram: "text-[#E1306C]",
                          facebook: "text-[#1877F2]",
                          twitter: "text-[#1DA1F2]",
                          linkedin: "text-[#0A66C2]",
                          youtube: "text-[#FF0000]",
                          tiktok: "text-[#010101]",
                        }[platformId] ?? "text-muted-foreground";
                        const platformLabel = PLATFORMS.find((p) => p.id === platformId)?.label ?? platformId;

                        return (
                          <div
                            key={platformId}
                            className={cn(
                              "rounded-[20px] border bg-white/[0.04] p-3 backdrop-blur-sm transition-all duration-200",
                              accounts.some((a) => selectedAccountIds.includes(a.id))
                                ? "border-indigo-500/30"
                                : "border-white/10",
                            )}
                          >
                            {/* Platform header */}
                            <div className="flex items-center gap-2 pb-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
                                {Icon && <Icon className={cn("h-4 w-4", platformColor)} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground/80">
                                  {platformLabel}
                                </span>
                              </div>
                              {/* KROK 5: Twitter auto-credits indicator */}
                              {platformId === "twitter" && (
                                <span className={cn(
                                  "ml-auto text-[10px]",
                                  twitterAutoCredits > 0 ? "text-muted-foreground/50" : "text-destructive/40"
                                )}>
                                  ⚡{twitterAutoCredits}
                                </span>
                              )}
                            </div>
                            {/* Account chips */}
                            <div className="flex flex-row flex-wrap gap-1.5">
                              {accounts.map((account) => {
                                const isSelected = selectedAccountIds.includes(account.id);
                                const isPublished = publishedAccountIds.has(account.id);
                                const isArchived = archivedAccountIds.has(account.id);
                                const requirementMet = isPlatformMediaRequirementMet(platformId);
                                const isPlatformDisabled = (!isPublished && !isArchived) && !requirementMet;
                                const tooltipMessage = isPlatformDisabled
                                  ? getPlatformRequirementTooltip(platformId)
                                  : null;

                                const chip = (
                                  <button
                                    key={account.id}
                                    type="button"
                                    disabled={isPlatformDisabled}
                                    onClick={() => !isPublished && !isArchived && toggleAccount(account.id)}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all duration-200",
                                      isPublished
                                        ? "border-green-500/30 bg-green-500/10 text-green-400/80 opacity-60 pointer-events-none"
                                        : isArchived
                                          ? "border-gray-500/20 bg-gray-500/5 text-gray-400/60 opacity-50 pointer-events-none"
                                          : isSelected
                                          ? "border-indigo-500/40 dark:border-indigo-500/60 bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300"
                                          : "border-white/10 bg-white/[0.04] text-slate-700 dark:text-muted-foreground hover:bg-white/[0.08] hover:border-white/20",
                                      isPlatformDisabled && "opacity-40 cursor-not-allowed",
                                    )}
                                  >
                                    {account.avatar_url ? (
                                      <img
                                        src={account.avatar_url}
                                        alt={account.account_name}
                                        className="h-4 w-4 shrink-0 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[8px] font-semibold text-white">
                                        {(account.account_name?.trim()?.[0] ?? "?").toUpperCase()}
                                      </div>
                                    )}
                                    <span className="max-w-[90px] truncate">
                                      {account.account_name}
                                    </span>
                                    {isPublished && <Check className="h-3 w-3 shrink-0 text-green-500" />}
                                  </button>
                                );

                                if (tooltipMessage) {
                                  return (
                                    <Tooltip key={account.id}>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex">{chip}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>{tooltipMessage}</TooltipContent>
                                    </Tooltip>
                                  );
                                }
                                return chip;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </TooltipProvider>
            )}
          </div>

          {hasTikTokIntent && (
            <div className="space-y-3 rounded-[20px] border border-black/5 bg-white/60 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground/80">
                  {t("tiktokPrivacyTitle")}
                </Label>
                <p className="text-xs text-muted-foreground/60">
                  {t("tiktokPrivacyHint")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    value: "PUBLIC_TO_EVERYONE" as const,
                    label: t("tiktokPrivacyPublic"),
                  },
                  {
                    value: "MUTUAL_FOLLOW_FRIENDS" as const,
                    label: t("tiktokPrivacyFriends"),
                  },
                  {
                    value: "SELF_ONLY" as const,
                    label: t("tiktokPrivacyPrivate"),
                  },
                ].map((option) => {
                  const isSelected = tiktokPrivacyLevel === option.value;
                  const isAllowed = allowedTikTokPrivacyLevels.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => setTikTokPrivacyLevel(option.value)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                        isSelected
                          ? "border-indigo-500/30 dark:border-indigo-500/50 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                          : "border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] text-slate-700 dark:text-muted-foreground",
                        !isAllowed && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {isTikTokPrivateOnly && (
                <div className="flex items-start gap-3 rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t("tiktokPrivateOnlyNotice")}</span>
                </div>
              )}

              <div className="rounded-[20px] border border-black/5 bg-black/[0.02] p-3 text-xs text-muted-foreground/70 dark:border-white/10 dark:bg-black/20">
                <p>
                  {tiktokCreatorInfoLoading
                    ? t("tiktokCreatorInfoLoading")
                    : t(
                        "tiktokCreatorInfoSummary",
                        {
                          account:
                            tiktokCreatorInfo?.creatorNickname ||
                            tiktokCreatorInfo?.creatorUsername ||
                            "TikTok",
                        },
                      )}
                </p>
                {tiktokCreatorInfo && (
                  <p className="mt-1">
                    {t(
                      "tiktokCreatorInfoCapabilities",
                      {
                        comments: tiktokCreatorInfo.commentDisabled
                          ? t("tiktokCapabilityDisabled")
                          : t("tiktokCapabilityEnabled"),
                        duet: tiktokCreatorInfo.duetDisabled
                          ? t("tiktokCapabilityDisabled")
                          : t("tiktokCapabilityEnabled"),
                        stitch: tiktokCreatorInfo.stitchDisabled
                          ? t("tiktokCapabilityDisabled")
                          : t("tiktokCapabilityEnabled"),
                      },
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              Lokace
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="h-10 rounded-xl pl-10 transition-all focus-visible:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus-visible:bg-white focus-visible:border-indigo-500/30 dark:focus-visible:bg-black/40 dark:focus-visible:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("addTags")}
            </Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 px-3 py-1 text-xs text-indigo-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commitTag(tagDraft);
                }
                if (e.key === "Backspace" && tagDraft.length === 0 && tags.length > 0) {
                  removeTag(tags[tags.length - 1] ?? "");
                }
              }}
              onBlur={() => commitTag(tagDraft)}
              placeholder={t("addTags")}
              className="h-10 rounded-xl transition-all focus-visible:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus-visible:bg-white focus-visible:border-indigo-500/30 dark:focus-visible:bg-black/40 dark:focus-visible:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Internal organization tags (Nastavení → Štítky) – interní, neodesílá se na sítě */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("internalTags")}
            </Label>
            <TagPicker
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              t={{
                placeholder: t("internalTagsPlaceholder"),
                createTag: t("createTag"),
                noTags: t("noInternalTags"),
                selectColor: t("selectColor"),
                add: t("add"),
                cancel: t("cancel"),
              }}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("scheduledAt")}
            </Label>
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              locale={locale}
            />
          </div>
        </div>

        {/* Live post preview (right column on desktop, below form on mobile).
            Sticky on desktop so it stays in view while the user scrolls the
            form. Hidden on very small screens via the grid breakpoint. */}
        <div className="hidden lg:block">
          <div className="sticky top-0 max-h-[70vh]">
            <PostPreview
              content={content}
              media={previewMedia}
              facebookProfile={facebookProfile}
              instagramProfile={instagramProfile}
              youtubeProfile={youtubeProfile}
              linkedinProfile={linkedinProfile}
              tiktokProfile={tiktokProfile}
              availablePlatforms={availablePreviewPlatforms}
              location={location}
              labels={previewLabels}
            />
          </div>
        </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-3">
          {/* Instagram video-resolution hard-block banner.
              Single source of truth – shown for BOTH new posts and existing
              (already published) posts, so the user always sees the same
              message in the same place. */}
          {isInstagramVideoIncompatible && (
            <div
              className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200/90"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="space-y-0.5">
                <p className="font-medium">
                  {t("instagramVideoTooSmall") ??
                    "Toto video nelze na Instagramu publikovat."}
                </p>
                <p className="text-xs text-rose-200/70">
                  {t("instagramVideoTooSmallHint") ??
                    "Instagram nepodporuje videa s nízkým rozlišením (minimálně 640 × 1138 px). Přegenerujte prosím video ve vyšším rozlišení (doporučeno 1080 × 1920 px)."}
                </p>
              </div>
            </div>
          )}
          {isEdit && isAnyPublished ? (
            <>
              {/* Additional publish buttons – publish to platforms not yet published */}
              {canPublishAdditional && unpublishedSelectedPlatforms.map((p) => {
                const Icon = PlatformIconMap[p];
                const platformLabel = PLATFORMS.find((pl) => pl.id === p)?.label ?? p;
                return (
                  <Button
                    key={p}
                    type="button"
                    onClick={() => handlePublishAdditional(p)}
                    disabled={isPublishingAdditional || hasUploading()}
                    className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishingAdditional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {t("publishToSelected") ?? "Publikovat"} na {platformLabel}
                  </Button>
                );
              })}

              {/* Instagram edit not supported banner */}
              {isInstagramPublished && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t("igEditNotSupported") ?? "Instagram neumožňuje úpravu textu u již zveřejněných příspěvků. Pokud chcete text změnit, musíte příspěvek v Postio smazat a publikovat znovu."}</span>
                </div>
              )}

              {/* Twitter (X) edit not supported banner */}
              {isTwitterPublished && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t("twEditNotSupported") ?? "X (Twitter) nepodporuje editaci příspěvků přes API. Pokud chcete text změnit, musíte příspěvek smazat a publikovat znovu."}</span>
                </div>
              )}

              {/* TikTok edit not supported banner */}
              {isTikTokPublished && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t("ttEditNotSupported") ?? "TikTok nepodporuje editaci ani smazání po publikování."}</span>
                </div>
              )}

              {/* Dynamic per-platform update buttons – shown when content changed */}
              {isContentChanged && updatablePlatforms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground/60">
                    Text byl změněn. Aktualizujte na vybraných sítích:
                  </p>
                  {updatablePlatforms.map((p) => {
                    const Icon = PlatformIconMap[p];
                    const platformLabel = PLATFORMS.find((pl) => pl.id === p)?.label ?? p;
                    const isUpdatingThis = updatingPlatforms[p] ?? false;
                    return (
                      <Button
                        key={`update-${p}`}
                        type="button"
                        onClick={() => handleUpdatePlatform(p)}
                        disabled={isUpdatingThis || mediaChanged || hasUploading()}
                        className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingThis && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {Icon && <Icon className="mr-2 h-4 w-4" />}
                        Aktualizovat na {platformLabel}
                      </Button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* Save internal-only metadata – always available for published posts */}
                <Button
                  type="button"
                  onClick={handleSaveMetadata}
                  disabled={!hasMetadataChanges || loading || isPublishingAdditional || isUpdating}
                  variant="outline"
                  className={cn(
                    "rounded-xl border-indigo-500/30 bg-indigo-500/10 transition-colors",
                    hasMetadataChanges
                      ? "hover:bg-indigo-500/20 text-indigo-200"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("saveMetadata") ?? "Uložit interní metadata"}
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => handleClose()}
                    variant="outline"
                    className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  >
                    {t("cancel") ?? "Zrušit"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* The Instagram video-resolution hard-block banner is rendered
                  once above this conditional, so we don't repeat it here. */}
              <Button
                type="button"
                onClick={() => handleSubmit("draft")}
                disabled={!content.trim() || loading || publishing}
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? t("saving") : t("saveDraft")}
              </Button>
              <Button
                type="button"
                onClick={handleQueueToSchedule}
                disabled={
                  !content.trim() ||
                  selectedAccountIds.length === 0 ||
                  loading ||
                  queuing ||
                  publishing ||
                  isInstagramVideoIncompatible
                }
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                variant="outline"
                className="rounded-xl border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all"
              >
                {queuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ListOrdered className="mr-2 h-4 w-4" />
                {queuing ? t("queueLoading") : t("addToQueue")}
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit("scheduled")}
                disabled={
                  !content.trim() ||
                  !scheduledAt ||
                  selectedAccountIds.length === 0 ||
                  loading ||
                  publishing ||
                  isInstagramVideoIncompatible
                }
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? t("saving") : t("schedule")}
              </Button>
              <Button
                type="button"
                onClick={handlePublishNow}
                disabled={
                  !content.trim() ||
                  selectedAccountIds.length === 0 ||
                  loading ||
                  publishing ||
                  isInstagramVideoIncompatible
                }
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {publishing ? t("saving") : t("publishNow")}
              </Button>
            </>
          )}
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
