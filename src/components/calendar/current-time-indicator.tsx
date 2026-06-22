"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface CurrentTimeIndicatorProps {
  /**
   * Vyska jedne hodiny v px v ramci dne/wekview. Parent musi zajistit,
   * ze jeho day grid ma vysku `24 * hourHeight`.
   */
  hourHeight: number;
  /**
   * Popisek u linky – typicky `t("currentTime")`. Pokud neni k dispozici,
   * pouzije se anglicky fallback.
   */
  label?: string;
  /**
   * Volitelne – zobrazit kulatou tecku na leve strane linky.
   */
  showDot?: boolean;
}

/**
 * Cervena linka "Current Time" pro day/week view.
 *
 * Pouziti: parent vyrenderuje relativne pozicovany kontejner
 * (napr. day grid s hourHeight=60), do ktereho vlozi <CurrentTimeIndicator />.
 * Komponenta sama spocita `top` offset z aktualniho casu a zaroven se
 * live obnovuje kazdou minutu (useEffect + setInterval).
 *
 * V kostce:
 *   top = (currentHour + currentMin/60) * hourHeight
 *
 * Cervena barva je zamerne vyrazna – `bg-red-500` s `shadow-[0_0_8px]`,
 * aby uzivatel okamzite videl "jsem tady" i pri vetsim zoomu.
 */
export function CurrentTimeIndicator({
  hourHeight,
  label = "Current time",
  showDot = true,
}: CurrentTimeIndicatorProps) {
  // Interni state – aktualizuje se kazdou minutu. Pocatecni hodnota
  // je `new Date()` – pri SSR by mohlo dojit k hydratacnimu mismatchi
  // (server render v minute X, klient v minute Y), proto v pripade
  // SSR/nebo `undefined` vracime `null` a linka se zobrazi az po hydrataci.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Prvni render – nastavit aktualni cas.
    setNow(new Date());

    // Pak se obnovuje kazdych 30 sekund (zajistime plynuly prechod mezi minutami
    // i pri pomalejsim event loopu).
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 30 * 1000);

    return () => window.clearInterval(id);
  }, []);

  if (!now) return null;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const top = (hours + minutes / 60) * hourHeight;

  // Formatujeme cas v HH:MM
  const timeLabel = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20"
      style={{ top: `${top}px` }}
      aria-label={`${label} ${timeLabel}`}
    >
      {/* Hlavni cervena linka */}
      <div
        className={cn(
          "h-[2px] w-full bg-red-500",
          "shadow-[0_0_8px_rgba(239,68,68,0.6)]"
        )}
      />

      {/* Kulata tecka vlevo – vizualni "jsem tady" */}
      {showDot && (
        <div className="absolute -left-1 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      )}

      {/* Popisek s casem a ikonou – plovouci vlevo, na bilem pozadi pro citelnost */}
      <div
        className={cn(
          "absolute -top-3 left-4 inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-white px-1.5 py-0.5",
          "dark:bg-card",
          "shadow-[0_2px_8px_rgba(239,68,68,0.25)]"
        )}
      >
        <Clock className="h-2.5 w-2.5 text-red-500" />
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}
