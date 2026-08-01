"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/image-proxy";

/**
 * Props shared between the preview and the form.
 *
 * The preview intentionally does NOT import the media upload hook – it
 * receives the already-prepared list of preview URLs (object URLs for
 * in-progress uploads, public URLs for finished uploads). This keeps the
 * component pure and re-renders are driven purely by prop changes.
 */
export interface PostPreviewMedia {
  /** URL ready for <img>/<video> src – either object URL or remote URL. */
  previewUrl: string;
  kind: "image" | "video";
}

export interface PostPreviewProfile {
  /** Display name shown as the post author (FB page name / IG username). */
  displayName: string;
  /** Avatar URL. Falls back to a generated initial-letter avatar when empty. */
  avatarUrl?: string | null;
}

interface PostPreviewProps {
  /** Current post text (caption / message). */
  content: string;
  /** Media items to render inside the preview. */
  media: PostPreviewMedia[];
  /** Facebook profile (page). When null, FB tab shows a placeholder name. */
  facebookProfile?: PostPreviewProfile | null;
  /** Instagram profile. When null, IG tab shows a placeholder name. */
  instagramProfile?: PostPreviewProfile | null;
  /** YouTube channel profile. When null, YT tab shows a placeholder name. */
  youtubeProfile?: PostPreviewProfile | null;
  /** LinkedIn profile. When null, LinkedIn tab shows a placeholder name. */
  linkedinProfile?: PostPreviewProfile | null;
  /** TikTok profile. When null, TikTok tab shows a placeholder name. */
  tiktokProfile?: PostPreviewProfile | null;
  /** Twitter/X profile. When null, Twitter tab shows a placeholder name. */
  twitterProfile?: PostPreviewProfile | null;
  /**
   * Which preview tabs to render, in display order. The list is owned by the
   * parent (typically EditPostDialog) so we only ever show a tab when the
   * post actually targets that platform – e.g. a YouTube tab is rendered
   * only when the post has YouTube in its target platforms.
   *
   * Defaults to ["facebook", "instagram"] when omitted so existing callers
   * keep working unchanged.
   */
  availablePlatforms?: Platform[];
  /** Optional location string (shown on Facebook preview). */
  location?: string;
  /** Labels for the preview UI (tabs, captions, empty states). */
  labels: {
    facebookTab: string;
    instagramTab: string;
    /** Label for the optional YouTube tab (only required when "youtube" is in availablePlatforms). */
    youtubeTab?: string;
    /** Label for the optional LinkedIn tab (only required when "linkedin" is in availablePlatforms). */
    linkedinTab?: string;
    /** Label for the optional TikTok tab (only required when "tiktok" is in availablePlatforms). */
    tiktokTab?: string;
    /** Label for the optional Twitter/X tab (only required when "twitter" is in availablePlatforms). */
    twitterTab?: string;
    previewTitle: string;
    noMedia: string;
    /** Optional TikTok-specific empty-state copy. */
    tiktokVideoRequired?: string;
    placeholderName: string;
    captionHint: string;
    /** Localized strings for platform-specific UI labels. */
    now?: string;
    actionLike?: string;
    actionComment?: string;
    actionShare?: string;
    actionRepost?: string;
    actionSend?: string;
    actionSubscribe?: string;
    actionDislike?: string;
    actionBookmark?: string;
    professionalDegree?: string;
    likesCount?: string;
    subscribersCount?: string;
    viewsNow?: string;
    commentShareStats?: string;
    commentStats?: string;
    originalSound?: string;
    repostsLabel?: string;
    viewsLabel?: string;
    twitterSource?: string;
    repliesLabel?: string;
    mediaAlt?: string;
  };
}

type Platform = "facebook" | "instagram" | "youtube" | "linkedin" | "tiktok" | "twitter";

const DEFAULT_AVAILABLE_PLATFORMS: Platform[] = ["facebook", "instagram"];

/**
 * Per-platform brand accents used to colour the active tab indicator.
 * Centralised here so all tabs use a single source of truth.
 */
const PLATFORM_ACCENTS: Record<Platform, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  tiktok: "#00f2fe", // TikTok cyan
  twitter: "#1d9bf0", // X/Twitter blue
};

/**
 * PostPreview – real-time mobile-feed simulation of how a post will look
 * once published to any of its target platforms.
 *
 * Design decisions:
 *  - The OUTER container uses Postio glassmorphism (rounded-[20px],
 *    backdrop-blur, white/5 border) so it visually belongs to the app.
 *  - The INNER phone mock is a faithful reproduction of each platform's
 *    mobile feed card: brand colors, layout, iconography.
 *  - Switching between FB / IG / YT is done with a segmented control
 *    (Tabs). The active tab drives a `platform` state; the sub-renderers
 *    (FacebookPreview / InstagramPreview / YouTubePreview) are pure
 *    functions of props.
 *  - The list of available tabs is owned by the parent (typically
 *    EditPostDialog) so we only show a tab when the post actually targets
 *    that platform. Adding a new platform = adding a sub-renderer and
 *    appending its id to `availablePlatforms`.
 *  - No network calls, no hooks beyond useState/useEffect – everything is
 *    driven by props so the parent (EditPostDialog) controls re-renders.
 */
export function PostPreview({
  content,
  media,
  facebookProfile,
  instagramProfile,
  youtubeProfile,
  linkedinProfile,
  tiktokProfile,
  twitterProfile,
  availablePlatforms,
  location,
  labels,
}: PostPreviewProps) {
  // Fall back to the default platform list when the parent does not
  // explicitly opt in – preserves backward compatibility for callers that
  // haven't migrated to the dynamic list yet.
  const tabs = availablePlatforms ?? DEFAULT_AVAILABLE_PLATFORMS;
  const firstTab = tabs[0] ?? "facebook";

  const [platform, setPlatform] = useState<Platform>(firstTab);

  // If the parent shrinks the list of available platforms (e.g. user
  // removes a target platform) we may end up with `platform` pointing at a
  // tab that no longer exists. Clamp the active platform to the available
  // list at render time – avoids a redundant re-render and the
  // "setState in effect" anti-pattern flagged by react-hooks/set-state-in-effect.
  const effectivePlatform: Platform = tabs.includes(platform) ? platform : firstTab;

  // Resolve the profile for the currently active platform once per render.
  const activeProfile = useMemo(() => {
    if (effectivePlatform === "facebook") {
      return facebookProfile ?? { displayName: labels.placeholderName };
    }
    if (effectivePlatform === "youtube") {
      return youtubeProfile ?? { displayName: labels.placeholderName };
    }
    if (effectivePlatform === "linkedin") {
      return linkedinProfile ?? { displayName: labels.placeholderName };
    }
    if (effectivePlatform === "tiktok") {
      return tiktokProfile ?? { displayName: labels.placeholderName };
    }
    if (effectivePlatform === "twitter") {
      return twitterProfile ?? { displayName: labels.placeholderName };
    }
    return instagramProfile ?? { displayName: labels.placeholderName };
  }, [
    effectivePlatform,
    facebookProfile,
    instagramProfile,
    youtubeProfile,
    linkedinProfile,
    tiktokProfile,
    twitterProfile,
    labels.placeholderName,
  ]);

  // Build the tab descriptors (id + label + accent) for the segmented
  // control. The label comes from `labels` so the UI stays translatable.
  const tabDescriptors = useMemo(
    () =>
      tabs.map((id) => ({
        id,
        accent: PLATFORM_ACCENTS[id],
        label:
          id === "facebook"
            ? labels.facebookTab
            : id === "youtube"
              ? labels.youtubeTab ?? "YouTube"
              : id === "linkedin"
                ? labels.linkedinTab ?? "LinkedIn"
                : id === "tiktok"
                  ? labels.tiktokTab ?? "TikTok"
                  : id === "twitter"
                    ? labels.twitterTab ?? "X"
                    : labels.instagramTab,
      })),
    [
      tabs,
      labels.facebookTab,
      labels.instagramTab,
      labels.youtubeTab,
      labels.linkedinTab,
      labels.tiktokTab,
      labels.twitterTab,
    ],
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[20px] border border-white/5 bg-card/40 p-4 backdrop-blur-md">
      {/* Header: title + segmented control */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground/80">
          {labels.previewTitle}
        </h3>
        {tabDescriptors.length > 0 ? (
          <PlatformTabs
            value={effectivePlatform}
            onChange={setPlatform}
            tabs={tabDescriptors}
          />
        ) : null}
      </div>

      {/* Phone mock – constrained height to mimic a mobile feed card */}
      <div className="relative flex-1 overflow-hidden rounded-[20px] border border-white/5 bg-black min-h-0">
        {effectivePlatform === "facebook" ? (
          <FacebookPreview
            content={content}
            media={media}
            profile={activeProfile}
            location={location}
            labels={labels}
          />
        ) : effectivePlatform === "youtube" ? (
          <YouTubePreview
            content={content}
            media={media}
            profile={activeProfile}
            labels={labels}
          />
        ) : effectivePlatform === "linkedin" ? (
          <LinkedInPreview
            content={content}
            media={media}
            profile={activeProfile}
            labels={labels}
          />
        ) : effectivePlatform === "tiktok" ? (
          <TikTokPreview
            content={content}
            media={media}
            profile={activeProfile}
            labels={labels}
          />
        ) : effectivePlatform === "twitter" ? (
          <TwitterPreview
            content={content}
            media={media}
            profile={activeProfile}
            labels={labels}
          />
        ) : (
          <InstagramPreview
            content={content}
            media={media}
            profile={activeProfile}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// TikTok Preview
// -------------------------------------------------------------------------

function TikTokPreview({
  content,
  media,
  profile,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  labels: PostPreviewProps["labels"];
}) {
  // TikTok only supports video
  const videoMedia = media.find((m) => m.kind === "video") ?? media[0];

  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* Feed card – same scrollable pattern as Facebook/IG */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 postio-scrollbar">
        <article className="relative h-full">
          {/* Background/Video Area – fills full height with object-cover (9:16 TikTok style) */}
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
                >
                  <track kind="captions" />
                </video>
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
                  <span className="mb-2 block text-4xl">🎵</span>
                  <p className="text-sm font-medium">
                    {labels.tiktokVideoRequired ?? labels.noMedia ?? "TikTok requires video"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Overlay gradient for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Content overlay – pushed to bottom */}
          <div className="relative z-10 flex flex-col justify-end min-h-full p-4 pb-6">
            <div className="flex flex-row items-end justify-between">
              {/* Left column: Author & Description */}
              <div className="flex-1 pr-12 min-w-0">
                <div className="mb-2 font-semibold text-[15px] hover:underline cursor-pointer inline-block">
                  @{profile.displayName.replace(/\s+/g, "").toLowerCase() || "tiktok_creator"}
                </div>

                {content ? (
                  <div className="text-sm text-white/90 font-normal leading-[1.3] line-clamp-3 mb-2">
                    {content}
                  </div>
                ) : null}

                {/* Original Sound */}
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <svg className="w-4 h-4 animate-[spin_3s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                  <span className="truncate">{`${labels.originalSound ?? "původní zvuk"} - ${profile.displayName}`}</span>
                </div>
              </div>

              {/* Right column: Action buttons */}
              <div className="flex flex-col items-center justify-end gap-5">
                {/* Avatar + Follow */}
                <div className="relative mb-2">
                  <Avatar
                    url={profile.avatarUrl}
                    name={profile.displayName}
                    size={48}
                    ring="rgba(255, 255, 255, 0.9)"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#EA4359] w-5 h-5 flex items-center justify-center text-white cursor-pointer shadow-sm">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                  </div>
                </div>

                {/* Like */}
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                  <span className="text-xs font-semibold">12.4K</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 20.01c.01.27-.1.52-.29.71-.2.2-.45.3-.71.29l-3.32-.23c-1.63.85-3.56 1.3-5.67 1.3-6.63 0-12-4.93-12-11C0 4.93 5.37 0 12 0s12 4.93 12 11c0 3.3-1.63 6.27-4.18 8.19l2.17 1.05v-.23z"></path></svg>
                  <span className="text-xs font-semibold">134</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>
                  <span className="text-xs font-semibold">456</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "scale(-1,1)" }}><path d="M21 11.5L9 4v5C4 9 2 13.5 2 19c2.5-3.5 6-4.5 7-4.5v5l12-7.5z"></path></svg>
                  <span className="text-xs font-semibold">12</span>
                </div>

                {/* Spinning Record */}
                <div className="w-[40px] h-[40px] rounded-full bg-[#1e1e1e] flex items-center justify-center animate-[spin_4s_linear_infinite] mt-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  <Avatar
                    url={profile.avatarUrl}
                    name={profile.displayName}
                    size={24}
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Twitter (X) Preview
// ---------------------------------------------------------------------

function TwitterPreview({
  content,
  media,
  profile,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  labels: PostPreviewProps["labels"];
}) {
  const handle = `@${(profile.displayName ?? "user").replace(/\s+/g, "").toLowerCase()}`;

  return (
    <div className="flex h-full flex-col bg-black text-[#e7e9ea]">
      {/* Tweet card – scrollable, faithful to X mobile feed */}
      <div className="flex-1 overflow-y-auto postio-scrollbar">
        <article className="flex flex-col">
          {/* ── 1. Header: avatar + name/handle + time + menu ── */}
          <header className="flex items-start gap-2.5 px-4 pt-3 pb-1">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[15px] font-bold leading-5 text-[#e7e9ea]">
                  {profile.displayName}
                </span>
                {/* Verified badge */}
                <svg
                  className="h-5 w-5 flex-shrink-0 text-[#1d9bf0]"
                  viewBox="0 0 22 22"
                  fill="currentColor"
                >
                  <path d="M20.396 11c-.063-.214-.188-.57-.312-.813.5-.688.656-1.542.375-2.344-.281-.781-.906-1.375-1.656-1.614-.25-.083-.531-.125-.844-.125h-.271c-.135-.49-.324-1.016-.583-1.51-.614-1.177-1.615-2.135-2.937-2.682-.656-.271-1.354-.416-2.083-.416-.729 0-1.427.145-2.083.416-1.322.547-2.323 1.505-2.937 2.682-.26.494-.448 1.02-.583 1.51h-.271c-.313 0-.594.042-.844.125-.75.239-1.375.833-1.656 1.614-.281.802-.125 1.656.375 2.344-.124.244-.249.599-.312.813-.374 1.505-.124 3.083.791 4.385.906 1.302 2.333 2.12 3.937 2.26.104.01.208.01.312.01.625 0 1.375-.083 2.083-.427 1.385.672 2.979.531 4.208-.26 1.125-.739 1.906-1.927 2.177-3.271.083-.344.083-.708.083-1.042 0-.333 0-.666-.083-1.01z" />
                </svg>
              </div>
              <p className="truncate text-[15px] leading-5 text-[#71767b]">
                {handle}
              </p>
            </div>
            {/* … menu */}
            <button
              type="button"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#71767b] transition-colors hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]"
              tabIndex={-1}
              aria-hidden
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
            </button>
          </header>

          {/* ── 2. Timestamp ── */}
          <div className="px-4 pb-1 text-[15px] text-[#71767b]">
            {new Intl.DateTimeFormat("cs", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
              .format(new Date())
              .replace("at", "·")}
            <span className="mx-1">·</span>
            <span>{labels.twitterSource ?? "X Web App"}</span>
          </div>

          {/* ── 3. Tweet text ── */}
          <div className="px-4">
            {content.trim() ? (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-normal text-[#e7e9ea]">
                {content}
              </p>
            ) : (
              <p className="text-[15px] italic text-[#71767b]">
                {labels.captionHint}
              </p>
            )}
          </div>

          {/* ── 4. Media ── */}
          <div className="mx-4 mt-3 overflow-hidden rounded-2xl border border-[#2f3336] bg-black">
            <MediaArea media={media} aspect="feed" labels={labels} />
          </div>

          {/* ── 5. Stats row (replies · reposts · likes) ── */}
          <div className="mx-4 mt-2 flex items-center gap-1 text-[14px] text-[#71767b]">
            <span className="font-medium text-[#e7e9ea]">0</span>
            <span className="mr-2.5">{labels.repostsLabel ?? "Reposts"}</span>
            <span className="font-medium text-[#e7e9ea]">0</span>
            <span className="mr-2.5">{labels.actionLike ?? "Likes"}</span>
            <span className="font-medium text-[#e7e9ea">0</span>
            <span>{labels.viewsLabel ?? "Views"}</span>
          </div>

          {/* ── 6. Divider ── */}
          <div className="mx-4 my-1 border-t border-[#2f3336]" />

          {/* ── 7. Interaction toolbar ── */}
          <div className="flex items-center justify-between px-4 py-0.5 max-w-[470px]">
            {/* Reply */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M1.751 10.623a4.76 4.76 0 014.1-4.636 26.05 26.05 0 013.588-.22h.374a.23.23 0 01.187.23v1.605c0 .715.065 1.417.552 1.944.11.12.251.19.404.19.29 0 .56-.196.56-.562V5.997c0-.563-.244-.83-.55-1.076-.364-.295-.906-.42-1.498-.42-2.63 0-5.033.548-6.603 1.801C1.196 7.6.34 9.275.002 11.073a.735.735 0 00.73.851h.251a.7.7 0 00.702-.647c.029-.22.045-.445.066-.654z" fill="currentColor" />
                  <path d="M5.137 13.944v-1.596a.23.23 0 01.23-.23h.046c.793 0 1.324-1.025.837-2.016-.487-.991-1.563-1.074-1.912-1.214-.188-.077-.201-.198-.201-.364V6.426c0-.166.013-.288.201-.365.35-.14 1.426-.223 1.912-1.214.487-.991-.044-2.015-.837-2.015h-.046a.23.23 0 01-.23-.23V1.01c0-.166.013-.288.201-.364C6.022.35 7.858 0 9.878 0c3.22 0 5.683.997 7.196 2.542 1.347 1.376 1.982 3.207 1.98 5.182v.008c0 1.973-.635 3.8-1.98 5.173-1.513 1.54-3.976 2.534-7.197 2.534l-.827.002c-.576.22-1.095.524-1.541.89a.674.674 0 01-.801.053c-.328-.22-.57-.653-.57-1.15l-.001-.559-.061-.054a4.076 4.076 0 01-1.8-2.848c-.083-.511-.069-.955.001-1.266z" fill="currentColor" />
                </svg>
              }
              label="0"
              hoverColor="#1d9bf0"
            />

            {/* Repost */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4.5 3.75v10.5a1.75 1.75 0 001.75 1.75h3.5v2.25c0 .691.462 1.018.79.95.083-.017.152-.046.216-.1l4.25-3.672a.5.5 0 00.244-.428v-2.046A1.75 1.75 0 0013.5 10.5h-2.5a1.75 1.75 0 00-1.75 1.75v.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19.5 20.25V9.75a1.75 1.75 0 00-1.75-1.75h-3.5V5.75c0-.691-.462-1.018-.79-.95a.498.498 0 00-.216.1L9.244 8.572a.5.5 0 00-.244.428v.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              label="0"
              hoverColor="#00ba7c"
            />

            {/* Like */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.263.368-.263-.368c-1.211-1.65-2.668-2.22-3.89-2.16-1.04.047-2.08.566-2.85 1.652-.755 1.067-.994 2.443-.536 3.79.453 1.327 1.353 2.625 2.47 3.803 1.1 1.16 2.4 2.123 3.79 2.853 1.39-.73 2.69-1.693 3.79-2.853 1.117-1.178 2.017-2.476 2.47-3.803.458-1.347.219-2.723-.536-3.79-.77-1.086-1.81-1.605-2.85-1.652z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              }
              label="0"
              hoverColor="#f91880"
            />

            {/* Views */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.75 0V9h2v12h-2z" fill="currentColor" />
                </svg>
              }
              label="0"
              hoverColor="#1d9bf0"
            />

            {/* Bookmark */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4.5A2.5 2.5 0 016.5 2h11A2.5 2.5 0 0120 4.5v17.07a.5.5 0 01-.77.42l-6.23-3.89a.5.5 0 00-.5 0l-6.23 3.89a.5.5 0 01-.77-.42V4.5z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              }
              hoverColor="#1d9bf0"
            />

            {/* Share */}
            <XActionButton
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M17.53 7.47l-5-5a.749.749 0 00-1.06 0l-5 5a.749.749 0 101.06 1.06l3.72-3.72V15a.75.75 0 001.5 0V4.81l3.72 3.72a.749.749 0 101.06-1.06z" fill="currentColor" />
                  <path d="M19.75 17.25v3.5a1.75 1.75 0 01-1.75 1.75H6a1.75 1.75 0 01-1.75-1.75v-3.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              }
              hoverColor="#1d9bf0"
            />
          </div>

          {/* ── 8. Bottom divider ── */}
          <div className="mx-4 mt-1 border-t border-[#2f3336]" />
        </article>
      </div>
    </div>
  );
}

/**
 * Single action button in the X/Twitter toolbar.
 * Circular hover background with branded hover color, label optional.
 */
function XActionButton({
  icon,
  label,
  hoverColor,
}: {
  icon: React.ReactNode;
  label?: string;
  hoverColor: string;
}) {
  return (
    <div
      className="group flex items-center gap-0.5 text-[13px] text-[#71767b] transition-colors duration-200"
      style={
        { "--hover-color": hoverColor } as React.CSSProperties
      }
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--hover-color)_10%,transparent)]">
        <div className="transition-colors duration-200 group-hover:text-[var(--hover-color)]">
          {icon}
        </div>
      </div>
      {label !== undefined && <span>{label}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------
// Segmented control (Tabs)
// ---------------------------------------------------------------------

function PlatformTabs({
  value,
  onChange,
  tabs,
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  tabs: { id: Platform; label: string; accent: string }[];
}) {
  return (
    <div
      role="tablist"
      aria-label="Platform preview"
      className="inline-flex flex-wrap justify-end gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5"
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          active={value === tab.id}
          onClick={() => onChange(tab.id)}
          accent={tab.accent}
          label={tab.label}
        />
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  accent,
  label,
}: {
  active: boolean;
  onClick: () => void;
  accent: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative rounded-full px-3 py-1 text-xs font-medium transition-all",
        active ? "text-white" : "text-muted-foreground hover:text-foreground",
      )}
      style={active ? { backgroundColor: `${accent}22`, color: accent } : undefined}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------
// Avatar – shared, with graceful fallback to an initial-letter bubble.
// ---------------------------------------------------------------------

function Avatar({
  url,
  name,
  size = 40,
  ring,
}: {
  url?: string | null;
  name: string;
  size?: number;
  ring?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const proxiedUrl = proxyImageUrl(url);
  if (proxiedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{
          width: size,
          height: size,
          boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white"
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------
// Media renderer – picks <img> or <video> based on kind.
// ---------------------------------------------------------------------

function MediaArea({
  media,
  aspect,
  labels,
}: {
  media: PostPreviewMedia[];
  /**
   * Visual aspect ratio of the media frame:
   *  - "square" – 1:1 (Instagram feed default)
   *  - "feed"   – 4:3 (Facebook feed default)
   *  - "video"  – 16:9 (YouTube player)
   */
  aspect: "square" | "feed" | "video";
  labels: PostPreviewProps["labels"];
}) {
  if (media.length === 0) {
    // For YouTube we use the 16:9 frame even in the empty state so the
    // "no media" placeholder visually communicates "video slot".
    const emptyAspect = aspect === "video" ? "aspect-video" : "aspect-square";
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-white/[0.02] text-xs text-muted-foreground/50",
          emptyAspect,
        )}
      >
        {labels.noMedia}
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
        >
          <track kind="captions" />
        </video>
      )}
      {media.length > 1 && (
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          1/{media.length}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Facebook preview
// ---------------------------------------------------------------------

function FacebookPreview({
  content,
  media,
  profile,
  location,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  location?: string;
  labels: PostPreviewProps["labels"];
}) {
  return (
    <div className="flex h-full flex-col bg-[#242526] text-[#e4e6eb]">
      {/* Feed card – no top bar, starts directly with the post */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 postio-scrollbar">
        <article className="rounded-lg bg-[#18191a] p-2.5">
          {/* Header: avatar + name + time */}
          <header className="mb-1.5 flex items-center gap-2">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#e4e6eb]">
                {profile.displayName}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-[#b0b3b8]">
                {location ? <span>{location} · </span> : null}
                <span>{labels.now ?? "Právě teď"}</span>
                <span aria-hidden> · 🌐</span>
              </p>
            </div>
          </header>

          {/* Caption text – above media (FB feed style) */}
          {content.trim() ? (
            <p className="mb-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#e4e6eb]">
              {content}
            </p>
          ) : (
            <p className="mb-1.5 text-[13px] italic text-[#b0b3b8]/60">
              {labels.captionHint}
            </p>
          )}

          {/* Media below text (FB style) */}
          <MediaArea media={media} aspect="feed" labels={labels} />

          {/* Engagement summary */}
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#b0b3b8]">
            <span className="flex items-center gap-1">
              <span className="flex -space-x-1">
                <span className="inline-block rounded-full bg-[#1877F2] h-4 w-4 flex items-center justify-center text-[8px] text-white">👍</span>
                <span className="inline-block rounded-full bg-[#F33E58] h-4 w-4 flex items-center justify-center text-[8px]">❤️</span>
              </span>
              0
            </span>
            <span>{labels.commentShareStats ?? "0 komentářů · 0 sdílení"}</span>
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-white/5" />

          {/* Action row: Like / Comment / Share – FB mobile icons */}
          <div className="grid grid-cols-3 gap-1 text-[11px] font-medium text-[#b0b3b8]">
            <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
              <span aria-hidden className="text-base">👍</span>
              {labels.actionLike ?? "Líbí se mi"}
            </span>
            <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
              <span aria-hidden className="text-base">💬</span>
              {labels.actionComment ?? "Komentář"}
            </span>
            <span className="flex items-center justify-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-default">
              <span aria-hidden className="text-base">↗</span>
              {labels.actionShare ?? "Sdílet"}
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Instagram preview
// ---------------------------------------------------------------------

function InstagramPreview({
  content,
  media,
  profile,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  labels: PostPreviewProps["labels"];
}) {
  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* Feed card – no top bar, starts directly with the post */}
      <article className="flex-1 overflow-y-auto postio-scrollbar">
        {/* Header: avatar (with IG-style gradient ring) + username */}
        <header className="flex items-center gap-2 px-3 py-2">
          <div className="rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
            <div className="rounded-full bg-black p-[2px]">
              <Avatar url={profile.avatarUrl} name={profile.displayName} size={28} />
            </div>
          </div>
          <p className="truncate text-[13px] font-semibold">{profile.displayName}</p>
        </header>

        {/* Dominant media – IG feed style (4:5 aspect) */}
        <MediaArea media={media} aspect="square" labels={labels} />

        {/* Action row – IG icons: heart, comment, paper plane */}
        <div className="flex items-center gap-4 px-3 py-1.5 text-lg">
          <span aria-hidden className="cursor-default">♡</span>
          <span aria-hidden className="cursor-default">💬</span>
          <span aria-hidden className="cursor-default">✈️</span>
          <span aria-hidden className="ml-auto cursor-default text-lg">🔖</span>
        </div>

        {/* Likes count */}
        <div className="px-3 pb-0.5 text-[13px] font-semibold">{labels.likesCount ?? "0 líbenek"}</div>

        {/* Caption below media */}
        <div className="px-3 pb-3 text-[13px]">
          {content.trim() ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              <span className="mr-1.5 font-semibold">{profile.displayName}</span>
              {content}
            </p>
          ) : (
            <p className="italic text-white/40">{labels.captionHint}</p>
          )}
        </div>
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------
// YouTube preview
//
// Faithful reproduction of the YouTube mobile watch feed card:
//  - dark "YouTube" header strip
//  - 16:9 video player
//  - bold title (the post text acts as video title – this matches the
//    publisher in publish-youtube.ts where snippet.title = post.content)
//  - channel row: round avatar, channel name, subscriber count + red
//    "Subscribe" button (decorative only, no click handler)
//  - description chip ("0 views · just now" + caption body)
//  - action bar with Like / Dislike / Share buttons
// ---------------------------------------------------------------------

function YouTubePreview({
  content,
  media,
  profile,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  labels: PostPreviewProps["labels"];
}) {
  return (
    <div className="flex h-full flex-col bg-[#0f0f0f] text-white">
      {/* Feed card – no top bar, starts directly with video player */}
      <article className="flex-1 overflow-y-auto postio-scrollbar">
        {/* 16:9 video player frame */}
        <MediaArea media={media} aspect="video" labels={labels} />

        {/* Title – mirrors snippet.title from the publisher (post.content).
            Truncated visually by line-clamp to mimic YT's 2-line title. */}
        <h2 className="px-3 pt-2 text-[13px] font-semibold leading-snug text-white">
          {content.trim() ? (
            <span className="line-clamp-2 whitespace-pre-wrap break-words">
              {content}
            </span>
          ) : (
            <span className="italic text-white/40">{labels.captionHint}</span>
          )}
        </h2>

        {/* Channel row */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <Avatar url={profile.avatarUrl} name={profile.displayName} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">
              {profile.displayName}
            </p>
            <p className="text-[10px] text-white/60">{labels.subscribersCount ?? "0 subscribers"}</p>
          </div>
          <span
            aria-hidden
            className="rounded-full bg-[#FF0000] px-2.5 py-0.5 text-[10px] font-semibold text-white"
          >
            {labels.actionSubscribe ?? "Subscribe"}
          </span>
        </div>

        {/* Description chip */}
        <div className="mx-3 mt-2 rounded-xl bg-white/[0.06] p-2 text-[11px] text-white/85">
          <p className="font-medium text-white/70">{labels.viewsNow ?? "0 views · just now"}</p>
          {content.trim() ? (
            <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          ) : null}
        </div>

        {/* Action bar – LIKE / DISLIKE / SHARE, faithful to YT mobile */}
        <div className="flex items-center justify-around px-3 py-2 text-[10px] text-white/80">
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-sm leading-none">👍</span>
            <span>Like</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-sm leading-none">👎</span>
            <span>{labels.actionDislike ?? "Dislike"}</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-sm leading-none">↗</span>
            <span>{labels.actionShare ?? "Share"}</span>
          </span>
        </div>
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------
// LinkedIn preview
//
// Faithful reproduction of the LinkedIn mobile feed share card:
//  - white card on light grey background (LinkedIn's classic look)
//  - avatar with author name + headline + timestamp + globe icon
//  - caption text (post content) – with LinkedIn-style word wrapping
//  - media (image OR text-only placeholder)
//  - reaction row: Like / Comment / Repost / Send
//  - social proof row: reactions count + comments
//  - "Seen by" footer (decorative)
//
// Colour references match the LinkedIn brand palette:
//  - Primary blue: #0A66C2
//  - Surface white: #FFFFFF
//  - Subtle grey borders: rgba(0,0,0,0.08)
// ---------------------------------------------------------------------

function LinkedInPreview({
  content,
  media,
  profile,
  labels,
}: {
  content: string;
  media: PostPreviewMedia[];
  profile: PostPreviewProfile;
  labels: PostPreviewProps["labels"];
}) {
  return (
    <div className="flex h-full flex-col bg-[#1a1a2e] text-[#e4e6eb]">
      {/* Feed card – no top bar, starts directly with the post */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 postio-scrollbar">
        <article className="rounded-lg bg-[#1e1e36] shadow-sm">
          {/* Header: avatar + name + headline + time + globe */}
          <header className="flex items-start gap-2 px-2.5 pt-2.5">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#e4e6eb]">
                {profile.displayName}
              </p>
              <p className="truncate text-[10px] text-[#b0b3b8]">
                {labels.professionalDegree ?? "Professional · 1. stupeň"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#b0b3b8]">
                <span>{labels.now ?? "Právě teď"}</span>
                <span aria-hidden>·</span>
                <span aria-hidden>🌐</span>
              </p>
            </div>
            <span
              aria-hidden
              className="text-sm text-[#b0b3b8]"
              title="More"
            >
              ⋯
            </span>
          </header>

          {/* Caption text */}
          {content.trim() ? (
            <p className="whitespace-pre-wrap break-words px-2.5 pt-1.5 text-[13px] leading-relaxed text-[#e4e6eb]">
              {content}
            </p>
          ) : (
            <p className="px-2.5 pt-1.5 text-[13px] italic text-[#b0b3b8]/60">
              {labels.captionHint}
            </p>
          )}

          {/* Media – LinkedIn feed crop */}
          {media.length > 0 ? (
            <div className="mt-1.5 overflow-hidden bg-black">
              <MediaArea media={media} aspect="feed" labels={labels} />
            </div>
          ) : null}

          {/* Social proof row */}
          <div className="flex items-center justify-between px-2.5 pb-0.5 pt-1.5 text-[10px] text-[#b0b3b8]">
            <span aria-hidden>👍❤️👏 0</span>
            <span>{labels.commentStats ?? "0 komentářů"}</span>
          </div>

          {/* Divider */}
          <div className="mx-2.5 border-t border-white/5" />

          {/* Reaction row – Like / Comment / Repost / Send */}
          <div className="grid grid-cols-4 gap-1 px-1.5 py-1 text-[10px] font-medium text-[#b0b3b8]">
            <span className="flex flex-col items-center gap-0.5 py-0.5">
              <span aria-hidden className="text-sm leading-none">👍</span>
              <span>{labels.actionLike ?? "To se mi líbí"}</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-0.5">
              <span aria-hidden className="text-sm leading-none">💬</span>
              <span>{labels.actionComment ?? "Komentovat"}</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-0.5">
              <span aria-hidden className="text-sm leading-none">🔁</span>
              <span>{labels.actionRepost ?? "Přeposlat"}</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-0.5">
              <span aria-hidden className="text-sm leading-none">✈️</span>
              <span>{labels.actionSend ?? "Odeslat"}</span>
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
