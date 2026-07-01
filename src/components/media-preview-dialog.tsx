"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SR_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};

export function MediaPreviewDialog({
  open,
  onOpenChange,
  mediaUrls,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when dialog opens or URLs change
  useEffect(() => {
    if (open) setCurrentIndex(0);
  }, [open, mediaUrls]);

  if (mediaUrls.length === 0) return null;

  const currentUrl = mediaUrls[currentIndex];
  const isVideo = /\.(mp4|mov)(\?.*)?$/i.test(currentUrl);
  const totalCount = mediaUrls.length;
  const canGoPrev = totalCount > 1 && currentIndex > 0;
  const canGoNext = totalCount > 1 && currentIndex < totalCount - 1;

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(totalCount - 1, i + 1));

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && canGoPrev) goPrev();
    if (e.key === "ArrowRight" && canGoNext) goNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100vw-2rem)] w-full h-[calc(100vh-2rem)] max-h-[85vh] p-0 rounded-[20px] bg-black/95 backdrop-blur-xl border border-white/10 overflow-hidden flex items-center justify-center"
        onKeyDown={handleKeyDown}
      >
        {/* Required by Radix for a11y – visually hidden */}
        <DialogTitle style={SR_STYLE}>Media preview {totalCount > 1 ? `${currentIndex + 1} of ${totalCount}` : ""}</DialogTitle>

        {/* Close button */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-white/20 border-0"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        {/* Media display area */}
        <div className="relative w-full h-full flex items-center justify-center p-3">
          {isVideo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <video
              src={currentUrl}
              className="max-w-full max-h-full object-contain rounded-lg"
              controls
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={`Media ${currentIndex + 1} of ${totalCount}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}

          {/* Previous button */}
          {canGoPrev && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Next button */}
          {canGoNext && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Counter – bottom center */}
        {totalCount > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-xs text-white/80 z-10">
            {mediaUrls.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/30 hover:bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
