"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

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
    previewTitle: string;
    noMedia: string;
    placeholderName: string;
    captionHint: string;
  };
}

type Platform = "facebook" | "instagram" | "youtube" | "linkedin" | "tiktok";

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
    return instagramProfile ?? { displayName: labels.placeholderName };
  }, [
    effectivePlatform,
    facebookProfile,
    instagramProfile,
    youtubeProfile,
    linkedinProfile,
    tiktokProfile,
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
                  : labels.instagramTab,
      })),
    [
      tabs,
      labels.facebookTab,
      labels.instagramTab,
      labels.youtubeTab,
      labels.linkedinTab,
      labels.tiktokTab,
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
  labels?: { noMedia?: string; tiktokVideoRequired?: string };
}) {
  // TikTok only supports video
  const videoMedia = media.find((m) => m.kind === "video") ?? media[0];

  return (
    <div className="flex h-full flex-col bg-black text-white relative">
      {/* Background/Video Area */}
      <div className="absolute inset-0">
        {videoMedia ? (
          <MediaArea media={[videoMedia]} forceSquare={false} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#121212]">
            <div className="text-center text-white/50">
              <span className="mb-2 block text-4xl">🎵</span>
              <p className="text-sm font-medium">
                {labels?.tiktokVideoRequired ?? labels?.noMedia ?? "TikTok requires video"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
        <div className="flex flex-row items-end justify-between p-4 pb-6">
          {/* Left column: Author & Description */}
          <div className="flex-1 pr-12 min-w-0">
            <div className="mb-2 font-semibold text-[15px] hover:underline cursor-pointer inline-block pointer-events-auto">
              @{profile.displayName.replace(/\s+/g, "").toLowerCase() || "tiktok_creator"}
            </div>
            
            {content ? (
              <div className="text-sm text-white/90 font-normal leading-[1.3] line-clamp-3 mb-2 pointer-events-auto">
                {content}
              </div>
            ) : null}

            {/* Original Sound */}
            <div className="flex items-center gap-2 text-sm text-white/80 pointer-events-auto">
              <svg className="w-4 h-4 animate-[spin_3s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
              <span className="truncate">původní zvuk - {profile.displayName}</span>
            </div>
          </div>

          {/* Right column: Action buttons */}
          <div className="flex flex-col items-center justify-end gap-5 pointer-events-auto">
            {/* Avatar */}
            <div className="relative mb-2">
              <Avatar
                url={profile.avatarUrl}
                name={profile.displayName}
                className="h-[48px] w-[48px] rounded-full border border-white"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#EA4359] w-5 h-5 flex items-center justify-center text-white cursor-pointer shadow-sm">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              </div>
            </div>

            {/* Like */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="bg-black/20 p-2.5 rounded-full backdrop-blur-sm group-hover:bg-black/40 transition-colors">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
              </div>
              <span className="text-xs font-semibold">12.4K</span>
            </button>

            {/* Comment */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="bg-black/20 p-2.5 rounded-full backdrop-blur-sm group-hover:bg-black/40 transition-colors">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 20.01c.01.27-.1.52-.29.71-.2.2-.45.3-.71.29l-3.32-.23c-1.63.85-3.56 1.3-5.67 1.3-6.63 0-12-4.93-12-11C0 4.93 5.37 0 12 0s12 4.93 12 11c0 3.3-1.63 6.27-4.18 8.19l2.17 1.05v-.23z"></path></svg>
              </div>
              <span className="text-xs font-semibold">134</span>
            </button>

            {/* Bookmark */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="bg-black/20 p-2.5 rounded-full backdrop-blur-sm group-hover:bg-black/40 transition-colors">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>
              </div>
              <span className="text-xs font-semibold">456</span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="bg-black/20 p-2.5 rounded-full backdrop-blur-sm group-hover:bg-black/40 transition-colors">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" transform="scale(-1,1)"><path d="M21 11.5L9 4v5C4 9 2 13.5 2 19c2.5-3.5 6-4.5 7-4.5v5l12-7.5z"></path></svg>
              </div>
              <span className="text-xs font-semibold">12</span>
            </button>
            
            {/* Spinning Record */}
            <div className="w-[40px] h-[40px] rounded-full bg-[#1e1e1e] flex items-center justify-center animate-[spin_4s_linear_infinite] mt-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              <Avatar
                url={profile.avatarUrl}
                name={profile.displayName}
                className="h-[24px] w-[24px] rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
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
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
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
                <span>Právě teď</span>
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
            <span>0 komentářů · 0 sdílení</span>
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-white/5" />

          {/* Action row: Like / Comment / Share – FB mobile icons */}
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
        <div className="px-3 pb-0.5 text-[13px] font-semibold">0 líbenek</div>

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
            <p className="text-[10px] text-white/60">0 subscribers</p>
          </div>
          <span
            aria-hidden
            className="rounded-full bg-[#FF0000] px-2.5 py-0.5 text-[10px] font-semibold text-white"
          >
            Subscribe
          </span>
        </div>

        {/* Description chip */}
        <div className="mx-3 mt-2 rounded-xl bg-white/[0.06] p-2 text-[11px] text-white/85">
          <p className="font-medium text-white/70">0 views · just now</p>
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
                Professional · 1. stupen
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#b0b3b8]">
                <span>Právě teď</span>
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
            <span>0 komentářů</span>
          </div>

          {/* Divider */}
          <div className="mx-2.5 border-t border-white/5" />

          {/* Reaction row – Like / Comment / Repost / Send */}
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
