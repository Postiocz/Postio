"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPostAction } from "@/lib/actions/posts";
import {
  computeTikTokPublishBlocked,
  isTikTokPrivateOnlyAccount,
  resolveEffectiveTikTokPrivacyLevel,
} from "@/lib/tiktok-direct-post";
import { publishPost } from "@/lib/actions/publish";
import { getNextAvailableQueueSlot } from "@/lib/actions/queue";
import { ArrowLeft, Calendar, CheckCircle2, Film, AlertTriangle, Image as ImageIcon, Loader2, ListOrdered, MapPin, X, Info, FileText, Users, Tags, Settings } from "lucide-react";
import {
  getTikTokCreatorInfoAction,
  type TikTokCreatorInfo,
  type TikTokPrivacyLevel,
} from "@/lib/actions/publish-tiktok";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/image-proxy";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlatformIconMap } from "@/components/calendar/post-calendar-chip";
import {
  DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS,
  isTikTokSandboxPrivateOnlyError,
  TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE,
} from "@/lib/tiktok-publish-errors";
import {
  getPlatformPolicy,
  validateCandidate,
  validateMediaCount,
  type MediaCandidate,
  type ValidationIssue,
} from "@/lib/media/platform-policies";
import { mediaIssueText } from "@/lib/media/media-message";
import { PlatformMediaBadge } from "@/components/platform-media-badge";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";
import { PostPreview, type PostPreviewMedia, type PostPreviewProfile } from "@/components/post-preview";
import { ScheduleQuickSlots } from "@/components/schedule-quick-slots";

type AccountInfo = {
  id: string;
  platform: string;
  account_name: string;
  avatar_url: string | null;
  publishing_type?: string | null;
};

const PLATFORMS = [
  { id: "instagram", labelCs: "Instagram", labelEn: "Instagram", labelUk: "Instagram" },
  { id: "facebook", labelCs: "Facebook", labelEn: "Facebook", labelUk: "Facebook" },
  { id: "twitter", labelCs: "Twitter/X", labelEn: "Twitter/X", labelUk: "Twitter/X" },
  { id: "linkedin", labelCs: "LinkedIn", labelEn: "LinkedIn", labelUk: "LinkedIn" },
  { id: "youtube", labelCs: "YouTube", labelEn: "YouTube", labelUk: "YouTube" },
  { id: "tiktok", labelCs: "TikTok", labelEn: "TikTok", labelUk: "TikTok" },
];

const MAX_MEDIA_FILES = 10;
// Direct Post UX: privacy must be explicitly selected by the user – no
// default value. The options shown come exclusively from creator_info.
const TIKTOK_SUPPORTED_PRIVACY_LEVELS: TikTokPrivacyLevel[] = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
  "FOLLOWER_OF_CREATOR",
];

function resolvePublishErrorMessage(params: {
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
      t("tiktokUnauditedPrivateOnlyError") ??
      DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS
    );
  }

  // KROK 7: Localized X credits error.
  if (error && error.includes("Nemáš dostatek X kreditů") && ta) {
    return ta("xConnect.noCredits");
  }

  return error ?? t("errorSaving") ?? "Publikování selhalo.";
}

export default function NewPostPage() {
  const t = useTranslations("posts");
  const td = useTranslations("dashboard");
  const ta = useTranslations("accounts");
  const previewPlaceholderName = t("previewPlaceholderName") ?? "Postio";
  const reduce = useReducedMotion();
   const router = useRouter();
  const { locale } = useParams();
  const [content, setContent] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountInfo[]>([]);
  // KROK 5 (Prompt 043-C): User credits for UI indicators.
  const [aiCredits, setAiCredits] = useState(0);
  const [twitterAutoCredits, setTwitterAutoCredits] = useState(0);

  // Account-based selection (Prompt 028 Krok 1): selectedPlatforms is derived
  // from the chosen account IDs, keeping backward compatibility with the
  // media-gating and button-disabling logic. Mirrors EditPostDialog.
  const selectedPlatforms = useMemo(() => {
    return [
      ...new Set(
        selectedAccountIds
          .map((id) => allAccounts.find((a) => a.id === id)?.platform)
          .filter((p): p is string => !!p),
      ),
    ];
  }, [selectedAccountIds, allAccounts]);

  // Which preview tabs to render, in display order. Only platforms the post
  // actually targets are shown (mirrors EditPostDialog for the new-post case).
  const availablePreviewPlatforms = useMemo<
    Array<"facebook" | "instagram" | "youtube" | "linkedin" | "tiktok" | "twitter">
  >(() => {
    const order: Array<"facebook" | "instagram" | "youtube" | "linkedin" | "tiktok" | "twitter"> = [
      "facebook",
      "instagram",
      "youtube",
      "linkedin",
      "tiktok",
      "twitter",
    ];
    return order.filter((id) => selectedPlatforms.includes(id));
  }, [selectedPlatforms]);

  // Hybridní X režim (Prompt 031-X-COMBO, Krok 4): je mezi vybranými účty
  // manuální X (publishing_type='manual')? Pak tlačítko zní jinak.
  const hasManualTwitter = selectedAccountIds.some((id) => {
    const acc = allAccounts.find((a) => a.id === id);
    return acc?.platform?.toLowerCase() === "twitter" && acc?.publishing_type === "manual";
  });

  // TikTok Direct Post settings (mirrors EditPostDialog). Privacy has NO
  // default (the user must pick); Comments/Duet/Stitch toggles start off and
  // only exist as user choice; commercial disclosure is off by default.
  const [tiktokCreatorInfo, setTikTokCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokCreatorInfoLoading, setTikTokCreatorInfoLoading] = useState(false);
  const [tiktokPrivacyLevel, setTikTokPrivacyLevel] =
    useState<TikTokPrivacyLevel | null>(null);
  const [tiktokAllowDuet, setTikTokAllowDuet] = useState(false);
  const [tiktokAllowComment, setTikTokAllowComment] = useState(false);
  const [tiktokAllowStitch, setTikTokAllowStitch] = useState(false);
  const [tiktokBrandContent, setTikTokBrandContent] = useState(false);
  const [tiktokBrandOrganic, setTikTokBrandOrganic] = useState(false);
  const [tiktokCommercialEnabled, setTikTokCommercialEnabled] = useState(false);
  const [tiktokMusicConsent, setTikTokMusicConsent] = useState(false);

  const hasTikTokIntent = useMemo(() => {
    return selectedPlatforms.includes("tiktok");
  }, [selectedPlatforms]);

  // Privacy options come EXCLUSIVELY from creator_info.privacy_level_options
  // (Direct Post UX requirement). Empty while creator info is not loaded.
  const allowedTikTokPrivacyLevels = useMemo(() => {
    const options = tiktokCreatorInfo?.privacyLevelOptions?.filter((level) =>
      TIKTOK_SUPPORTED_PRIVACY_LEVELS.includes(level),
    );
    return options ?? [];
  }, [tiktokCreatorInfo]);

  const isTikTokPrivateOnly = useMemo(() => {
    return (
      allowedTikTokPrivacyLevels.length === 1 &&
      allowedTikTokPrivacyLevels[0] === "SELF_ONLY"
    );
  }, [allowedTikTokPrivacyLevels]);

  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Live preview profiles (platform name + avatar for PostPreview). Loaded
  // from social_accounts with the `users` row as a graceful fallback.
  const [facebookProfile, setFacebookProfile] = useState<PostPreviewProfile | null>(null);
  const [instagramProfile, setInstagramProfile] = useState<PostPreviewProfile | null>(null);
  const [youtubeProfile, setYoutubeProfile] = useState<PostPreviewProfile | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<PostPreviewProfile | null>(null);
  const [tiktokProfile, setTikTokProfile] = useState<PostPreviewProfile | null>(null);
  const [twitterProfile, setTwitterProfile] = useState<PostPreviewProfile | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Load connected accounts for the account-based platform picker (Prompt 028 Krok 1).
  // Mirrors EditPostDialog's fetch("/api/accounts").
  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  // Load the user's profile + connected social accounts for the live preview.
  // Runs once we have a userId. The social account takes priority (it reflects
  // the actual page/username on the network); the `users` row is a fallback.
  useEffect(() => {
    if (!userId) return;
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
            .in("platform", ["facebook", "instagram", "youtube", "linkedin", "tiktok", "twitter"]),
        ]);
        if (cancelled) return;
        const fallbackName = userRes.data?.full_name ?? previewPlaceholderName;
        const fallbackAvatar = userRes.data?.avatar_url ?? null;
        const find = (p: string) => accountsRes.data?.find((a) => a.platform === p);
        const fb = find("facebook");
        const ig = find("instagram");
        const yt = find("youtube");
        const li = find("linkedin");
        const tt = find("tiktok");
        const tw = find("twitter");
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
        setTikTokProfile({
          displayName: tt?.account_name ?? fallbackName,
          avatarUrl: tt?.avatar_url ?? fallbackAvatar,
        });
        setTwitterProfile({
          displayName: tw?.account_name ?? fallbackName,
          avatarUrl: tw?.avatar_url ?? fallbackAvatar,
        });
      } catch {
        // non-fatal – preview falls back to placeholder name
      }
    };
    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [userId, previewPlaceholderName, supabase]);

  // Best-effort load of TikTok creator capabilities (privacy options etc.).
  // In the sandbox this may fail – the privacy toggles still render with all
  // three options and the creator-info summary falls back to "loading/failed".
  useEffect(() => {
    if (!hasTikTokIntent) return;

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
        // Privacy is never pre-selected (Direct Post UX requires an explicit
        // user choice). We only validate that a previously chosen value is
        // still allowed; otherwise it is cleared so the user must re-pick.
        setTikTokPrivacyLevel((current) =>
          current && result.data.privacyLevelOptions.includes(current)
            ? current
            : null,
        );
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
  }, [hasTikTokIntent]);

  // KROK 2 (Prompt 057): Hybrid X gating. When the user has 0 X auto-credits,
  // force-deselect any direct (API auto-publish) X account so they have to
  // switch to the free manual-reminder mode (or upgrade).
  useEffect(() => {
    if (twitterAutoCredits <= 0) {
      setSelectedAccountIds((prev) =>
        prev.filter((id) => {
          const account = allAccounts.find((a) => a.id === id);
          return !(account?.platform?.toLowerCase() === "twitter" && account?.publishing_type === "direct");
        }),
      );
    }
  }, [twitterAutoCredits, allAccounts]);

  // ---------------------------------------------------------------------
  // Template prefill (?template=<id>)
  // ---------------------------------------------------------------------
  // When the user clicks a template card on /templates, we land here with
  // the template id in the URL. We fetch that template's content from the
  // DB (RLS ensures we only get our own templates) and prefill the editor.
  // The `templateAppliedRef` guard makes sure the prefill runs only once –
  // otherwise re-renders caused by typing would keep clobbering the user's
  // edits with the original template content.
  const templateAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId || !userId) return;
    if (templateAppliedRef.current === templateId) return;

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("templates")
        .select("id, name, content")
        .eq("id", templateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError || !data) {
        templateAppliedRef.current = templateId;
        toast.error(t("templateLoadError"));
        return;
      }

      templateAppliedRef.current = templateId;
      setContent(data.content);
      toast.success(t("templateApplied", { name: data.name }));
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, userId, t]);

  const uploadLabels = {
    tooManyFiles: t("tooManyFiles"),
    uploadSuccess: t("uploadSuccess"),
    uploadError: t("uploadError"),
    fileDeleted: t("fileDeleted"),
    invalidFileType: t("invalidFileType"),
    // `unsupportedFormat` is an ICU message with the `{type}` placeholder – it
    // must be called as a function (per next-intl rules) so the offending
    // MIME type is substituted correctly.
    unsupportedFormat: (values: { type: string }) => t("unsupportedFormat", values),
    videoTooLarge: t("videoTooLarge"),
    videoLowResolution: t("videoLowResolution"),
    // These two are required by the MediaUploadLabels type but are only
    // surfaced by the form UI, not the upload hook itself – the hook never
    // calls them. We pass them so the uploadLabels object satisfies the
    // type contract.
    instagramVideoTooSmall: t("instagramVideoTooSmall"),
    instagramVideoTooSmallHint: t("instagramVideoTooSmallHint"),
    fileTooLargeImage: t("fileTooLargeImage"),
    fileTooLargeVideo: t("fileTooLargeVideo"),
    optimizingImage: t("optimizingImage"),
    fileOptimized: t("fileOptimized"),
    compressionError: t("compressionError"),
  };
  const { items: mediaItems, addFiles: addMediaFiles, removeItem: removeMediaItem, getMediaUrls, hasUploading, addImageUrl } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

  // Longest ready video's duration in seconds (used for the TikTok
  // max-duration check). `null` when unknown.
  const tiktokVideoDurationSec = useMemo(() => {
    const durations = mediaItems
      .filter((i) => i.kind === "video" && i.status === "ready")
      .map((i) => (typeof i.duration === "number" ? i.duration : 0));
    return durations.length > 0 ? Math.max(...durations) : null;
  }, [mediaItems]);

  const tiktokMaxDurationSec = tiktokCreatorInfo?.maxVideoPostDurationSec ?? null;
  // A missing/zero max duration means "no limit" – the check is skipped.
  const tiktokDurationExceeded =
    tiktokMaxDurationSec != null &&
    tiktokMaxDurationSec > 0 &&
    tiktokVideoDurationSec != null &&
    tiktokVideoDurationSec > tiktokMaxDurationSec;

  // Direct Post UX: with the commercial disclosure toggle ON the user must
  // pick at least one option ("Your Brand" and/or "Branded Content").
  const tiktokCommercialMissing =
    tiktokCommercialEnabled && !tiktokBrandContent && !tiktokBrandOrganic;
  // Branded content can never be private (Direct Post UX requirement).
  const tiktokBrandedBlocksPrivate = tiktokBrandContent;
  // When Branded Content is enabled and "Only me" was chosen earlier, the
  // selection is cleared so the user must re-pick (never a silent deadlock).
  const effectiveTikTokPrivacyLevel = resolveEffectiveTikTokPrivacyLevel(
    tiktokBrandedBlocksPrivate,
    tiktokPrivacyLevel,
  );
  // On a private-only account (sandbox) Branded Content is impossible:
  // it requires public/friends visibility, so the option is disabled.
  const tiktokBrandedUnavailable = isTikTokPrivateOnlyAccount(
    tiktokCreatorInfo?.privacyLevelOptions,
  );

  // Blocks any publish/schedule/queue while a TikTok Direct Post requirement
  // is unmet: privacy not picked, disclosure on but no option chosen, the
  // video exceeds the creator's max duration, or consent not given.
  const tiktokPublishBlock = useMemo(
    () =>
      computeTikTokPublishBlocked({
        hasTikTokIntent,
        privacyLevel: effectiveTikTokPrivacyLevel,
        musicConsent: tiktokMusicConsent,
        commercialEnabled: tiktokCommercialEnabled,
        brandContent: tiktokBrandContent,
        brandOrganic: tiktokBrandOrganic,
        maxDurationSec: tiktokMaxDurationSec,
        videoDurationSec: tiktokVideoDurationSec,
      }),
    [
      hasTikTokIntent,
      effectiveTikTokPrivacyLevel,
      tiktokMusicConsent,
      tiktokCommercialEnabled,
      tiktokBrandContent,
      tiktokBrandOrganic,
      tiktokMaxDurationSec,
      tiktokVideoDurationSec,
    ],
  );
  const tiktokPublishBlocked = tiktokPublishBlock.blocked;
  const tiktokBlockReason = useMemo(() => {
    if (!tiktokPublishBlock.reason) return null;
    const key =
      tiktokPublishBlock.reason === "privacy"
        ? "tiktokPrivacyRequired"
        : tiktokPublishBlock.reason === "duration"
          ? "tiktokVideoTooLong"
          : tiktokPublishBlock.reason === "disclosure"
            ? "tiktokDisclosureRequired"
            : "tiktokMusicConsentRequired";
    return t(key);
  }, [tiktokPublishBlock.reason, t]);

  // Only send TikTok-specific metadata when a TikTok account is selected.
  const platformMetadata = useMemo<Record<string, Record<string, unknown>> | undefined>(() => {
    if (!hasTikTokIntent) return undefined;
    return {
      tiktok: {
        privacy_level: effectiveTikTokPrivacyLevel,
        disable_duet: !tiktokAllowDuet,
        disable_comment: !tiktokAllowComment,
        disable_stitch: !tiktokAllowStitch,
        commercial_enabled: tiktokCommercialEnabled,
        brand_content_toggle: tiktokCommercialEnabled && tiktokBrandContent,
        brand_organic_toggle: tiktokCommercialEnabled && tiktokBrandOrganic,
      },
    };
  }, [
    hasTikTokIntent,
    effectiveTikTokPrivacyLevel,
    tiktokAllowDuet,
    tiktokAllowComment,
    tiktokAllowStitch,
    tiktokBrandContent,
    tiktokBrandOrganic,
  ]);

  // First uploaded image URL for AI Vision (only ready uploads have server-accessible URLs)
  const firstImageUrl = useMemo(() => {
    const firstImage = mediaItems.find((item) => item.kind === "image" && item.status === "ready" && item.url);
    return firstImage?.url ?? null;
  }, [mediaItems]);

  // Media items projected into the shape PostPreview expects. For READY
  // uploads we prefer the stable public URL (`url`) over the temporary object
  // URL (`previewUrl`, a blob: URL that is revoked once the upload settles) so
  // the preview keeps rendering after the upload finishes. In-progress items
  // fall back to the object URL so the preview updates live.
  const previewMedia = useMemo<PostPreviewMedia[]>(
    () =>
      mediaItems
        .filter((i) => i.status !== "error")
        .map((i) => ({
          previewUrl:
            i.status === "ready" && i.url ? i.url : i.previewUrl,
          kind: i.kind,
        })),
    [mediaItems],
  );

  // Labels for PostPreview with safe fallbacks (mirrors EditPostDialog).
  const previewLabels = useMemo(
    () => ({
      previewTitle: t("previewTitle") ?? "Náhled",
      facebookTab: t("previewFacebookTab") ?? "Facebook",
      instagramTab: t("previewInstagramTab") ?? "Instagram",
      youtubeTab: t("previewYoutubeTab") ?? "YouTube",
      linkedinTab: t("previewLinkedinTab") ?? "LinkedIn",
      tiktokTab: t("previewTikTokTab") ?? "TikTok",
      twitterTab: t("previewTwitterTab") ?? "X",
      noMedia: t("previewNoMedia") ?? "Žádná média",
      tiktokVideoRequired: t("tiktokVideoRequired") ?? "TikTok vyžaduje video",
      placeholderName: t("previewPlaceholderName") ?? "Postio",
      captionHint: t("previewCaptionHint") ?? "Sem napište text příspěvku…",
      now: t("previewNow") ?? "Právě teď",
      actionLike: t("previewActionLike") ?? "Líbí se mi",
      actionComment: t("previewActionComment") ?? "Komentovat",
      actionShare: t("previewActionShare") ?? "Sdílet",
      actionRepost: t("previewActionRepost") ?? "Přeposlat",
      actionSend: t("previewActionSend") ?? "Odeslat",
      actionSubscribe: t("previewActionSubscribe") ?? "Odebírat",
      actionDislike: t("previewActionDislike") ?? "Nelíbí",
      actionBookmark: t("previewActionBookmark") ?? "Záložka",
      professionalDegree: t("previewProfessionalDegree") ?? "Professional · 1. stupeň",
      likesCount: t("previewLikesCount") ?? "0 líbenek",
      subscribersCount: t("previewSubscribersCount") ?? "0 odběratelů",
      viewsNow: t("previewViewsNow") ?? "0 zhlédnutí · právě teď",
      commentShareStats: t("previewCommentShareStats") ?? "0 komentářů · 0 sdílení",
      commentStats: t("previewCommentStats") ?? "0 komentářů",
      originalSound: t("previewOriginalSound") ?? "původní zvuk - {name}",
      repostsLabel: t("previewRepostsLabel") ?? "Reposty",
      viewsLabel: t("previewViewsLabel") ?? "Zobrazení",
      twitterSource: t("previewTwitterSource") ?? "X Web App",
      repliesLabel: t("previewRepliesLabel") ?? "Odpovědi",
      mediaAlt: t("previewMediaAlt") ?? "Náhled média",
    }),
    [t],
  );

  // Prompt 023 (Krok 1) – Media presence flags that gate platform selection.
  // TikTok/YouTube require a video; Instagram requires any media. Excluding
  // failed uploads so an erroring file does not satisfy a requirement.
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
  function getPlatformRequirementTooltip(platformId: string): string | null {
    if (platformId === "tiktok") return t("tiktokRequiresVideo") ?? "TikTok vyžaduje video soubor";
    if (platformId === "youtube") return t("youtubeRequiresVideo") ?? "YouTube vyžaduje video soubor";
    if (platformId === "instagram") return t("instagramRequiresMedia") ?? "Instagram vyžaduje fotku nebo video";
    return null;
  }

  // KROK 2 (media policies): map the uploaded media to the pure validator
  // contract. Only "ready" items are validated – items still uploading are
  // handled by the `hasUploading()` guard, and failed items never reach the
  // post.
  const mediaCandidates = useMemo<MediaCandidate[]>(() => {
    return mediaItems
      .filter((i) => i.status === "ready")
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        mimeType: i.file?.type ?? undefined,
        fileSizeBytes: i.file?.size,
        dimensions: i.dimensions,
      }));
  }, [mediaItems]);

  // Per-platform media validation issues (from platform-policies.ts).
  // Error severity hard-blocks Publish/Schedule; warnings (e.g. aspect
  // ratio) only surface in the banner/tooltip.
  const platformMediaIssues = useMemo<Record<string, ValidationIssue[]>>(() => {
    const out: Record<string, ValidationIssue[]> = {};
    for (const platformId of selectedPlatforms) {
      const policy = getPlatformPolicy(platformId);
      out[platformId] = [
        ...validateMediaCount(mediaCandidates, policy),
        ...mediaCandidates.flatMap((c) => validateCandidate(c, policy)),
      ];
    }
    return out;
  }, [selectedPlatforms, mediaCandidates]);

  /** True when any selected platform has a hard media error. */
  const hasBlockingMediaErrors = useMemo(() => {
    return selectedPlatforms.some((p) =>
      (platformMediaIssues[p] ?? []).some((i) => i.severity === "error"),
    );
  }, [selectedPlatforms, platformMediaIssues]);

  /** Flat list of error messages (used by the Publish/Schedule guards). */
  const blockingErrorMessages = useMemo(() => {
    return selectedPlatforms.flatMap((p) =>
      (platformMediaIssues[p] ?? [])
        .filter((i) => i.severity === "error")
        .map((i) => i.message),
    );
  }, [selectedPlatforms, platformMediaIssues]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const commitTag = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
    const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
    if (!normalized) return;

    const tag = `#${normalized}`;
    setTags((prev) => {
      const exists = prev.some((t0) => t0.toLowerCase() === tag.toLowerCase());
      return exists ? prev : [...prev, tag];
    });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t0) => t0 !== tag));
  };

  const normalizeScheduledAt = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block. Applies to "scheduled" only –
    // a plain draft can still be saved so the user can keep working on
    // other parts of the post and fix the media later.
    // -------------------------------------------------------------------
    if (hasBlockingMediaErrors && status === "scheduled") {
      const msg = blockingErrorMessages.join(" ");
      setError(msg);
      toast.error(msg);
      return;
    }

    // Commit remaining tag draft before saving
    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");

    setLoading(true);
    setError(null);

    try {
      const mediaUrls = getMediaUrls();
      const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);
      const result = await createPostAction({
        content: content.trim(),
        accountIds: selectedAccountIds,
        scheduledAt: normalizedScheduledAt,
        status,
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
        platformMetadata,
      });

      if (result.success) {
        toast.success(t("postCreated"));
        router.push(`/${locale}/posts`);
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
  };

  const handlePublishNow = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Media-policy hard-block (KROK 2): when any selected platform has a
    // media-format/resolution error we refuse to attempt publishing – the
    // platform API would just fail with a cryptic error.
    // -------------------------------------------------------------------
    if (hasBlockingMediaErrors) {
      const msg = blockingErrorMessages.join(" ");
      setError(msg);
      toast.error(msg);
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast.error(t("selectPlatformToPublish"));
      return;
    }

    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");

    setPublishing(true);
    setError(null);

    try {
      const mediaUrls = getMediaUrls();
      const createResult = await createPostAction({
        content: content.trim(),
        accountIds: selectedAccountIds,
        scheduledAt: null,
        status: "draft",
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
        platformMetadata,
      });

      if (!createResult.success || !createResult.data?.id) {
        const msg = createResult.error ?? t("errorSaving");
        setError(msg);
        toast.error(msg);
        return;
      }

      const postId = createResult.data.id as string;
      const publishResult = await publishPost({ postId });

      if (publishResult.success) {
        // Hybridní X režim (Prompt 031-X-COMBO, Krok 4): u manuálního X
        // příspěvek nebyl zveřejněn, jen připraven k ručnímu vyřízení.
        toast.success(hasManualTwitter ? td("markPublishedToast") : t("publishSuccess"));
        router.push(`/${locale}/posts`);
        return;
      }

      const msg = resolvePublishErrorMessage({
        error: publishResult.error,
        errorCode: publishResult.errorCode,
        t,
        ta,
      });
      setError(msg);
      toast.error(msg);
    } catch {
      setError(t("publishFailed"));
      toast.error(t("publishFailed"));
    } finally {
      setPublishing(false);
    }
  };

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
    if (hasBlockingMediaErrors) {
      const msg = blockingErrorMessages.join(" ");
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

      // Commit remaining tag draft before saving
      let finalTags = [...tags];
      if (tagDraft.trim()) {
        const cleaned = tagDraft.trim();
        const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
        const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
        if (normalized) {
          const tag = `#${normalized}`;
          const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
          if (!exists) finalTags = [...finalTags, tag];
        }
      }
      setTagDraft("");

      const mediaUrls = getMediaUrls();
      const result = await createPostAction({
        content: content.trim(),
        accountIds: selectedAccountIds,
        scheduledAt: slotResult.scheduledAt,
        status: "scheduled",
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
        platformMetadata,
      });

      if (result.success) {
        toast.success(t("queuedSuccess", { date: formattedDate }));
        router.push(`/${locale}/posts`);
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

  const charCount = content.length;

  return (
    <div className="relative">
      {/* Background grid & glow effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='black' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-[1200px] space-y-8">
        {/* Header: back + title, left-aligned */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/posts`}
            aria-label={t("title")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{t("newPost")}</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)]">
          {/* Left column - form */}
          <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ===== Card 1: Content & media ===== */}
          <div className="rounded-[20px] border border-slate-200/60 bg-white/70 p-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:backdrop-blur-none">
            <div className="rounded-[14px] border border-black/5 bg-card/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-foreground">{t("sectionContent")}</h2>
              </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content" className="text-sm font-medium text-muted-foreground">
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
              id="content"
              placeholder={t("contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-y bg-white/50 border-slate-200 rounded-xl shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30 dark:bg-black/20 dark:border-white/10 dark:shadow-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span />
              <span className={charCount > 280 ? "text-destructive" : ""}>
                {charCount} {t("characterCount")}
              </span>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">{t("mediaFiles")}</Label>
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
                  const tooLarge = files.some(f => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(t("fileTooLarge"));
                    return;
                  }
                  addMediaFiles(files);
                }
              }}
              className={cn(
                "group relative w-full rounded-[24px] border border-dashed border-slate-200 bg-white/40 p-6 text-left transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
                isDraggingMedia && "border-indigo-500/50 bg-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white dark:bg-white/[0.03]">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("addMedia")}</div>
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
                    className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    {/* Image optimization overlay */}
                    {item.status === "optimizing" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        <span className="text-[10px] font-medium text-purple-200/80">{t("optimizingImage")}</span>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-200/80">{t("uploading")}</span>
                      </div>
                    )}

                    {/* Upload success indicator */}
                    {item.status === "ready" && (
                      <div className="absolute left-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/80">
                        <CheckCircle2 className="h-4 w-4 text-white" />
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
                      >
                        <track kind="captions" />
                      </video>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

            </div>
          </div>

          {/* ===== Card 2: Target accounts ===== */}
          <div className="rounded-[20px] border border-slate-200/60 bg-white/70 p-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:backdrop-blur-none">
            <div className="rounded-[14px] border border-black/5 bg-card/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-foreground">{t("sectionAccounts")}</h2>
              </div>

          {/* Platform selection - account picker (mirrors EditPostDialog) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {t("selectPlatforms")}
            </Label>
            {allAccounts.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-white/40 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <p className="pb-3 text-sm text-muted-foreground">{t("noConnectedAccounts")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/${locale}/accounts`)}
                >
                  {t("connectAccount")}
                </Button>
              </div>
            ) : (
              <TooltipProvider delayDuration={150}>
                {(() => {
                  const groups = allAccounts.reduce<Record<string, AccountInfo[]>>(
                    (acc, a) => {
                      if (!acc[a.platform]) acc[a.platform] = [];
                      acc[a.platform].push(a);
                      return acc;
                    },
                    {},
                  );
                  const loc = typeof locale === "string" ? locale : "cs";
                  const labelFor = (id: string) =>
                    (PLATFORMS.find((p) => p.id === id)?.[
                      loc === "en" ? "labelEn" : loc === "uk" ? "labelUk" : "labelCs"
                    ] as string | undefined) ?? id;
                  return (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {Object.entries(groups).map(([platformId, accounts]) => {
                        const Icon = PlatformIconMap[platformId];
                        const platformColor =
                          {
                            instagram: "text-[#E1306C]",
                            facebook: "text-[#1877F2]",
                            twitter: "text-[#1DA1F2]",
                            linkedin: "text-[#0A66C2]",
                            youtube: "text-[#FF0000]",
                            tiktok: "text-[#010101]",
                          }[platformId] ?? "text-muted-foreground";
                        const platformLabel = labelFor(platformId);
                        return (
                          <div
                            key={platformId}
                            className={cn(
                              "rounded-[20px] border bg-white/[0.04] p-3 transition-all duration-200",
                              accounts.some((a) => selectedAccountIds.includes(a.id))
                                ? "border-indigo-500/30"
                                : "border-white/10",
                            )}
                          >
                            <div className="flex items-center gap-2 pb-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
                                {Icon && <Icon className={cn("h-4 w-4", platformColor)} />}
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">
                                {platformLabel}
                              </span>
                              {/* Media-policy status badge (sdílená komponenta, KROK 3). */}
                              <PlatformMediaBadge
                                label={platformLabel}
                                issues={platformMediaIssues[platformId] ?? []}
                              />
                              {/* KROK 5: Twitter auto-credits indicator */}
                              {platformId === "twitter" && (
                                <>
                                  <span className={cn(
                                    "ml-auto text-[10px]",
                                    twitterAutoCredits > 0 ? "text-muted-foreground/50" : "text-destructive/40"
                                  )}>
                                    ⚡{twitterAutoCredits}
                                  </span>
                                  {/* KROK 2 (Prompt 057): direct X auto-publish needs credits – offer a buy link when exhausted */}
                                  {twitterAutoCredits <= 0 && (
                                    <Link
                                      href={`/${locale}/settings/billing?reason=twitter_credits`}
                                      onClick={() =>
                                        toast.info(ta("xConnect.noCredits"), {
                                          duration: 7000,
                                          action: {
                                            label: ta("xConnect.gotIt"),
                                            onClick: () => toast.dismiss(),
                                          },
                                        })
                                      }
                                      className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500 underline underline-offset-2 transition-colors hover:bg-indigo-500/20 dark:text-indigo-400"
                                    >
                                      {ta("xConnect.buyCredits")}
                                    </Link>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex flex-row flex-wrap gap-1.5">
                              {accounts.map((account) => {
                                const isSelected = selectedAccountIds.includes(account.id);
                                // KROK 2 (Prompt 057): direct (auto-publish) X accounts are blocked
                                // when auto-credits are exhausted – the user must pick the manual
                                // (free reminder) mode instead, or upgrade in Billing.
                                const isTwitterDirectBlocked =
                                  platformId === "twitter" &&
                                  account.publishing_type === "direct" &&
                                  twitterAutoCredits <= 0;
                                const requirementMet = isPlatformMediaRequirementMet(platformId);
                                const isPlatformDisabled = !requirementMet || isTwitterDirectBlocked;
                                const tooltipMessage = isTwitterDirectBlocked
                                  ? ta("xConnect.noCredits")
                                  : isPlatformDisabled
                                    ? getPlatformRequirementTooltip(platformId)
                                    : null;
                                const chip = (
                                  <motion.button
                                    key={account.id}
                                    type="button"
                                    layoutId={`account-chip-${account.id}`}
                                    disabled={isPlatformDisabled}
                                    onClick={() => toggleAccount(account.id)}
                                    transition={{ layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all duration-200",
                                      isSelected
                                        ? "border-indigo-500/40 dark:border-indigo-500/60 bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300"
                                        : "border-white/10 bg-white/[0.04] text-slate-700 dark:text-muted-foreground hover:bg-white/[0.08] hover:border-white/20",
                                      isPlatformDisabled && "opacity-40 cursor-not-allowed",
                                    )}
                                  >
                                    {account.avatar_url ? (
                                      <img
                                        src={proxyImageUrl(account.avatar_url)}
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
                                  </motion.button>
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

          {/* TikTok privacy & video settings (mirrors EditPostDialog) */}
          <AnimatePresence>
            {hasTikTokIntent && (
              <motion.div
                key="tiktok-privacy"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-3 rounded-[20px] border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t("tiktokPrivacyTitle")}
                </Label>
                <p className="text-xs text-muted-foreground/60">
                  {t("tiktokPrivacyHint")}
                </p>
              </div>

              {/* Creator account (Direct Post UX: the account receiving the
                  video must be identified before publishing). */}
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
              </div>

              {/* Privacy – no default value, options from creator_info only */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t("tiktokPrivacySelectLabel")}
                </Label>
                <Select
                  value={effectiveTikTokPrivacyLevel ?? undefined}
                  onValueChange={(value) =>
                    setTikTokPrivacyLevel(value as TikTokPrivacyLevel)
                  }
                >
                  <SelectTrigger className="w-full rounded-[14px]">
                    <SelectValue placeholder={t("tiktokPrivacyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTikTokPrivacyLevels.map((option) => {
                      const label =
                        option === "PUBLIC_TO_EVERYONE"
                          ? t("tiktokPrivacyPublic")
                          : option === "MUTUAL_FOLLOW_FRIENDS"
                            ? t("tiktokPrivacyFriends")
                            : option === "FOLLOWER_OF_CREATOR"
                              ? t("tiktokPrivacyFollowers")
                              : t("tiktokPrivacyPrivate");
                      const disabled =
                        option === "SELF_ONLY" && tiktokBrandedBlocksPrivate;
                      return (
                        <SelectItem
                          key={option}
                          value={option}
                          disabled={disabled}
                        >
                          {label}
                          {disabled && (
                            <span className="ml-2 text-xs opacity-70">
                              {t("tiktokBrandedPrivateHint")}
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                    {allowedTikTokPrivacyLevels.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground/60">
                        {t("tiktokCreatorInfoLoading")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {tiktokBrandedBlocksPrivate && effectiveTikTokPrivacyLevel === null && (
                  <p className="text-xs text-amber-500">
                    {t("tiktokBrandedPrivateHint")}
                  </p>
                )}
              </div>

              {isTikTokPrivateOnly && (
                <div className="flex items-start gap-3 rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t("tiktokPrivateOnlyNotice")}</span>
                </div>
              )}

              {/* Max video duration (creator_info.max_video_post_duration_sec) */}
              {tiktokMaxDurationSec != null && (
                <p className="text-xs text-muted-foreground/70">
                  {t("tiktokMaxDuration", { max: String(tiktokMaxDurationSec) })}
                </p>
              )}
              {tiktokDurationExceeded && (
                <p className="text-xs text-red-500">
                  {t("tiktokVideoTooLong", { max: String(tiktokMaxDurationSec) })}
                </p>
              )}

              {/* Interaction toggles – none checked by default; disabled +
                  greyed when creator_info reports the interaction is off. */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t("tiktokInteractionTitle")}
                </Label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-indigo-500"
                    checked={tiktokAllowComment}
                    disabled={!!tiktokCreatorInfo?.commentDisabled}
                    onChange={(e) => setTikTokAllowComment(e.target.checked)}
                  />
                  {t("tiktokToggleComments")}
                  {tiktokCreatorInfo?.commentDisabled && (
                    <span className="text-xs text-muted-foreground/50">
                      {t("tiktokInteractionUnavailable")}
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-indigo-500"
                    checked={tiktokAllowDuet}
                    disabled={!!tiktokCreatorInfo?.duetDisabled}
                    onChange={(e) => setTikTokAllowDuet(e.target.checked)}
                  />
                  {t("tiktokToggleDuet")}
                  {tiktokCreatorInfo?.duetDisabled && (
                    <span className="text-xs text-muted-foreground/50">
                      {t("tiktokInteractionUnavailable")}
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-indigo-500"
                    checked={tiktokAllowStitch}
                    disabled={!!tiktokCreatorInfo?.stitchDisabled}
                    onChange={(e) => setTikTokAllowStitch(e.target.checked)}
                  />
                  {t("tiktokToggleStitch")}
                  {tiktokCreatorInfo?.stitchDisabled && (
                    <span className="text-xs text-muted-foreground/50">
                      {t("tiktokInteractionUnavailable")}
                    </span>
                  )}
                </label>
              </div>

              {/* Commercial content disclosure – off by default */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-indigo-500"
                    checked={tiktokCommercialEnabled}
                    onChange={(e) => {
                      setTikTokCommercialEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setTikTokBrandContent(false);
                        setTikTokBrandOrganic(false);
                      }
                    }}
                  />
                  <span className="font-medium">{t("tiktokCommercialTitle")}</span>
                </label>
                {tiktokCommercialEnabled && (
                  <div className="space-y-1.5 pl-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-indigo-500"
                        checked={tiktokBrandOrganic}
                        onChange={(e) => setTikTokBrandOrganic(e.target.checked)}
                      />
                      {t("tiktokCommercialYourBrand")}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-indigo-500"
                        checked={tiktokBrandContent}
                        disabled={tiktokBrandedUnavailable}
                        onChange={(e) => setTikTokBrandContent(e.target.checked)}
                      />
                      {t("tiktokCommercialBrandedContent")}
                      {tiktokBrandedUnavailable && (
                        <span className="text-xs text-muted-foreground/60">
                          {t("tiktokBrandedUnavailableHint")}
                        </span>
                      )}
                    </label>
                    {tiktokCommercialMissing && (
                      <p className="text-xs text-red-500">
                        {t("tiktokDisclosureRequired")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Music Usage Confirmation / terms declaration */}
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded accent-indigo-500"
                    checked={tiktokMusicConsent}
                    onChange={(e) => setTikTokMusicConsent(e.target.checked)}
                  />
                  <span>
                    {t("tiktokMusicUsageIntro")}{" "}
                    {tiktokBrandContent && (
                      <>
                        <a
                          href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {t("tiktokBrandedPolicyLinkLabel")}
                        </a>
                        {" "}{t("tiktokMusicUsageAnd")}{" "}
                      </>
                    )}
                    <a
                      href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {t("tiktokMusicUsageLinkLabel")}
                    </a>
                    {"."}
                  </span>
                </label>
              </div>

              {/* Processing note after submission */}
              <p className="text-xs text-muted-foreground/60">
                {t("tiktokProcessingNote")}
              </p>
              </motion.div>
            )}
          </AnimatePresence>

            </div>
          </div>

          {/* ===== Card 3: Metadata ===== */}
          <div className="rounded-[20px] border border-slate-200/60 bg-white/70 p-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:backdrop-blur-none">
            <div className="rounded-[14px] border border-black/5 bg-card/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                  <Tags className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-foreground">{t("sectionMeta")}</h2>
              </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Lokace</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="h-12 rounded-xl border-slate-200 bg-white/50 pl-10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30 dark:border-white/10 dark:bg-black/20 dark:shadow-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{t("addTags")}</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-gradient-to-br from-indigo-600/15 to-purple-600/15 px-3 py-1 text-sm text-indigo-700 shadow-sm dark:border-white/10 dark:from-indigo-600/30 dark:to-purple-600/30 dark:text-indigo-100 dark:shadow-[0_0_16px_rgba(99,102,241,0.15)]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                      aria-label="Remove tag"
                    >
                      <X className="h-3.5 w-3.5" />
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
              className="h-12 rounded-xl border-slate-200 bg-white/50 shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30 dark:border-white/10 dark:bg-black/20 dark:shadow-none"
            />
          </div>

          {/* Internal organization tags (Nastavení → Štítky) – interní, neodesílá se na sítě */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
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

            </div>
          </div>

          {/* ===== Publish bar: schedule + actions ===== */}
          <div className="rounded-[20px] border border-slate-200/60 bg-white/70 p-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:backdrop-blur-none">
            <div className="rounded-[14px] border border-black/5 bg-card/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-foreground">{t("sectionSchedule")}</h2>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/${typeof locale === "string" ? locale : "cs"}/settings/preferences`}
                        aria-label={t("editSchedule")}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-indigo-500/10 hover:text-indigo-600 dark:text-muted-foreground dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{t("editSchedule")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledAt" className="text-sm font-medium text-muted-foreground">
              {t("scheduledAt")}
            </Label>
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              locale={typeof locale === "string" ? locale : "en"}
            />
            <ScheduleQuickSlots
              value={scheduledAt}
              onSelect={setScheduledAt}
              locale={typeof locale === "string" ? locale : "en"}
              labels={{
                queue: t("quickSlotQueue"),
                today18: t("quickSlotToday18"),
                tomorrow9: t("quickSlotTomorrow9"),
                queueLoading: t("quickSlotQueueLoading"),
                wordToday: t("quickSlotWordToday"),
                wordTomorrow: t("quickSlotWordTomorrow"),
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-3">
            {/* Media-policy warning/error banner (any selected platform).
                Wrapped in a reserved slot so the action row below does not jump
                when the banner appears/disappears (Bug #1 KROK 1). */}
            <div className={cn("min-h-[44px]", selectedPlatforms.length === 0 && "min-h-0")}>
            {
              selectedPlatforms.some((p) => (platformMediaIssues[p] ?? []).length > 0) && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm" role="alert">
                  {selectedPlatforms.map((p) => {
                    const issues = platformMediaIssues[p] ?? [];
                    if (issues.length === 0) return null;
                    const hasError = issues.some((i) => i.severity === "error");
                    return (
                      <div
                        key={p}
                        className={cn(
                          "flex items-start gap-3",
                          hasError
                            ? "text-rose-700 dark:text-rose-200/90"
                            : "text-amber-800 dark:text-amber-200/90",
                        )}
                      >
                        <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", hasError ? "text-rose-500 dark:text-rose-400" : "text-amber-500 dark:text-amber-400")} />
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            {(PLATFORMS.find((x) => x.id === p)?.[typeof locale === "string" && locale === "en" ? "labelEn" : typeof locale === "string" && locale === "uk" ? "labelUk" : "labelCs"] as string | undefined) ?? p}
                          </p>
                          {issues.map((i) => (
                            <p key={i.code} className="text-xs">
                              {mediaIssueText(t, i)}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                onClick={() => handleSubmit("draft")}
                disabled={!content.trim() || loading || publishing || hasUploading()}
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] transition-all active:scale-[0.98]"
              >
                {(loading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(loading || hasUploading()) ? t("saving") : t("saveDraft")}
              </Button>
              <Button
                onClick={handleQueueToSchedule}
                disabled={!content.trim() || selectedAccountIds.length === 0 || loading || publishing || queuing || hasUploading() || hasBlockingMediaErrors || tiktokPublishBlocked}
                title={hasBlockingMediaErrors ? t("mediaPolicyBlockTitle") : tiktokBlockReason ?? undefined}
                variant="outline"
                className="rounded-xl border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all active:scale-[0.98]"
              >
                {queuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-2 h-4 w-4" />}
                {queuing ? t("queueLoading") : t("addToQueue")}
              </Button>
              <Button
                onClick={() => handleSubmit("scheduled")}
                disabled={!content.trim() || !scheduledAt || loading || publishing || hasUploading() || hasBlockingMediaErrors || tiktokPublishBlocked}
                title={hasBlockingMediaErrors ? t("mediaPolicyBlockTitle") : tiktokBlockReason ?? undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-[0.98]"
              >
                {(loading || hasUploading()) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                {(loading || hasUploading()) ? t("saving") : t("schedule")}
              </Button>
              <Button
                onClick={handlePublishNow}
                disabled={!content.trim() || selectedAccountIds.length === 0 || loading || publishing || hasUploading() || hasBlockingMediaErrors || tiktokPublishBlocked}
                title={hasBlockingMediaErrors ? t("mediaPolicyBlockTitle") : tiktokBlockReason ?? undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-[0.98]"
              >
                {(publishing || loading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(publishing || loading || hasUploading()) ? t("saving") : (hasManualTwitter ? t("prepareToDo") : t("publishNow"))}
              </Button>
            </div>
            {/* Explain why buttons might be disabled when only internal tags were set. */}
            {(!content.trim() || selectedAccountIds.length === 0) && (
              <p className="text-xs text-muted-foreground/60">
                {t("newPostHint")}
              </p>
            )}
          </div>
            </div>
          </div>
        </div>

        {/* Right column - sticky live preview on desktop, below form on mobile */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-0 lg:max-h-[70vh] lg:overflow-y-auto">
            <PostPreview
              content={content}
              media={previewMedia}
              facebookProfile={facebookProfile}
              instagramProfile={instagramProfile}
              youtubeProfile={youtubeProfile}
              linkedinProfile={linkedinProfile}
              tiktokProfile={tiktokProfile}
              twitterProfile={twitterProfile}
              availablePlatforms={availablePreviewPlatforms}
              location={location}
              labels={previewLabels}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
