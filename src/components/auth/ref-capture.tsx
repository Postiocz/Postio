"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE } from "@/lib/referral-constants";

/**
 * Mounted on the login page. If the URL carries `?ref=CODE`, persists it in a
 * first-party cookie so the referral survives the Google OAuth round-trip and
 * the email-verification magic link before `applyReferral` is called.
 */
export function RefCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(
          ref.trim()
        )}; path=/; max-age=2592000; samesite=lax`;
      }
    } catch {
      // Ignore – referral capture is best-effort.
    }
  }, []);

  return null;
}
