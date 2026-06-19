"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateOrganizationName } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

interface GeneralFormLabels {
  creationDate: string;
  creationDateValue: string;
  organizationName: string;
  organizationNamePlaceholder: string;
  saved: string;
  saving: string;
  save: string;
}

interface GeneralFormProps {
  organizationName: string;
  createdAt: string;
  labels: GeneralFormLabels;
}

export default function GeneralForm({
  organizationName: initialOrganizationName,
  createdAt,
  labels,
}: GeneralFormProps) {
  const commonT = useTranslations("common");
  const [organizationName, setOrganizationName] = useState(initialOrganizationName);
  const [isPending, startTransition] = useTransition();
  const [state, action] = useActionState(updateOrganizationName, {
    error: null,
    success: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    startTransition(() => {
      action(new FormData(e.currentTarget as HTMLFormElement));
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Creation Date */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.creationDate}
        </h2>
        <div className="text-sm text-muted-foreground/70">
          {labels.creationDateValue}
        </div>
      </div>

      {/* Organization Name */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.organizationName}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="organization_name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder={labels.organizationNamePlaceholder}
              className="rounded-xl"
            />
          </div>
          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-500">
              <Check className="h-4 w-4" />
              {labels.saved}
            </div>
          )}
          <Button type="submit" disabled={isPending} className="rounded-xl">
            {isPending ? labels.saving : labels.save}
          </Button>
        </form>
      </div>
    </div>
  );
}
