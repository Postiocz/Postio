"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Users, BarChart3, Bell, X } from "lucide-react";
import type { ComponentType } from "react";

interface AccountTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  PlatformIcon: ComponentType<{ className?: string }>;
  onProfessional: () => void | Promise<void>;
  onPersonal: () => void;
  t: {
    subtitle: string;
    autoPostingBadge: string;
    notificationsBadge: string;
    professional: string;
    professionalDesc: string;
    personal: string;
    personalDesc: string;
    autoPublishing: string;
    autoPublishingDesc: string;
    communityReplies: string;
    communityRepliesDesc: string;
    postMetrics: string;
    postMetricsDesc: string;
    onlyNotifications: string;
    onlyNotificationsDesc: string;
    connectProfessional: string;
    setupPersonal: string;
  };
}

export function AccountTypeModal({
  open,
  onOpenChange,
  platformName,
  PlatformIcon,
  onProfessional,
  onPersonal,
  t,
}: AccountTypeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl p-0 overflow-hidden"
      >
        {/* Accessible title for screen readers */}
        <DialogTitle className="absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] border-0">
          {platformName}
        </DialogTitle>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader className="px-4 pt-6 pb-3 text-center sm:px-6 sm:pt-8 sm:pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <PlatformIcon className="h-7 w-7" />
              <h2 className="text-xl font-bold text-foreground">
                {platformName}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
              {t.subtitle}
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-6 sm:gap-6 sm:px-6 sm:pb-8">
            <div className="relative group/pro">
              <div className="pointer-events-none absolute -inset-px rounded-[20px] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 opacity-0 group-hover/pro:opacity-100 transition-opacity blur-sm" />

              <div className="relative h-full rounded-[20px] border border-white/10 bg-white/[0.02] dark:bg-white/[0.02] backdrop-blur-xl p-4 sm:p-6 flex flex-col">
                <div className="mb-5">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-medium gap-1.5 px-3 py-1.5"
                  >
                    <Zap className="h-3 w-3" />
                    {t.autoPostingBadge}
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t.professional}
                </h3>
                <p className="text-xs text-muted-foreground/50 mb-6">
                  {t.professionalDesc}
                </p>

                <ul className="space-y-3.5 mb-8 flex-1">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center">
                      <Check className="h-3 w-3 text-indigo-400" />
                    </div>
                    <div className="leading-relaxed">
                      <p className="text-sm font-medium text-foreground/90">
                        {t.autoPublishing}
                      </p>
                      <p className="text-xs text-muted-foreground/50">
                        {t.autoPublishingDesc}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center">
                      <Users className="h-3 w-3 text-indigo-400" />
                    </div>
                    <div className="leading-relaxed">
                      <p className="text-sm font-medium text-foreground/90">
                        {t.communityReplies}
                      </p>
                      <p className="text-xs text-muted-foreground/50">
                        {t.communityRepliesDesc}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center">
                      <BarChart3 className="h-3 w-3 text-indigo-400" />
                    </div>
                    <div className="leading-relaxed">
                      <p className="text-sm font-medium text-foreground/90">
                        {t.postMetrics}
                      </p>
                      <p className="text-xs text-muted-foreground/50">
                        {t.postMetricsDesc}
                      </p>
                    </div>
                  </li>
                </ul>

                <Button
                  onClick={onProfessional}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all text-sm font-medium h-11"
                >
                  {t.connectProfessional}
                </Button>
              </div>
            </div>

            <div className="relative group/per">
              <div className="relative h-full rounded-[20px] border border-white/5 bg-white/[0.01] backdrop-blur-xl p-4 sm:p-6 flex flex-col">
                <div className="mb-5">
                  <Badge
                    variant="outline"
                    className="bg-white/5 text-muted-foreground border-white/10 text-xs font-medium gap-1.5 px-3 py-1.5"
                  >
                    <Bell className="h-3 w-3" />
                    {t.notificationsBadge}
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold text-foreground/70 mb-1">
                  {t.personal}
                </h3>
                <p className="text-xs text-muted-foreground/40 mb-6">
                  {t.personalDesc}
                </p>

                <ul className="space-y-3.5 mb-8 flex-1">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                      <Bell className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                    <div className="leading-relaxed">
                      <p className="text-sm font-medium text-foreground/70">
                        {t.onlyNotifications}
                      </p>
                      <p className="text-xs text-muted-foreground/40">
                        {t.onlyNotificationsDesc}
                      </p>
                    </div>
                  </li>
                </ul>

                <div className="flex-1" />

                <Button
                  variant="outline"
                  onClick={onPersonal}
                  className="w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-foreground/80 hover:text-foreground transition-all text-sm font-medium h-11"
                >
                  {t.setupPersonal}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
