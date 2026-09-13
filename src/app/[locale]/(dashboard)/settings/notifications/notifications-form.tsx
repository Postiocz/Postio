"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateNotifications } from "./actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Check } from "lucide-react";

interface NotificationsFormProps {
  emailLowCreditAlert: boolean;
  emailWeeklySummary: boolean;
  labels: {
    saved: string;
    notificationsSection: string;
    notificationsSectionDescription: string;
    lowCreditAlert: string;
    lowCreditAlertDescription: string;
    weeklySummary: string;
    weeklySummaryDescription: string;
  };
}

export default function NotificationsForm({
  emailLowCreditAlert: initialEmailLowCreditAlert,
  emailWeeklySummary: initialEmailWeeklySummary,
  labels,
}: NotificationsFormProps) {
  const commonT = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [notifState, notifAction] = useActionState(updateNotifications, {
    error: null,
    success: false,
  });
  const [saved, setSaved] = useState(false);

  const [emailLowCreditAlert, setEmailLowCreditAlert] = useState(
    initialEmailLowCreditAlert
  );
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(
    initialEmailWeeklySummary
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const formData = new FormData();
    formData.set("email_low_credit_alert", emailLowCreditAlert ? "true" : "false");
    formData.set("email_weekly_summary", emailWeeklySummary ? "true" : "false");

    startTransition(() => {
      notifAction(formData);
    });
  };

  const handleSuccess = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (notifState.success && saved === false) {
    handleSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Email Notifications */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Bell className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold">{labels.notificationsSection}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              {labels.notificationsSectionDescription}
            </p>

            {/* Low credit alert toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-background/50 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{labels.lowCreditAlert}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {labels.lowCreditAlertDescription}
                </p>
              </div>
              <Switch
                id="email_low_credit_alert"
                checked={emailLowCreditAlert}
                onCheckedChange={(value) => setEmailLowCreditAlert(Boolean(value))}
                aria-label={labels.lowCreditAlert}
              />
            </div>

            {/* Weekly summary toggle */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-background/50 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{labels.weeklySummary}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {labels.weeklySummaryDescription}
                </p>
              </div>
              <Switch
                id="email_weekly_summary"
                checked={emailWeeklySummary}
                onCheckedChange={(value) => setEmailWeeklySummary(Boolean(value))}
                aria-label={labels.weeklySummary}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-shrink-0">
          {isPending ? commonT("loading") : commonT("save")}
        </Button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-500">
            <Check className="h-4 w-4" />
            {labels.saved}
          </div>
        )}
        {notifState.error && (
          <p className="text-sm text-red-500">{notifState.error}</p>
        )}
      </div>
    </form>
  );
}