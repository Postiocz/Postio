"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type MediaUploadItem = {
  id: string;
  file?: File;
  url: string;
  previewUrl: string;
  kind: "image" | "video";
  status: "uploading" | "ready" | "error";
  progress?: number;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov"];
const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];

function getFileKind(file: File): "image" | "video" | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (ALLOWED_VIDEO_EXTENSIONS.includes(ext)) return "video";
  return null;
}

function isValidMediaFile(file: File): boolean {
  const kind = getFileKind(file);
  if (!kind) return false;

  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type);
  if (!mimeOk) return false;

  return true;
}

function getFileSizeLimit(file: File): number {
  const kind = getFileKind(file);
  if (kind === "video") return MAX_VIDEO_SIZE;
  return MAX_IMAGE_SIZE;
}

function isFileTooLarge(file: File): boolean {
  return file.size > getFileSizeLimit(file);
}

interface MediaUploadLabels {
  tooManyFiles: string;
  uploadSuccess: string;
  uploadError: string;
  fileDeleted: string;
  invalidFileType: string;
  fileTooLargeImage: string;
  fileTooLargeVideo: string;
}

const DEFAULT_LABELS: MediaUploadLabels = {
  tooManyFiles: "Maximum number of files (10) reached",
  uploadSuccess: "File uploaded successfully",
  uploadError: "Error uploading file",
  fileDeleted: "File has been deleted",
  invalidFileType: "Unsupported file format",
  fileTooLargeImage: "File is too large. Max limit for images is 5MB.",
  fileTooLargeVideo: "File is too large. Max limit for videos is 20MB.",
};

export function useMediaUpload(
  userId: string | null,
  maxItems = 10,
  labels?: MediaUploadLabels
) {
  const [items, setItems] = useState<MediaUploadItem[]>([]);
  const supabase = createClient();
  const t = labels ?? DEFAULT_LABELS;

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
    [userId, supabase]
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      // Validate file types first
      const validFiles = incoming.filter((f) => isValidMediaFile(f));

      if (validFiles.length < incoming.length) {
        toast.error(t.invalidFileType);
        if (validFiles.length === 0) return;
      }

      // Validate file sizes
      const oversizedFiles = validFiles.filter((f) => isFileTooLarge(f));
      if (oversizedFiles.length > 0) {
        const firstOversized = oversizedFiles[0];
        const kind = getFileKind(firstOversized);
        if (kind === "video") {
          toast.error(t.fileTooLargeVideo);
        } else {
          toast.error(t.fileTooLargeImage);
        }
        // Remove oversized files from the list
        const filteredFiles = validFiles.filter((f) => !isFileTooLarge(f));
        if (filteredFiles.length === 0) return;
      }

      setItems((prev) => {
        const remainingSlots = Math.max(0, maxItems - prev.length);
        const toAdd = validFiles.filter((f) => !isFileTooLarge(f)).slice(0, remainingSlots);

        if (toAdd.length < validFiles.length) {
          toast.error(t.tooManyFiles);
        }

        const created: MediaUploadItem[] = toAdd.map((file) => ({
          id:
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random()}`,
          file,
          url: "",
          previewUrl: URL.createObjectURL(file),
          kind: file.type.startsWith("video/") ? "video" : "image",
          status: "uploading",
          progress: 0,
        }));

        const updated = [...prev, ...created];

        // Start uploads in parallel
        for (const item of created) {
          (async () => {
            const url = await uploadFile(item.file!);
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
                  : c
              )
            );
            if (url) {
              URL.revokeObjectURL(item.previewUrl);
              toast.success(t.uploadSuccess);
            } else {
              toast.error(t.uploadError);
            }
          })();
        }

        return updated;
      });
    },
    [maxItems, uploadFile, t]
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
                ""
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
    [supabase, t]
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
    return items.filter((i) => i.status === "ready" && i.url).map((i) => i.url);
  }, [items]);

  const hasUploading = useCallback((): boolean => {
    return items.some((i) => i.status === "uploading");
  }, [items]);

  return {
    items,
    addFiles,
    removeItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
    setItems,
  };
}
