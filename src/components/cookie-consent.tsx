"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { type Database } from "@/lib/supabase/types";

type CookieConsentRow = Database["public"]["Tables"]["cookie_consents"]["Insert"];

export function CookieConsent() {
  const cookie = useTranslations("cookie");
  const [show, setShow] = useState(false);
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

  const saveConsent = async (level: "necessary" | "analytics" | "all") => {
    const consentData = {
      necessary: true,
      analytics: level !== "necessary",
      marketing: level === "all",
    };

    localStorage.setItem("cookie-consent", JSON.stringify(consentData));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cookie_consents").upsert(
          { user_id: user.id, ...consentData } as CookieConsentRow,
          { onConflict: "user_id" }
        );
      }
    } catch {
      // Supabase unavailable – consent saved to localStorage only
    }

    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {cookie("usesCookies")}{" "}
            <button className="text-primary underline underline-offset-2">
              {cookie("learnMore")}
            </button>
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="rounded border-input"
              />
              {cookie("analytics")}
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="rounded border-input"
              />
              {cookie("marketing")}
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => saveConsent("necessary")}>
            {cookie("necessaryOnly")}
          </Button>
          <Button size="sm" onClick={() => saveConsent("all")}>
            {cookie("acceptAll")}
          </Button>
        </div>
      </div>
    </div>
  );
}
