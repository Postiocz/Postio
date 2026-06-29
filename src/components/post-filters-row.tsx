"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ListOrdered, Share2, Tag as TagIcon, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type FilterOption = {
  value: string;
  label: string;
};

type TagFilterOption = {
  value: string;
  label: string;
  color: string;
};

// Input shape for tag options coming from the server (matches UserTag from
// tag-actions.ts). The PostFiltersRow maps this into the internal
// TagFilterOption shape before passing it to TagFilterSelect.
type UserTagOption = {
  id: string;
  name: string;
  color: string;
};

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

function FilterSelect({
  label,
  icon: Icon,
  value,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  defaultValue: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const isActive = value !== defaultValue;
  const selectedLabel =
    options.find((o) => o.value === value)?.label ??
    options.find((o) => o.value === defaultValue)?.label ??
    "";
  const triggerEl = (
    <div
      role="button"
      tabIndex={0}
      onClick={isMobile ? () => setOpen(true) : undefined}
      onKeyDown={
        isMobile
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setOpen(true);
            }
          : undefined
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 transition-all outline-none bg-white/80 dark:bg-card/40 backdrop-blur-md border-black/[0.08] dark:border-white/[0.06] hover:border-indigo-500/30 dark:hover:border-indigo-500/30 focus-visible:ring-2 focus-visible:ring-indigo-500/20 h-10 sm:h-9 text-[13px] sm:text-[12px]",
        isActive &&
          "border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-500/10"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-indigo-500" : "text-muted-foreground/70"
        )}
      />

      <span className="min-w-0 truncate">
        <span className="text-muted-foreground/70">
          {label}{" "}
          <span className="text-muted-foreground/40">•</span>{" "}
        </span>
        <span className={cn(isActive && "text-indigo-700 dark:text-indigo-300")}>
          {selectedLabel}
        </span>
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(defaultValue);
            }}
            aria-label="Clear filter"
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/[0.06]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerEl}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="top-auto bottom-0 left-0 right-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-[20px] rounded-b-none p-0"
            showCloseButton={false}
          >
            <DialogHeader className="px-4 pt-4">
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-indigo-500" />
                {label}
              </DialogTitle>
            </DialogHeader>
            <div className="px-2 pb-4 pt-2">
              <div className="max-h-[60vh] overflow-y-auto rounded-[20px] border border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
                {options.map((opt) => {
                  const selected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
                          : "hover:bg-black/5 dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[--radix-dropdown-menu-trigger-width] p-2 rounded-[20px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="rounded-xl cursor-pointer"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TagFilterSelect({
  label,
  value,
  defaultValue,
  options,
  allTagsLabel,
  noTagsLabel,
  onChange,
}: {
  label: string;
  value: string;
  defaultValue: string;
  options: TagFilterOption[];
  allTagsLabel: string;
  noTagsLabel: string;
  onChange: (value: string) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const isActive = value !== defaultValue;
  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = isActive
    ? selectedOption?.label ?? allTagsLabel
    : allTagsLabel;
  const selectedColor = isActive ? selectedOption?.color : null;

  const triggerEl = (
    <div
      role="button"
      tabIndex={0}
      onClick={isMobile ? () => setOpen(true) : undefined}
      onKeyDown={
        isMobile
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setOpen(true);
            }
          : undefined
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 transition-all outline-none bg-white/80 dark:bg-card/40 backdrop-blur-md border-black/[0.08] dark:border-white/[0.06] hover:border-indigo-500/30 dark:hover:border-indigo-500/30 focus-visible:ring-2 focus-visible:ring-indigo-500/20 h-10 sm:h-9 text-[13px] sm:text-[12px]",
        isActive &&
          "border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-500/10"
      )}
    >
      {selectedColor ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
          style={{ backgroundColor: selectedColor }}
          aria-hidden
        />
      ) : (
        <TagIcon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-indigo-500" : "text-muted-foreground/70"
          )}
        />
      )}

      <span className="min-w-0 truncate">
        <span className="text-muted-foreground/70">
          {label}{" "}
          <span className="text-muted-foreground/40">•</span>{" "}
        </span>
        <span className={cn(isActive && "text-indigo-700 dark:text-indigo-300")}>
          {selectedLabel}
        </span>
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(defaultValue);
            }}
            aria-label="Clear filter"
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/[0.06]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerEl}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="top-auto bottom-0 left-0 right-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-[20px] rounded-b-none p-0"
            showCloseButton={false}
          >
            <DialogHeader className="px-4 pt-4">
              <DialogTitle className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-indigo-500" />
                {label}
              </DialogTitle>
            </DialogHeader>
            <div className="px-2 pb-4 pt-2">
              <div className="max-h-[60vh] overflow-y-auto rounded-[20px] border border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
                {options.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">
                    {noTagsLabel}
                  </div>
                ) : (
                  options.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                          selected
                            ? "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
                            : "hover:bg-black/5 dark:hover:bg-white/[0.06]"
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                            style={{ backgroundColor: opt.color }}
                            aria-hidden
                          />
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[--radix-dropdown-menu-trigger-width] p-2 rounded-[20px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white"
      >
        {options.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground/60">
            {noTagsLabel}
          </div>
        ) : (
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((opt) => (
              <DropdownMenuRadioItem
                key={opt.value}
                value={opt.value}
                className="rounded-xl cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: opt.color }}
                    aria-hidden
                  />
                  <span>{opt.label}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SortOption = "newest" | "oldest" | "publishDate";

function SortSelect({
  value,
  label,
  options,
  onChange,
}: {
  value: SortOption;
  label: string;
  options: FilterOption[];
  onChange: (value: SortOption) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const isActive = value !== "newest";
  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? label;

  const triggerEl = (
    <div
      role="button"
      tabIndex={0}
      onClick={isMobile ? () => setOpen(true) : undefined}
      onKeyDown={
        isMobile
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setOpen(true);
            }
          : undefined
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 transition-all outline-none bg-white/80 dark:bg-card/40 backdrop-blur-md border-black/[0.08] dark:border-white/[0.06] hover:border-indigo-500/30 dark:hover:border-indigo-500/30 focus-visible:ring-2 focus-visible:ring-indigo-500/20 h-10 sm:h-9 text-[13px] sm:text-[12px]",
        isActive &&
          "border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-500/10"
      )}
    >
      <ListOrdered
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-indigo-500" : "text-muted-foreground/70"
        )}
      />

      <span className="min-w-0 truncate">
        <span className="text-muted-foreground/70">
          {label}{" "}
          <span className="text-muted-foreground/40">•</span>{" "}
        </span>
        <span className={cn(isActive && "text-indigo-700 dark:text-indigo-300")}>
          {selectedLabel}
        </span>
      </span>

      <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerEl}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="top-auto bottom-0 left-0 right-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-[20px] rounded-b-none p-0"
            showCloseButton={false}
          >
            <DialogHeader className="px-4 pt-4">
              <DialogTitle className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-indigo-500" />
                {label}
              </DialogTitle>
            </DialogHeader>
            <div className="px-2 pb-4 pt-2">
              <div className="max-h-[60vh] overflow-y-auto rounded-[20px] border border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
                {options.map((opt) => {
                  const selected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value as SortOption);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
                          : "hover:bg-black/5 dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[--radix-dropdown-menu-trigger-width] p-2 rounded-[20px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortOption)}>
          {options.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="rounded-xl cursor-pointer"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PostFiltersRow({
  platformValue,
  statusValue,
  sortValue,
  onChange,
  onSortChange,
  allPlatformsLabel,
  allStatusLabel,
  statusDraftLabel,
  statusScheduledLabel,
  statusPublishedLabel,
  statusFailedLabel,
  statusRemovedExternallyLabel,
  statusArchivedLabel,
  platformLabel = "Platforma",
  statusLabel = "Stav",
  sortLabel = "Seřadit",
  tagValue = "",
  tagOptions = [],
  tagLabel = "Štítek",
  allTagsLabel = "Všechny štítky",
  noTagsLabel = "Zatím nemáte žádné štítky.",
  onTagChange,
  tSortNewestFirst = "Nejnovější první",
  tSortOldestFirst = "Nejstarší první",
  tSortByPublishDate = "Podle data publikování",
}: {
  platformValue: string;
  statusValue: string;
  sortValue?: SortOption;
  onChange: (platform: string, status: string) => void;
  onSortChange?: (sort: SortOption) => void;
  allPlatformsLabel: string;
  allStatusLabel: string;
  statusDraftLabel: string;
  statusScheduledLabel: string;
  statusPublishedLabel: string;
  statusFailedLabel: string;
  statusRemovedExternallyLabel?: string;
  statusArchivedLabel?: string;
  platformLabel?: string;
  statusLabel?: string;
  sortLabel?: string;
  tagValue?: string;
  tagOptions?: UserTagOption[];
  tagLabel?: string;
  allTagsLabel?: string;
  noTagsLabel?: string;
  onTagChange?: (tag: string) => void;
  tSortNewestFirst?: string;
  tSortOldestFirst?: string;
  tSortByPublishDate?: string;
}) {
  const platformOptions: FilterOption[] = [
    { value: "", label: allPlatformsLabel || "Všechny platformy" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
  ];

  const statusOptions: FilterOption[] = [
    { value: "", label: allStatusLabel || "Vše" },
    { value: "draft", label: statusDraftLabel || "Koncept" },
    { value: "scheduled", label: statusScheduledLabel || "Naplánované" },
    { value: "published", label: statusPublishedLabel || "Publikované" },
    { value: "failed", label: statusFailedLabel || "Neúspěšné" },
    ...(statusRemovedExternallyLabel
      ? [{ value: "removed_externally", label: statusRemovedExternallyLabel }]
      : []),
    ...(statusArchivedLabel
      ? [{ value: "archived", label: statusArchivedLabel }]
      : []),
  ];

  const sortOptions: FilterOption[] = [
    { value: "newest", label: tSortNewestFirst ?? "Nejnovější první" },
    { value: "oldest", label: tSortOldestFirst ?? "Nejstarší první" },
    { value: "publishDate", label: tSortByPublishDate ?? "Podle data publikování" },
  ];

  return (
    <div className="w-full sm:w-fit">
      {/* Row 1: Platform + Status */}
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <div className="flex-1 sm:flex-none sm:w-[210px]">
          <FilterSelect
            label={platformLabel}
            icon={Share2}
            value={platformValue}
            defaultValue=""
            options={platformOptions}
            onChange={(v) => onChange(v, statusValue)}
          />
        </div>
        <div className="flex-1 sm:flex-none sm:w-[210px]">
          <FilterSelect
            label={statusLabel}
            icon={CheckCircle2}
            value={statusValue}
            defaultValue=""
            options={statusOptions}
            onChange={(v) => onChange(platformValue, v)}
          />
        </div>
      </div>
      {/* Row 2: Tag + Sort */}
      {(onTagChange || onSortChange) && (
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          {onTagChange ? (
            <div className="flex-1 sm:flex-none sm:w-[210px]">
              <TagFilterSelect
                label={tagLabel}
                value={tagValue}
                defaultValue=""
                options={[
                  { value: "", label: allTagsLabel, color: "#6366F1" },
                  ...tagOptions.map((t) => ({
                    value: t.id,
                    label: t.name,
                    color: t.color,
                  })),
                ]}
                allTagsLabel={allTagsLabel}
                noTagsLabel={noTagsLabel}
                onChange={onTagChange}
              />
            </div>
          ) : null}
          {onSortChange && (
            <div className="flex-1 sm:flex-none sm:w-[210px]">
              <SortSelect
                label={sortLabel}
                value={sortValue ?? "newest"}
                options={sortOptions}
                onChange={onSortChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
