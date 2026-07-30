"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

console.warn("🚨 DEBUG: PendingPlanHandler.tsx file loaded");

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
    console.warn("🔥 DEBUG: PendingPlanHandler checking cookie on pathname:", pathname);

    const match = document.cookie.match(
      /(?:^|;\s*)postio_pending_plan_id=([^;]*)/
    );
    const planId = match ? decodeURIComponent(match[1]) : null;

    if (!planId) {
      console.warn("🔥 DEBUG: No pending plan cookie found");
      return;
    }

    console.warn(
      "🔥 PendingPlanHandler: found cookie, requesting Stripe checkout for plan:",
      planId
    );

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

        console.warn("🔥 PendingPlanHandler: Stripe response:", data);

        if (res.ok && data.url) {
          // Keep the cookie on failed requests so the checkout can retry.
          document.cookie =
            "postio_pending_plan_id=; path=/; max-age=0; SameSite=Lax";
          window.location.href = data.url;
        } else {
          console.warn(
            "🔥 PendingPlanHandler: checkout returned no usable URL; cookie preserved"
          );
        }
      } catch (err) {
        console.error(
          "🔥 PendingPlanHandler: checkout failed; cookie preserved:",
          err
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
