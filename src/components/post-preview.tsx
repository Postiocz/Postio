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
  /** Optional location string (shown on Facebook preview). */
  location?: string;
  /** Labels for the preview UI (tabs, captions, empty states). */
  labels: {
    facebookTab: string;
    instagramTab: string;
    previewTitle: string;
    noMedia: string;
    placeholderName: string;
    captionHint: string;
  };
}

type Platform = "facebook" | "instagram";

/**
 * PostPreview – real-time mobile-feed simulation of how a post will look
 * once published to Facebook or Instagram.
 *
 * Design decisions:
 *  - The OUTER container uses Postio glassmorphism (rounded-[20px],
 *    backdrop-blur, white/5 border) so it visually belongs to the app.
 *  - The INNER phone mock is a faithful reproduction of each platform's
 *    mobile feed card: brand colors, layout, iconography.
 *  - Switching between FB / IG is done with a segmented control (Tabs).
 *    The active tab drives a `platform` state; the two sub-renderers
 *    (FacebookPreview / InstagramPreview) are pure functions of props.
 *  - No network calls, no hooks beyond useState – everything is driven by
 *    props so the parent (EditPostDialog) controls re-renders.
 */
export function PostPreview({
  content,
  media,
  facebookProfile,
  instagramProfile,
  location,
  labels,
}: PostPreviewProps) {
  const [platform, setPlatform] = useState<Platform>("facebook");

  // Resolve the profile for the currently active platform once per render.
  const activeProfile = useMemo(() => {
    if (platform === "facebook") {
      return facebookProfile ?? { displayName: labels.placeholderName };
    }
    return instagramProfile ?? { displayName: labels.placeholderName };
  }, [platform, facebookProfile, instagramProfile, labels.placeholderName]);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-white/5 bg-card/40 p-4 backdrop-blur-md">
      {/* Header: title + segmented control */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground/80">
          {labels.previewTitle}
        </h3>
        <PlatformTabs
          value={platform}
          onChange={setPlatform}
          facebookLabel={labels.facebookTab}
          instagramLabel={labels.instagramTab}
        />
      </div>

      {/* Phone mock – fixed aspect to mimic a mobile feed card */}
      <div className="relative flex-1 overflow-hidden rounded-[20px] border border-white/5 bg-black">
        {platform === "facebook" ? (
          <FacebookPreview
            content={content}
            media={media}
            profile={activeProfile}
            location={location}
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
  facebookLabel,
  instagramLabel,
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  facebookLabel: string;
  instagramLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Platform preview"
      className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5"
    >
      <TabButton
        active={value === "facebook"}
        onClick={() => onChange("facebook")}
        accent="#1877F2"
        label={facebookLabel}
      />
      <TabButton
        active={value === "instagram"}
        onClick={() => onChange("instagram")}
        accent="#E1306C"
        label={instagramLabel}
      />
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
  aspect: "square" | "feed";
  labels: PostPreviewProps["labels"];
}) {
  if (media.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-white/[0.02] text-xs text-muted-foreground/50">
        {labels.noMedia}
      </div>
    );
  }
  const first = media[0];
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-[4/3]";
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
      <article className="flex-1 overflow-y-auto">
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
