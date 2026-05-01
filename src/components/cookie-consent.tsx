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
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Database } from "@/lib/supabase/types";

type CookieConsentRow = Database["public"]["Tables"]["cookie_consents"]["Insert"];

export function CookieConsent() {
  const cookie = useTranslations("cookie");
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent) {
      const data = JSON.parse(consent);
      setAnalytics(data.analytics ?? false);
      setMarketing(data.marketing ?? false);
    } else {
      setShow(true);
    }
  }, []);

  const saveConsent = async (
    level: "necessary" | "analytics" | "all",
    customAnalytics?: boolean,
    customMarketing?: boolean,
  ) => {
    const consentData = {
      necessary: true,
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

  if (!show) return null;

  return (
    <>
      {/* Floating cookie card – bottom-right corner */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border bg-card p-5 shadow-card-dark dark:shadow-card-dark">
          <p className="mb-4 text-sm leading-snug text-muted-foreground">
            {cookie("usesCookies")}{" "}
            <Link
              href={`/${locale}/privacy`}
              className="text-primary underline underline-offset-2"
            >
              {cookie("learnMore")}
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              {cookie("preferences")}
            </Button>
            <Button
              className="flex-1"
              size="sm"
              onClick={() => saveConsent("all")}
            >
              {cookie("acceptAll")}
            </Button>
          </div>
        </div>
      </div>

      {/* Preferences Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {/* Hidden – triggered from floating card above */}
          <span className="hidden">{cookie("preferences")}</span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{cookie("preferencesTitle")}</DialogTitle>
          </DialogHeader>

          <p className="mb-4 text-sm text-muted-foreground">
            {cookie("preferencesIntro")}
          </p>

          {/* Cookie categories */}
          <div className="space-y-4">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {cookie("necessary")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cookie("necessaryDesc")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {cookie("on")}
              </span>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {cookie("analytics")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cookie("analyticsDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {analytics ? cookie("on") : cookie("off")}
                </span>
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                />
              </div>
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {cookie("marketing")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cookie("marketingDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {marketing ? cookie("on") : cookie("off")}
                </span>
                <Switch
                  checked={marketing}
                  onCheckedChange={(v) => setMarketing(v)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => saveConsent("necessary", analytics, marketing)}
            >
              {cookie("savePreferences")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
