"use client";

import { useTranslations } from "next-intl";

// Opens the existing cookie preferences dialog from anywhere (e.g. the footer
// "Nastavení cookies" link). The dialog lives in CookieConsent and listens for
// this custom event, so it can be reopened even after consent was already saved.
export function CookieSettingsLink({ className }: { className?: string }) {
  const t = useTranslations("footer");

  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("postio:open-cookie-settings"))
      }
      className={className}
    >
      {t("legal.cookieSettings")}
    </button>
  );
}
