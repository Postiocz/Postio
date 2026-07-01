"use client";

import * as React from "react";
import { PostFiltersRow } from "@/components/post-filters-row";
import { CalendarView } from "./_calendar-view";

export type PostPlatform = {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  created_at: string;
  updated_at: string;
};

type Post = {
  id: string;
  content: string;
  platforms: string[];
  post_platforms?: PostPlatform[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  post_tags?: { id: string; name: string; color: string }[];
  media_urls: string[];
  published_platforms?: string[];
  external_ids?: Record<string, string> | null;
};

export function CalendarClient({
  posts,
  platforms,
  tags = [],
  initialPlatform,
  initialStatus,
  weekdays,
  months,
  locale,
  tCalendar,
}: {
  posts: Post[];
  platforms: { id: string; label: string }[];
  tags?: { id: string; name: string; color: string }[];
  initialPlatform: string;
  initialStatus: string;
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
    // Tag filter
    filterByTag?: string;
    allTags?: string;
    noTagsAvailable?: string;
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
}) {
  const [platformFilter, setPlatformFilter] = React.useState(initialPlatform);
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [tagFilter, setTagFilter] = React.useState("");

  React.useEffect(() => setPlatformFilter(initialPlatform), [initialPlatform]);
  React.useEffect(() => setStatusFilter(initialStatus), [initialStatus]);

  return (
    <div className="space-y-4">
      <PostFiltersRow
        platformValue={platformFilter}
        statusValue={statusFilter}
        onChange={(platform, status) => {
          setPlatformFilter(platform);
          setStatusFilter(status);
        }}
        allPlatformsLabel={tCalendar.allPlatforms}
        allStatusLabel={tCalendar.filterAll || "Vše"}
        statusDraftLabel={tCalendar.statusDraft || "Koncept"}
        statusScheduledLabel={tCalendar.statusScheduled || "Naplánované"}
        statusPublishedLabel={tCalendar.statusPublished || "Publikované"}
        statusFailedLabel={tCalendar.statusFailed || "Neúspěšné"}
        tagValue={tagFilter}
        tagOptions={tags}
        tagLabel={tCalendar.filterByTag || "Filtr podle štítku"}
        allTagsLabel={tCalendar.allTags || "Všechny štítky"}
        noTagsLabel={tCalendar.noTagsAvailable || "Zatím nemáte žádné štítky."}
        onTagChange={setTagFilter}
      />

      <CalendarView
        posts={posts}
        platforms={platforms}
        platformFilter={platformFilter}
        statusFilter={statusFilter}
        tagFilter={tagFilter}
        weekdays={weekdays}
        months={months}
        locale={locale}
        tCalendar={tCalendar}
      />
    </div>
  );
}

