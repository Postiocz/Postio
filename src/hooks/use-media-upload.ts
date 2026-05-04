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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function useMediaUpload(userId: string | null, maxItems = 10) {
  const [items, setItems] = useState<MediaUploadItem[]>([]);
  const supabase = createClient();

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return null;

      const uniqueName = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error } = await supabase.storage
        .from("post-media")
        .upload(uniqueName, file, {
          cacheControl: "3600",
          upsert: false,
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
      const usable = incoming.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );

      setItems((prev) => {
        const remainingSlots = Math.max(0, maxItems - prev.length);
        const toAdd = usable.slice(0, remainingSlots);

        if (toAdd.length < usable.length) {
          toast.error("Maximální počet souborů dosažen");
        }

        const created: MediaUploadItem[] = toAdd.map((file) => ({
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          file,
          url: "",
          previewUrl: URL.createObjectURL(file),
          kind: file.type.startsWith("video/") ? "video" : "image",
          status: "uploading",
          progress: 0,
        }));

        const updated = [...prev, ...created];

        // Start uploads
        for (const item of created) {
          (async () => {
            const url = await uploadFile(item.file!);
            setItems((current) =>
              current.map((c) =>
                c.id === item.id
                  ? { ...c, url: url ?? c.previewUrl, status: url ? "ready" : "error", file: url ? undefined : c.file }
                  : c
              )
            );
            if (url) {
              URL.revokeObjectURL(item.previewUrl);
              toast.success("Soubor úspěšně nahrán");
            } else {
              toast.error("Chyba při nahrávání");
            }
          })();
        }

        return updated;
      });
    },
    [maxItems, uploadFile]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        // If uploaded, also remove from storage
        if (item.status === "ready" && item.url) {
          const urlParts = new URL(item.url);
          const path = urlParts.pathname.replace(/^\/.+\/.+\//, "");
          supabase.storage.from("post-media").remove([path]).catch(() => {});
        }
      }
      return prev.filter((x) => x.id !== id);
    });
  }, [supabase]);

  const loadExistingUrls = useCallback((urls: string[]) => {
    setItems((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return urls.map((url) => ({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        url,
        previewUrl: url,
        kind: (url.includes(".mp4") || url.includes(".webm") || url.includes(".mov")) ? "video" : "image",
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
