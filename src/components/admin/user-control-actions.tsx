"use client";

/**
 * Admin – User Control actions (Prompt 060, Krok 4)
 *
 * Two client pieces mounted on the user detail page:
 *   - <SendLowCreditsAlertButton> – manual low-credit e-mail (credits card).
 *   - <QuickActions> – reset password + activate/deactivate account.
 *
 * Every action runs as a Server Action (admin rights + audit_logs), shows a
 * confirmation AlertDialog, a spinner while pending and a toast with the
 * result. Design follows the existing admin glassmorphism (20px radius,
 * `bg-white/80 dark:bg-[#09090b]/80`, indigo-purple accent).
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Mail, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  resetUserPassword,
  sendLowCreditsAlert,
  setUserActive,
} from "@/modules/admin-core/actions";

const OUTLINE_BTN =
  "border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5";
const DANGER_BTN =
  "border-red-200 bg-white dark:border-red-500/30 dark:bg-white/5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10";
const PRIMARY_BTN = "bg-purple-600 hover:bg-purple-700 text-white";

export function SendLowCreditsAlertButton({ userId }: { userId: string }) {
  const t = useTranslations("adminUserDetail");
  const [pending, setPending] = useState(false);

  const send = async () => {
    setPending(true);
    const res = await sendLowCreditsAlert(userId);
    setPending(false);
    if (res.success) toast.success(t("alertSentToast"));
    else toast.error(res.error ?? t("actionFailedToast"));
  };

  return (
    <AlertDialog>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className={OUTLINE_BTN}
              >
                <Mail className="mr-2 h-4 w-4 text-purple-500 dark:text-purple-400" />
                {pending ? t("sending") : t("sendAlertButton")}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("sendAlertTooltip")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sendAlertTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("sendAlertDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancelAction")}</AlertDialogCancel>
          <AlertDialogAction onClick={send} disabled={pending}>
            {t("sendAlertConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function QuickActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const t = useTranslations("adminUserDetail");
  const router = useRouter();
  const [resetPending, setResetPending] = useState(false);
  const [activePending, setActivePending] = useState(false);

  const resetPassword = async () => {
    setResetPending(true);
    const res = await resetUserPassword(userId);
    setResetPending(false);
    if (res.success) toast.success(t("resetSentToast"));
    else toast.error(res.error ?? t("actionFailedToast"));
  };

  const toggleActive = async () => {
    const next = !isActive;
    setActivePending(true);
    const res = await setUserActive(userId, next);
    setActivePending(false);
    if (res.success) {
      toast.success(next ? t("activatedToast") : t("deactivatedToast"));
      router.refresh();
    } else {
      toast.error(res.error ?? t("actionFailedToast"));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-slate-500 dark:text-gray-400">
        {t("quickActions")}
      </span>

      {/* Reset password */}
      <AlertDialog>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={resetPending}
                  className={OUTLINE_BTN}
                >
                  <KeyRound className="mr-2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                  {t("resetPasswordButton")}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("resetPasswordTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetPasswordTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("resetPasswordDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelAction")}</AlertDialogCancel>
            <AlertDialogAction onClick={resetPassword} disabled={resetPending}>
              {t("resetPasswordConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate / Reactivate account */}
      <AlertDialog>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={activePending}
                  className={isActive ? DANGER_BTN : PRIMARY_BTN}
                >
                  <Power
                    className={`mr-2 h-4 w-4 ${
                      isActive ? "text-red-500 dark:text-red-400" : "text-purple-500 dark:text-purple-400"
                    }`}
                  />
                  {activePending
                    ? t("processing")
                    : isActive
                    ? t("deactivateButton")
                    : t("reactivateButton")}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {isActive ? t("deactivateTooltip") : t("reactivateTooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? t("deactivateTitle") : t("reactivateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive ? t("deactivateDesc") : t("reactivateDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelAction")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={toggleActive}
              disabled={activePending}
              className={isActive ? "bg-red-600 hover:bg-red-700" : undefined}
            >
              {isActive ? t("deactivateConfirm") : t("reactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}