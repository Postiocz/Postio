"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTag } from "./actions";

interface TagItemProps {
  id: string;
  name: string;
  color: string;
  t: {
    deleteConfirm: string;
    deleteTag: string;
  };
}

export function TagItem({ id, name, color, t }: TagItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(t.deleteConfirm);
    if (!confirmed) return;

    setIsDeleting(true);
    await deleteTag(id);
    setIsDeleting(false);
  };

  return (
    <div className="group flex items-center justify-between rounded-[20px] border border-white/5 bg-white/50 px-4 py-4 backdrop-blur-sm dark:bg-card/40 transition-all duration-200 hover:border-white/10 hover:bg-white/70 dark:hover:bg-card/60">
      <div className="flex items-center gap-3">
        <span
          className="flex h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="opacity-0 transition-opacity duration-200 hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
