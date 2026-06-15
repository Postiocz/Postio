"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { compressImageIfNeeded, COMPRESSION_THRESHOLD_BYTES } from "@/lib/image-compression";
import { sanitizeMediaUrl } from "@/lib/utils";
import {
  ALLOWED_IMAGE_TYPE_SET,
  ALLOWED_VIDEO_TYPE_SET,
  MAX_VIDEO_SIZE,
  ABSOLUTE_HARD_LIMIT,
  MIN_VIDEO_DIMENSION,
} from "@/lib/constants";

type MediaUploadItem = {
  id: string;
  file?: File;
  url: string;
  previewUrl: string;
  kind: "image" | "video";
  /**
   * - "optimizing": large image is being re-encoded in the browser before upload
   * - "uploading":  the file (original or compressed) is being sent to Supabase
   * - "ready":      upload finished, `url` holds the public URL
   * - "error":      either optimization or upload failed
   */
  status: "optimizing" | "uploading" | "ready" | "error";
  progress?: number;
  /**
   * Pixel dimensions of the media (videos only – filled in right after upload
   * via a temporary `<video>` element). Used by the Instagram "low resolution"
   * hard-block. `undefined` means we don't know yet (still uploading) or
   * we couldn't decode the file.
   */
  dimensions?: { width: number; height: number };
};

/**
 * Strictly classifies a file as image / video / unsupported.
 *
 * The check is done by MIME type first, then by extension as a fallback
 * (some browsers report an empty MIME type for `.mov` files).
 *
 * Note: GIF and SVG are intentionally NOT supported. They are not accepted
 * by all social platforms and tend to fail with cryptic API errors
 * (Meta subcode 2207082 etc.) – better to reject them up front.
 */
function getFileKind(file: File): "image" | "video" | null {
  // Primary check: MIME type.
  if (ALLOWED_IMAGE_TYPE_SET.has(file.type)) return "image";
  if (ALLOWED_VIDEO_TYPE_SET.has(file.type)) return "video";

  // Fallback: extension. Some browsers (Safari, older Chrome) report an
  // empty MIME type for `.mov` files.
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") {
    return "image";
  }
  if (ext === ".mp4" || ext === ".mov") {
    return "video";
  }
  return null;
}

/**
 * Returns true when the file passes the STRICT format check.
 *
 * Any file that is not on the explicit allow-list (JPEG/PNG/WEBP for images,
 * MP4/QuickTime for videos) is rejected. The caller is expected to surface
 * a user-facing error.
 */
function isValidMediaFile(file: File): boolean {
  return getFileKind(file) !== null;
}

/**
 * Returns the dimensions of a video file (width, height in pixels).
 *
 * Resolves to `null` if the browser cannot decode the file (e.g. unsupported
 * codec, broken file). Used for the "low resolution" warning.
 */
function getVideoDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore – URL may already be revoked
      }
    };
    const fail = () => {
      cleanup();
      resolve(null);
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      cleanup();
      if (!w || !h) {
        resolve(null);
        return;
      }
      resolve({ width: w, height: h });
    };
    video.src = url;
  });
}

/**
 * Same as {@link getVideoDimensions} but operates on a remote URL
 * (e.g. an already-uploaded Supabase Storage public URL).
 *
 * Used to back-fill `dimensions` for videos that were attached to a post
 * before this hook was instrumented, or after a page reload that re-hydrates
 * `items` from `loadExistingUrls()`. Without this, the Instagram
 * "low resolution" hard-block would silently no-op on existing posts.
 *
 * The browser only fetches the file header (`preload="metadata"`), so this
 * is cheap even for large videos.
 */
function getVideoDimensionsFromUrl(
  url: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const fail = () => resolve(null);
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        resolve(null);
        return;
      }
      resolve({ width: w, height: h });
    };
    video.src = url;
  });
}

interface MediaUploadLabels {
  tooManyFiles: string;
  uploadSuccess: string;
  uploadError: string;
  fileDeleted: string;
  /** Legacy label – kept for backwards compatibility. */
  invalidFileType: string;
  /**
   * Strict format rejection. Receives the offending MIME type as `{type}`.
   * Example: "Formát image/gif není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV."
   */
  unsupportedFormat: (values: { type: string }) => string;
  /** Toast shown when a video is larger than MAX_VIDEO_SIZE. */
  videoTooLarge: string;
  /** Toast shown when a video is shorter than MIN_VIDEO_DIMENSION pixels. */
  videoLowResolution: string;
  /**
   * Hard-block banner shown when a post is about to be published to Instagram
   * but it contains a video whose shorter side is < MIN_VIDEO_DIMENSION px.
   * Phrased as a platform limitation, not an app limitation.
   */
  instagramVideoTooSmall: string;
  /**
   * Secondary line of the same banner – explains what to do about it.
   */
  instagramVideoTooSmallHint: string;
  fileTooLargeImage: string;
  fileTooLargeVideo: string;
  /** Toast shown when an image is being auto-compressed (>5 MB). */
  optimizingImage: string;
  /** Toast shown after a successful optimization. */
  fileOptimized: string;
  /** Toast shown when optimization fails (we fall back to the original file). */
  compressionError: string;
}

const DEFAULT_LABELS: MediaUploadLabels = {
  tooManyFiles: "Maximum number of files (10) reached",
  uploadSuccess: "File uploaded successfully",
  uploadError: "Error uploading file",
  fileDeleted: "File has been deleted",
  invalidFileType: "Unsupported file format",
  unsupportedFormat: ({ type }) =>
    `Formát ${type || "unknown"} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV.`,
  videoTooLarge: "Video je příliš velké (max. 50 MB). Zmenšete ho prosím.",
  videoLowResolution:
    "Video má nízké rozlišení (méně než 640px). Na sociálních sítích může vypadat rozmazaně.",
  instagramVideoTooSmall:
    "Toto video nelze na Instagramu publikovat.",
  instagramVideoTooSmallHint:
    "Instagram nepodporuje videa s nízkým rozlišením (minimálně 640 × 1138 px). Přegenerujte prosím video ve vyšším rozlišení (doporučeno 1080 × 1920 px).",
  fileTooLargeImage: "Image is too large (max 50 MB).",
  fileTooLargeVideo: "File is too large. Max limit for videos is 20MB.",
  optimizingImage:
    "File is too large (over 5 MB). Postio is now automatically optimizing it for social networks...",
  fileOptimized: "Image optimized",
  compressionError: "Could not optimize the image, uploading the original file.",
};

export function useMediaUpload(
  userId: string | null,
  maxItems = 10,
  labels?: MediaUploadLabels,
) {
  const [items, setItems] = useState<MediaUploadItem[]>([]);
  const supabase = createClient();
  const t = labels ?? DEFAULT_LABELS;

  // ---------------------------------------------------------------------
  // Back-fill `dimensions` for already-uploaded videos.
  //
  // When a user reloads the page or opens an existing post, the items are
  // re-hydrated from remote URLs via `loadExistingUrls()`. At that point we
  // don't have the `dimensions` that the upload pipeline set in the same
  // session. Without this effect the Instagram "low resolution" hard-block
  // would silently no-op (returning an empty array) and the user could try
  // to publish the same bad video to Instagram again.
  //
  // Strategy: every time `items` changes, look for videos that are ready,
  // have a URL but no `dimensions` yet, and ask the browser to read the
  // metadata header (cheap – `preload="metadata"` does not download the
  // body). When the metadata is available we patch the item in-place.
  // The effect will re-run on the patch, but the inner filter is empty
  // then so the loop terminates naturally.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const missing = items.filter(
      (i) => i.kind === "video" && i.status === "ready" && !i.dimensions && !!i.url,
    );
    if (missing.length === 0) return;
    for (const item of missing) {
      getVideoDimensionsFromUrl(item.url)
        .then((dims) => {
          if (!dims) return; // browser could not decode – give up silently
          setItems((current) =>
            current.map((c) => (c.id === item.id ? { ...c, dimensions: dims } : c)),
          );
        })
        .catch(() => {
          // CORS / network error – ignore. Better to miss a hard-block than
          // to spam the user with errors on page load.
        });
    }
  }, [items]);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return null;

      const uniqueName = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error } = await supabase.storage
        .from("post-media")
        .upload(uniqueName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data } = supabase.storage.from("post-media").getPublicUrl(uniqueName);
      return data.publicUrl;
    },
    [userId, supabase],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      // -----------------------------------------------------------------
      // 1. STRICT format check – MIME type must be in the allow-list.
      //
      //    Rejected files are filtered out and the user is shown a toast
      //    naming the offending type. The same file is NEVER counted as
      //    "valid" anywhere else in the pipeline.
      // -----------------------------------------------------------------
      const validFiles: File[] = [];
      const rejectedTypes: File[] = [];
      for (const f of incoming) {
        if (isValidMediaFile(f)) {
          validFiles.push(f);
        } else {
          rejectedTypes.push(f);
        }
      }

      if (rejectedTypes.length > 0) {
        // Show one toast per rejected file so the user knows which one(s)
        // were the problem. (Bounded by maxItems so a 100-file drop won't
        // flood the toast queue.)
        for (const f of rejectedTypes) {
          // Mime type may be an empty string – fall back to a generic label
          // so the toast is still informative.
          const typeLabel = f.type || f.name.split(".").pop()?.toUpperCase() || "unknown";
          toast.error(t.unsupportedFormat({ type: typeLabel }));
        }
        if (validFiles.length === 0) return;
      }

      // -----------------------------------------------------------------
      // 2. Strict size check for VIDEOS – max 50 MB.
      //
      //    Videos are not compressed by Postio (only images are), so any
      //    oversized video must be hard-rejected before the upload starts.
      // -----------------------------------------------------------------
      const oversizedVideos = validFiles.filter(
        (f) => f.type.startsWith("video/") && f.size > MAX_VIDEO_SIZE,
      );
      if (oversizedVideos.length > 0) {
        for (const _ of oversizedVideos) {
          // Show the same toast for each rejected video. The list is
          // typically very short (1-2 files at a time) so this is fine.
          void _;
          toast.error(t.videoTooLarge);
        }
      }

      // -----------------------------------------------------------------
      // 3. Image hard cap – 50 MB absolute upper bound.
      //
      //    Anything above this would crash the canvas encoder in
      //    `compressImageIfNeeded` and the Supabase upload, so reject it
      //    here. The 5 MB compression threshold is handled later in the
      //    pipeline.
      // -----------------------------------------------------------------
      const oversizedImages = validFiles.filter(
        (f) => f.type.startsWith("image/") && f.size > ABSOLUTE_HARD_LIMIT,
      );
      if (oversizedImages.length > 0) {
        for (const _ of oversizedImages) {
          void _;
          toast.error(t.fileTooLargeImage);
        }
      }

      const accepted = validFiles.filter(
        (f) =>
          !(
            (f.type.startsWith("video/") && f.size > MAX_VIDEO_SIZE) ||
            (f.type.startsWith("image/") && f.size > ABSOLUTE_HARD_LIMIT)
          ),
      );
      if (accepted.length === 0) return;

      setItems((prev) => {
        const remainingSlots = Math.max(0, maxItems - prev.length);
        const toAdd = accepted.slice(0, remainingSlots);

        if (toAdd.length < accepted.length) {
          toast.error(t.tooManyFiles);
        }

        // Identify images larger than the compression threshold – they need
        // an "optimizing" pass before being uploaded.
        const needsOptimization = (file: File) =>
          file.type.startsWith("image/") &&
          file.size > COMPRESSION_THRESHOLD_BYTES;

        const created: MediaUploadItem[] = toAdd.map((file) => ({
          id:
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random()}`,
          file,
          url: "",
          previewUrl: URL.createObjectURL(file),
          kind: file.type.startsWith("video/") ? "video" : "image",
          status: needsOptimization(file) ? "optimizing" : "uploading",
          progress: 0,
        }));

        const updated = [...prev, ...created];

        // Process each new item: optimize (if needed) → upload → mark ready.
        for (const item of created) {
          (async () => {
            try {
              let fileToUpload = item.file!;

              if (item.status === "optimizing") {
                const result = await compressImageIfNeeded(fileToUpload, {
                  warningToastMessage: t.optimizingImage,
                });
                if (result.compressed) {
                  // Replace the preview URL so the user can see the
                  // optimized image immediately in the grid.
                  try {
                    URL.revokeObjectURL(item.previewUrl);
                  } catch {
                    // ignore
                  }
                  const newPreviewUrl = URL.createObjectURL(result.file);
                  fileToUpload = result.file;
                  setItems((current) =>
                    current.map((c) =>
                      c.id === item.id
                        ? { ...c, file: result.file, previewUrl: newPreviewUrl }
                        : c,
                    ),
                  );
                  toast.success(t.fileOptimized);
                } else if (result.file === fileToUpload) {
                  // Decoder failed – fall back to the original file
                  toast.error(t.compressionError);
                }
                // Switch from "optimizing" to "uploading"
                setItems((current) =>
                  current.map((c) =>
                    c.id === item.id ? { ...c, status: "uploading" } : c,
                  ),
                );
              }

              // -----------------------------------------------------------------
              // Best-effort resolution detection for VIDEOS.
              //
              // We do NOT block the upload on this – the user may still want
              // to publish a short clip. We DO however store the detected
              // dimensions on the item so the caller can hard-block the
              // "Publish" / "Schedule" buttons when Instagram is among the
              // selected platforms (see `getInstagramIncompatibleVideos`).
              // -----------------------------------------------------------------
              if (item.kind === "video") {
                try {
                  const dims = await getVideoDimensions(fileToUpload);
                  if (dims) {
                    const minSide = Math.min(dims.width, dims.height);
                    if (minSide > 0 && minSide < MIN_VIDEO_DIMENSION) {
                      toast.warning(t.videoLowResolution, { duration: 5000 });
                    }
                    // Persist dimensions on the item so the form UI can
                    // decide later whether to block the publish flow.
                    setItems((current) =>
                      current.map((c) =>
                        c.id === item.id ? { ...c, dimensions: dims } : c,
                      ),
                    );
                  }
                } catch {
                  // Non-fatal – ignore decoding errors here, the upload will
                  // continue regardless.
                }
              }

              const url = await uploadFile(fileToUpload);
              setItems((current) =>
                current.map((c) =>
                  c.id === item.id
                    ? {
                        ...c,
                        url: url ?? c.previewUrl,
                        status: url ? "ready" : "error",
                        file: url ? undefined : c.file,
                        progress: url ? 100 : undefined,
                      }
                    : c,
                ),
              );
              if (url) {
                // The original object URL is no longer needed – the
                // optimized-file preview URL has already replaced it.
                URL.revokeObjectURL(item.previewUrl);
                toast.success(t.uploadSuccess);
              } else {
                toast.error(t.uploadError);
              }
            } catch (err) {
              console.error("Upload pipeline error:", err);
              setItems((current) =>
                current.map((c) =>
                  c.id === item.id ? { ...c, status: "error" } : c,
                ),
              );
              toast.error(t.uploadError);
            }
          })();
        }

        return updated;
      });
    },
    [maxItems, uploadFile, t],
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const item = prev.find((x) => x.id === id);
        if (item) {
          if (item.status !== "ready") {
            URL.revokeObjectURL(item.previewUrl);
          }
          // If uploaded, also remove from storage
          if (item.status === "ready" && item.url) {
            try {
              const urlParts = new URL(item.url);
              const path = urlParts.pathname.replace(
                /^\/.+\/.+\//,
                "",
              );
              supabase
                .storage.from("post-media")
                .remove([path])
                .catch(() => {});
            } catch {
              // URL parsing failed – skip storage removal
            }
          }
        }
        return prev.filter((x) => x.id !== id);
      });
      toast.success(t.fileDeleted);
    },
    [supabase, t],
  );

  const loadExistingUrls = useCallback((urls: string[]) => {
    setItems((prev) => {
      for (const p of prev) {
        if (p.status !== "ready") {
          URL.revokeObjectURL(p.previewUrl);
        }
      }
      return urls.map((url) => ({
        id:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random()}`,
        url,
        previewUrl: url,
        kind:
          url.includes(".mp4") ||
          url.includes(".webm") ||
          url.includes(".mov")
            ? "video"
            : "image",
        status: "ready" as const,
      }));
    });
  }, []);

  const getMediaUrls = useCallback((): string[] => {
    return items
      .filter((i) => i.status === "ready" && i.url)
      .map((i) => sanitizeMediaUrl(i.url))
      .filter((u) => u.length > 0);
  }, [items]);

  const hasUploading = useCallback((): boolean => {
    return items.some(
      (i) => i.status === "uploading" || i.status === "optimizing",
    );
  }, [items]);

  /**
   * Returns every video item whose shorter side is below MIN_VIDEO_DIMENSION.
   *
   * Used by the post form to hard-block publishing to Instagram when at
   * least one such video is attached. Returns an empty array if there is
   * no such video or if we simply don't know the dimensions yet (e.g. the
   * file is still uploading – callers should combine this check with
   * `hasUploading()` to avoid race conditions).
   */
  const getInstagramIncompatibleVideos = useCallback((): MediaUploadItem[] => {
    return items.filter((i) => {
      if (i.kind !== "video") return false;
      if (!i.dimensions) return false;
      const minSide = Math.min(i.dimensions.width, i.dimensions.height);
      return minSide > 0 && minSide < MIN_VIDEO_DIMENSION;
    });
  }, [items]);

  return {
    items,
    addFiles,
    removeItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
    getInstagramIncompatibleVideos,
    setItems,
  };
}
