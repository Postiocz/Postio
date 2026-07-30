"use client";

/**
 * CountdownTimer – Živý odpočet pro flash sale / promo plány
 * Používá next-intl překlady (landing namespace)
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface Props {
  targetDate: string; // ISO string
}

export function CountdownTimer({ targetDate }: Props) {
  const t = useTranslations("landing.flashSale");
  const [remaining, setRemaining] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!mounted) return null;

  if (remaining <= 0) {
    return (
      <span className="text-[11px] text-red-400 font-medium">
        {t("offerEnded")}
      </span>
    );
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  // For promos ending in > 48h, show days + hours
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const timeStr = t("countdownDays", { days: String(days), hours: String(remHours) });
    return (
      <span className="text-[11px] text-amber-400 font-medium">
        {t("countdownEnds", { time: timeStr })}
      </span>
    );
  }

  // Under 48h - show HH:MM:SS
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const timeStr = t("countdownHours", { hours: hh, minutes: mm, seconds: ss });

  return (
    <span className="text-[11px] text-amber-400 font-mono font-medium tabular-nums">
      {t("countdownEnds", { time: timeStr })}
    </span>
  );
}
