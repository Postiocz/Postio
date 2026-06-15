"use client";

/**
 * PlatformDonutChart – rozdělení publikovaných příspěvků podle platformy.
 *
 * Data se agregují z `post_platforms` (status = 'published') pro daného uživatele.
 * Vizualizuje poměr Facebook vs. Instagram vs. ostatní platformy.
 *
 * Barvy jsou brand colors platforem:
 *   - Facebook: #1877F2 (modrá)
 *   - Instagram: gradient #E1306C → #F56040 → #FCAF45 (růžovo-oranžová), pro grafy
 *     použijeme zjednodušenou reprezentaci #E1306C.
 *   - Ostatní: neutrální indigo/purple z palety Postio (#a855f7).
 *
 * Pokud uživatel nemá žádné publikované příspěvky, komponenta zobrazí prázdný stav.
 *
 * Animace: recharts má vlastní `animationBegin` / `animationDuration` na `Pie`,
 * entry animace je tím pádem zdarma.
 */

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PlatformDatum = {
  name: string;
  value: number;
  color: string;
};

interface PlatformDonutChartProps {
  data: PlatformDatum[];
  total: number;
  translations: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    published: string;
  };
}

const customTooltipStyle: React.CSSProperties = {
  backgroundColor: "#09090b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "8px 12px",
  color: "#e4e4e7",
  backdropFilter: "blur(12px)",
  fontSize: "12px",
};

export function PlatformDonutChart({
  data,
  total,
  translations,
}: PlatformDonutChartProps) {
  // Prázdný stav.
  if (total === 0 || data.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Share2 className="h-4 w-4 text-primary" />
            {translations.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Share2 className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{translations.emptyTitle}</p>
            <p className="text-xs text-muted-foreground/70">
              {translations.emptyDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // První platforma v datech je dominantní – zobrazíme ji ve středu donut chartu.
  const dominant = data.reduce(
    (acc, item) => (item.value > acc.value ? item : acc),
    data[0]
  );

  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Share2 className="h-4 w-4 text-primary" />
          {translations.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={700}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={((value: unknown, name: unknown) => [
                  `${value} ${translations.published}`,
                  String(name),
                ]) as never}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Střed donut chartu – dominantní platforma. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70"
            >
              {dominant.name}
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {Math.round((dominant.value / total) * 100)}%
            </span>
          </motion.div>
        </div>

        {/* Legenda */}
        <ul className="space-y-1.5">
          {data.map((item, index) => {
            const pct = Math.round((item.value / total) * 100);
            return (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 + 0.15 }}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-baseline gap-1 text-muted-foreground/80">
                  <span className="font-semibold text-foreground tabular-nums">
                    {item.value}
                  </span>
                  <span className="tabular-nums">({pct}%)</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
