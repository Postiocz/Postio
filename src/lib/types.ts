/**
 * All possible computed statuses for a post (aggregated from post_platforms).
 *
 * Priority order (highest → lowest):
 *   failed > publishing > removed_externally > published > scheduled > draft
 *   archived wins only when ALL platforms are archived.
 */
export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'removed_externally'
  | 'archived';

/**
 * Individual status of a single post_platforms row.
 * Mirrors PostStatus - DB column can contain any of these values
 * after user soft-delete (archive) or external sync (removed_externally).
 */
export type PlatformStatus = PostStatus;
