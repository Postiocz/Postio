"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTagInline, getUserTags, type UserTag } from "@/lib/actions/tag-actions";

interface TagPickerProps {
  /** IDs of tags currently assigned to the post. */
  selectedTagIds: string[];
  /** Called whenever the user toggles a tag. */
  onChange: (tagIds: string[]) => void;
  /** Placeholder text shown when no tags are selected. */
  placeholder?: string;
  /** i18n strings. */
  t: {
    placeholder: string;
    createTag: string;
    noTags: string;
    selectColor: string;
    add: string;
    cancel: string;
  };
}

const TAG_COLORS = [
  "#6366F1", "#A855F7", "#EC4899", "#EF4444",
  "#F97316", "#F59E0B", "#10B981", "#14B8A6",
  "#06B6D4", "#3B82F6",
];

/**
 * Multi-select picker for the user's library of internal organization tags.
 * Lets the user pick from existing tags or create a new one inline.
 * Used to attach tags to a post (purely internal – never sent to social networks).
 */
export function TagPicker({ selectedTagIds, onChange, placeholder, t }: TagPickerProps) {
  const [allTags, setAllTags] = useState<UserTag[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load of user tags
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getUserTags();
      if (cancelled) return;
      if (res.success && res.data) setAllTags(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = allTags.filter((tag) => selectedTagIds.includes(tag.id));
  const available = allTags.filter(
    (tag) =>
      !selectedTagIds.includes(tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    onChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((x) => x !== id)
        : [...selectedTagIds, id],
    );
  };

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    const res = await createTagInline(newName, newColor);
    setCreating(false);
    if (res.success && res.data) {
      // Add to local list if not present
      setAllTags((prev) => {
        if (prev.some((t) => t.id === res.data!.id)) return prev;
        return [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name));
      });
      // Auto-select the new tag
      onChange([...selectedTagIds, res.data.id]);
      setNewName("");
      setNewColor(TAG_COLORS[0]);
      setCreateOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected tag chips + click area */}
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-2 rounded-[20px] border border-white/10 bg-black/20 px-3 py-2 transition-colors hover:border-white/20"
      >
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground/40">
            {placeholder ?? t.placeholder}
          </span>
        )}
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
              border: `1px solid ${tag.color}40`,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(tag.id);
              }}
              className="ml-1 opacity-60 transition-opacity hover:opacity-100"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-[20px] border border-white/10 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.placeholder}
            className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-indigo-500/50"
            autoFocus
          />

          {available.length > 0 ? (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/5"
                >
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground/50">
              {t.noTags}
            </p>
          )}

          <div className="mt-2 border-t border-white/5 pt-2">
            {!createOpen ? (
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(true);
                  // If the user has typed something in the search, prefill the new tag name
                  if (search.trim()) setNewName(search.trim());
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-indigo-400 transition-colors hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" />
                {search ? `${t.createTag} "${search}"` : t.createTag}
              </button>
            ) : (
              <div className="space-y-2 p-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.createTag}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-indigo-500/50"
                  autoFocus
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground/60">{t.selectColor}</span>
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full transition-transform",
                        newColor === c && "scale-110 ring-2 ring-white/40",
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateOpen(false);
                      setNewName("");
                    }}
                    className="rounded-xl px-3 py-1 text-xs text-muted-foreground hover:bg-white/5"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="rounded-xl bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {t.add}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
