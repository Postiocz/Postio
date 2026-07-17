"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Database } from "@/lib/supabase/types";

type CookieConsentRow = Database["public"]["Tables"]["cookie_consents"]["Insert"];

export function CookieConsent() {
  const cookie = useTranslations("cookie");
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const isPrivacyPage = pathname.replace(/\/$/, "") === `/${locale}/privacy`;
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent) {
      const data = JSON.parse(consent);
      setFunctional(data.functional ?? false);
      setAnalytics(data.analytics ?? false);
      setMarketing(data.marketing ?? false);
    } else {
      setShow(true);
    }
  }, []);

  // Allow the footer "Nastavení cookies" link (and any other surface) to reopen
  // the preferences dialog even after consent was already saved.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("postio:open-cookie-settings", handler);
    return () =>
      window.removeEventListener("postio:open-cookie-settings", handler);
  }, []);

  const saveConsent = async (
    level: "necessary" | "analytics" | "all",
    customFunctional?: boolean,
    customAnalytics?: boolean,
    customMarketing?: boolean,
  ) => {
    const consentData = {
      necessary: true,
      functional: customFunctional ?? level !== "necessary",
      analytics: customAnalytics ?? level !== "necessary",
      marketing: customMarketing ?? level === "all",
    };

    localStorage.setItem("cookie-consent", JSON.stringify(consentData));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cookie_consents").upsert(
          { user_id: user.id, ...consentData } as CookieConsentRow,
          { onConflict: "user_id" },
        );
      }
    } catch {
      // Supabase unavailable – consent saved to localStorage only
    }

    setShow(false);
    setOpen(false);
  };

  return (
    <>
      {/* Floating cookie card – shown only until consent is given, hidden on /privacy */}
      {show && !isPrivacyPage && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] z-50 lg:left-auto lg:right-6 lg:bottom-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/40 p-4 lg:p-5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <p className="mb-4 lg:mb-6 text-[11px] leading-tight lg:text-sm lg:leading-relaxed text-muted-foreground">
            {cookie("usesCookies")}{" "}
            <Link
              href={`/${locale}/privacy`}
              className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80 transition-colors"
            >
              {cookie("learnMore")}
            </Link>
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl px-4 h-9 text-xs lg:h-10 lg:text-sm"
              onClick={() => setOpen(true)}
            >
              {cookie("preferences")}
            </Button>
            <Button
              className="flex-1 rounded-2xl px-4 h-9 text-xs lg:h-10 lg:text-sm"
              size="sm"
              onClick={() => saveConsent("all")}
            >
              {cookie("acceptAll")}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Preferences Dialog – always mounted so it can be reopened from the footer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/60 backdrop-blur-2xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {cookie("preferencesTitle")}
            </DialogTitle>
          </DialogHeader>

          <p className="mb-6 text-sm text-muted-foreground">
            {cookie("preferencesIntro")}
          </p>

          {/* Cookie categories */}
          <div className="space-y-4">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {cookie("necessary")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cookie("necessaryDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {cookie("on")}
                </div>
              </div>
            </div>

            {/* Functional */}
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {cookie("functional")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cookie("functionalDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={functional}
                  onCheckedChange={setFunctional}
                />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {cookie("analytics")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cookie("analyticsDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                />
              </div>
            </div>

            {/* Advertising */}
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {cookie("advertising")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cookie("advertisingDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={marketing}
                  onCheckedChange={setMarketing}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-2xl px-6 w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {cookie("close")}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl px-6 w-full sm:w-auto"
                onClick={() => saveConsent("necessary", functional, analytics, marketing)}
              >
                {cookie("savePreferences")}
              </Button>
              <Button
                size="sm"
                className="rounded-2xl px-6 w-full sm:w-auto"
                onClick={() => saveConsent("all")}
              >
                {cookie("acceptAll")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
