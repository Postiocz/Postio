/**
 * Build the final caption: content + location + hashtags
 * Used for both publishing and updating posts on Meta platforms.
 */
export function buildFinalCaption(params: {
  content: string;
  location?: string | null;
  tags?: string[];
}): string {
  const parts: string[] = [params.content.trim()];

  if (params.location?.trim()) {
    parts.push(`📍 ${params.location.trim()}`);
  }

  const normalizedTags = Array.isArray(params.tags)
    ? params.tags.filter((t) => typeof t === "string" && t.trim())
    : [];

  if (normalizedTags.length > 0) {
    const hashtagLine = normalizedTags
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    parts.push(hashtagLine);
  }

  return parts.join("\n");
}
