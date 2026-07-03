"use client";

/**
 * TopLabelsChart – 5 nejpoužívanějších interních štítků na dashboardu.
 *
 * Vizualizuje data z tabulek `tags` + `post_tags` (počet příspěvků na štítek).
 * Každý řádek obsahuje:
 *   - Barevnou tečku (10 px) v barvě tagu (z `tags.color`).
 *   - Název tagu.
 *   - Absolutní počet příspěvků.
 *   - Horizontální progress bar vůči TOP1 (100 % šířka).
 *
 * Pokud uživatel nemá žádné tagy nebo žádné příspěvky, komponenta zobrazí
 * prázdný stav s CTA na vytvoření štítků.
 *
 * Animace: framer-motion (fade-in + slide-up na mount, staggered delay).
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Hash, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type TopLabelItem = {
  id: string;
  name: string;
  color: string;
  count: number;
};

interface TopLabelsChartProps {
  labels: TopLabelItem[];
  locale: string;
  translations: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    posts: string;
  };
}

export function TopLabelsChart({ labels, locale, translations }: TopLabelsChartProps) {
  // Prázdný stav – žádné tagy nebo žádné příspěvky se štítky.
  if (labels.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Hash className="h-4 w-4 text-primary" />
            {translations.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Hash className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{translations.emptyTitle}</p>
            <p className="text-xs text-muted-foreground/70">
              {translations.emptyDescription}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-2 rounded-[20px]">
            <Link href={`/${locale}/settings/labels`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {translations.emptyAction}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Nejvyšší počet = 100 % šířka progress baru.
  const maxCount = Math.max(...labels.map((l) => l.count), 1);

  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Hash className="h-4 w-4 text-primary" />
          {translations.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {labels.map((label, index) => {
          const percentage = Math.round((label.count / maxCount) * 100);
          return (
            <motion.div
              key={label.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                    aria-hidden
                  />
                  <span className="truncate font-medium">#{label.name}</span>
                </div>
                <div className="flex items-baseline gap-1 text-xs text-muted-foreground/80 shrink-0">
                  <span className="text-foreground font-semibold tabular-nums">
                    {label.count}
                  </span>
                  <span>{translations.posts}</span>
                </div>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.7, delay: index * 0.06 + 0.1, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${label.color}cc, ${label.color})`,
                    boxShadow: `0 0 8px ${label.color}55`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
