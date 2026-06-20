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
    previewTitle: string;
    noMedia: string;
    placeholderName: string;
    captionHint: string;
  };
}

type Platform = "facebook" | "instagram" | "youtube" | "linkedin";

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
    return instagramProfile ?? { displayName: labels.placeholderName };
  }, [
    effectivePlatform,
    facebookProfile,
    instagramProfile,
    youtubeProfile,
    linkedinProfile,
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
                : labels.instagramTab,
      })),
    [
      tabs,
      labels.facebookTab,
      labels.instagramTab,
      labels.youtubeTab,
      labels.linkedinTab,
    ],
  );

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-white/5 bg-card/40 p-4 backdrop-blur-md">
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

      {/* Phone mock – fixed aspect to mimic a mobile feed card */}
      <div className="relative flex-1 overflow-hidden rounded-[20px] border border-white/5 bg-black">
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
  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "video"
        ? "aspect-video"
        : "aspect-[4/3]";
  return (
    <div className={cn("relative w-full overflow-hidden bg-black", aspectClass)}>
      {first.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={first.previewUrl}
          alt="Preview"
          className="h-full w-full object-cover"
        />
      ) : (
        <video
          src={first.previewUrl}
          className="h-full w-full object-cover"
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
      {/* Top bar mimicking FB mobile app */}
      <div className="flex items-center justify-between px-3 py-2 text-[#1877F2]">
        <span className="text-base font-bold tracking-tight">facebook</span>
      </div>

      {/* Feed card */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <article className="rounded-lg bg-[#18191a] p-3">
          {/* Header: avatar + name + time */}
          <header className="mb-2 flex items-center gap-2">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#e4e6eb]">
                {profile.displayName}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-[#b0b3b8]">
                {location ? <span>{location} · </span> : null}
                <span>Právě teď</span>
                <span aria-hidden> · 🌐</span>
              </p>
            </div>
          </header>

          {/* Caption text */}
          {content.trim() ? (
            <p className="mb-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#e4e6eb]">
              {content}
            </p>
          ) : (
            <p className="mb-2 text-sm italic text-[#b0b3b8]/60">
              {labels.captionHint}
            </p>
          )}

          {/* Media below text (FB style) */}
          <MediaArea media={media} aspect="feed" labels={labels} />

          {/* Fake engagement row */}
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-[#b0b3b8]">
            <span>👍❤️ 0</span>
            <span>0 komentářů</span>
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
      {/* Top bar – IG gradient logo */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-base font-semibold text-transparent">
          Instagram
        </span>
      </div>

      {/* Feed card */}
      <article className="flex-1 overflow-y-auto postio-scrollbar">
        {/* Header: avatar (with IG-style gradient ring) + username */}
        <header className="flex items-center gap-2 px-3 py-2">
          <div className="rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
            <div className="rounded-full bg-black p-[2px]">
              <Avatar url={profile.avatarUrl} name={profile.displayName} size={32} />
            </div>
          </div>
          <p className="truncate text-sm font-semibold">{profile.displayName}</p>
        </header>

        {/* Square / 4:5 media – IG crops to square in feed by default */}
        <MediaArea media={media} aspect="square" labels={labels} />

        {/* Action row */}
        <div className="flex items-center gap-4 px-3 py-2 text-xl">
          <span aria-hidden>♡</span>
          <span aria-hidden>💬</span>
          <span aria-hidden>✈️</span>
        </div>

        {/* Caption below media */}
        <div className="px-3 pb-4 text-sm">
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
      {/* Top bar mimicking YT mobile app */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1 text-base font-bold tracking-tight">
          <span className="text-[#FF0000]" aria-hidden>▶</span>
          <span>YouTube</span>
        </span>
      </div>

      <article className="flex-1 overflow-y-auto postio-scrollbar">
        {/* 16:9 video player frame */}
        <MediaArea media={media} aspect="video" labels={labels} />

        {/* Title – mirrors snippet.title from the publisher (post.content).
            Truncated visually by line-clamp to mimic YT's 2-line title. */}
        <h2 className="px-3 pt-3 text-sm font-semibold leading-snug text-white">
          {content.trim() ? (
            <span className="line-clamp-2 whitespace-pre-wrap break-words">
              {content}
            </span>
          ) : (
            <span className="italic text-white/40">{labels.captionHint}</span>
          )}
        </h2>

        {/* Channel row */}
        <div className="flex items-center gap-2 px-3 pt-3">
          <Avatar url={profile.avatarUrl} name={profile.displayName} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile.displayName}
            </p>
            <p className="text-[11px] text-white/60">0 subscribers</p>
          </div>
          <span
            aria-hidden
            className="rounded-full bg-[#FF0000] px-3 py-1 text-xs font-semibold text-white"
          >
            Subscribe
          </span>
        </div>

        {/* Description chip – mirrors the publisher's description (text
            + location + tags). For the live preview we show just the
            plain text content; metadata like location/tags is not yet
            threaded through the preview API. */}
        <div className="mx-3 mt-3 rounded-xl bg-white/[0.06] p-2.5 text-xs text-white/85">
          <p className="font-medium text-white/70">0 views · just now</p>
          {content.trim() ? (
            <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          ) : null}
        </div>

        {/* Action bar – LIKE / DISLIKE / SHARE, faithful to YT mobile */}
        <div className="flex items-center justify-around px-3 py-3 text-[11px] text-white/80">
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-base leading-none">👍</span>
            <span>Like</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-base leading-none">👎</span>
            <span>Dislike</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-base leading-none">↗</span>
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
    <div className="flex h-full flex-col bg-[#f3f2ef] text-[#000000e6]">
      {/* Top bar mimicking LinkedIn mobile nav */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-3 py-2">
        <span
          className="text-base font-bold tracking-tight"
          style={{ color: "#0A66C2" }}
        >
          in
        </span>
        <span className="text-xs text-black/50">Právě teď</span>
      </div>

      {/* Feed card */}
      <div className="flex-1 overflow-y-auto px-3 py-3 postio-scrollbar">
        <article className="rounded-lg border border-black/5 bg-white shadow-sm">
          {/* Header: avatar + name + headline + time + globe */}
          <header className="flex items-start gap-2 px-3 pt-3">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#000000e6]">
                {profile.displayName}
              </p>
              <p className="truncate text-[11px] text-black/60">
                Professional · 1. stupen
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-black/60">
                <span>Právě teď</span>
                <span aria-hidden>·</span>
                <span aria-hidden>🌐</span>
              </p>
            </div>
            <span
              aria-hidden
              className="text-base text-black/40"
              title="More"
            >
              ⋯
            </span>
          </header>

          {/* Caption text */}
          {content.trim() ? (
            <p className="whitespace-pre-wrap break-words px-3 pt-2 text-sm leading-relaxed text-[#000000e6]">
              {content}
            </p>
          ) : (
            <p className="px-3 pt-2 text-sm italic text-black/40">
              {labels.captionHint}
            </p>
          )}

          {/* Media – LinkedIn image previews typically render at the full
              card width with a 1.91:1 (or square) crop. We reuse the
              feed (4:3) aspect for visual consistency with the FB card;
              this is close enough to LinkedIn's actual feed crop. */}
          {media.length > 0 ? (
            <div className="mt-2 overflow-hidden bg-black">
              <MediaArea media={media} aspect="feed" labels={labels} />
            </div>
          ) : null}

          {/* Social proof row */}
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] text-black/60">
            <span aria-hidden>👍❤️👏 0</span>
            <span>0 komentářů</span>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-black/5" />

          {/* Reaction row – Like / Comment / Repost / Send */}
          <div className="grid grid-cols-4 gap-1 px-2 py-1.5 text-[11px] font-semibold text-black/70">
            <span className="flex flex-col items-center gap-0.5 py-1">
              <span aria-hidden className="text-base leading-none">👍</span>
              <span>To se mi líbí</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-1">
              <span aria-hidden className="text-base leading-none">💬</span>
              <span>Komentář</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-1">
              <span aria-hidden className="text-base leading-none">🔁</span>
              <span>Repost</span>
            </span>
            <span className="flex flex-col items-center gap-0.5 py-1">
              <span aria-hidden className="text-base leading-none">✈️</span>
              <span>Poslat</span>
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
