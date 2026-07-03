"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play } from "lucide-react";
import NextImage from "next/image";
import type { Post } from "@/types/calendar";
import { PlatformIconMap } from "./post-calendar-chip";

interface HoverPreviewProps {
  hoveredPost: Post | null;
  hoverPosition: { x: number; y: number };
  getPostDisplayDate: (post: Post) => string | null;
  locale: string;
}

const getPlatformColor = (platformId: string): string => {
  const colors: Record<string, string> = {
    instagram: "text-pink-500",
    facebook: "text-blue-600",
    twitter: "text-sky-500",
    x: "text-sky-500",
    linkedin: "text-blue-700",
    youtube: "text-red-600",
    tiktok: "text-rose-500",
  };
  return colors[platformId?.toLowerCase()] || "text-foreground/60";
};

export function HoverPreview({ hoveredPost, hoverPosition, getPostDisplayDate, locale }: HoverPreviewProps) {
  return (
    <AnimatePresence>
      {hoveredPost && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="hidden lg:block fixed z-[9999] pointer-events-none"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
          }}
        >
          <div className="bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[16px] p-4 w-72 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {hoveredPost.media_urls && hoveredPost.media_urls.length > 0 && (() => {
              const firstMedia = hoveredPost.media_urls[0];
              const isVideo = firstMedia
                ? /\.(mp4|mov|webm)(\?.*)?$/i.test(firstMedia)
                : false;
              return (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-black/5 dark:bg-white/5">
                  {isVideo ? (
                    <>
                      <video
                        src={firstMedia}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20">
                          <Play className="h-4 w-4 text-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <NextImage
                      src={firstMedia ?? ""}
                      alt="Media preview"
                      width={384}
                      height={216}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })()}
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-3">
              {hoveredPost.content?.substring(0, 80)}
              {hoveredPost.content?.length > 80 ? "..." : ""}
            </p>
            <div className="flex items-center justify-between border-t border-black/5 dark:border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                {(hoveredPost.platforms || []).slice(0, 4).map((platformId) => {
                  const Icon = PlatformIconMap[platformId];
                  return Icon ? (
                    <Icon
                      key={platformId}
                      className={`h-3.5 w-3.5 ${getPlatformColor(platformId)}`}
                    />
                  ) : null;
                })}
              </div>
              {(() => {
                const hoverDisplayDate = getPostDisplayDate(hoveredPost);
                if (!hoverDisplayDate) return null;
                return (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(hoverDisplayDate).toLocaleTimeString(
                        locale === "cs" ? "cs-CZ" : locale === "uk" ? "uk-UA" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
