"use client";

import { useEffect, useState } from "react";
import MobileNav from "./mobile-nav";

export default function MobileNavWrapper({
  locale,
  isAdmin,
  adminLabel,
  settingsLabels,
}: {
  locale: string;
  isAdmin?: boolean;
  adminLabel?: string;
  settingsLabels: {
    templates: string;
    analytics: string;
    inbox: string;
    profile: string;
    preferences: string;
    notifications: string;
    general: string;
    billing: string;
    labels: string;
    referrals: string;
    accountLabel: string;
    organizationLabel: string;
    featuresLabel: string;
  };
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MobileNav locale={locale} isAdmin={isAdmin} adminLabel={adminLabel} settingsLabels={settingsLabels} />;
}
