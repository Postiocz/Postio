"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createTag } from "./actions";

const tagColors = [
  { name: "Indigo", value: "#6366F1" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Blue", value: "#3B82F6" },
];

interface CreateTagDialogProps {
  t: {
    modalTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    colorLabel: string;
    cancel: string;
    create: string;
  };
}

export function CreateTagDialog({ t }: CreateTagDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    const result = await createTag(name.trim(), color);

    if (result.success) {
      setName("");
      setColor("#6366F1");
      setOpen(false);
    }
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-[20px]">
          <Plus className="h-4 w-4" />
          {t.create}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-6 sm:p-8">
        <DialogHeader className="gap-4 pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">{t.modalTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10 pt-4 sm:pt-6">
          <div>
            <Label htmlFor="tag-name" className="block text-sm font-medium tracking-wide text-muted-foreground">
              {t.nameLabel}
            </Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              autoFocus
              className="mt-3 rounded-[20px] border-white/10 bg-white/50 dark:bg-card/40 backdrop-blur-sm h-12 text-base"
            />
          </div>

          <div>
            <Label className="block text-sm font-medium tracking-wide text-muted-foreground">
              {t.colorLabel}
            </Label>
            <div className="flex flex-wrap gap-3 mt-3">
              {tagColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {color === c.value && (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-[20px]"
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="rounded-[20px]"
            >
              {t.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
