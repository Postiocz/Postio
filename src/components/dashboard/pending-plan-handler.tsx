"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * PendingPlanHandler
 *
 * Watches for a `postio_pending_plan_id` cookie set on the landing page when
 * an unauthenticated user clicked a paid plan CTA. Once the user arrives
 * anywhere inside the dashboard (after login + onboarding + first-post flow)
 * this handler intercepts them and redirects to Stripe checkout.
 *
 * Renders nothing — zero visual footprint.
 */
export function PendingPlanHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const match = document.cookie.match(
      /(?:^|;\s*)postio_pending_plan_id=([^;]*)/
    );
    const planId = match ? decodeURIComponent(match[1]) : null;

    if (!planId) return;

    const locale = pathname.split("/")[1] || "cs";
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: planId,
            locale,
            currency: "eur",
          }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.url) {
          // Clear the cookie so the checkout can't re-trigger on return
          document.cookie =
            "postio_pending_plan_id=; path=/; max-age=0; SameSite=Lax";
          window.location.href = data.url;
        }
        // If checkout returned no usable URL, keep the cookie so it can retry
        // on the next navigation.
      } catch {
        // Network error – keep the cookie for a future retry.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
