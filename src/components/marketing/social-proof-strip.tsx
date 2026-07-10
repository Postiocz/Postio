"use client";

import { useTranslations } from "next-intl";
import { User, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const AVATAR_COLORS = [
  "bg-indigo-500/30 text-indigo-300",
  "bg-purple-500/30 text-purple-300",
  "bg-violet-500/25 text-violet-300",
  "bg-slate-500/30 text-slate-300",
];

export function SocialProofStrip() {
  const t = useTranslations("landing.socialProof");

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pb-20 md:pt-8">
      <Reveal>
        <div className="mx-auto flex w-fit items-center gap-5 rounded-[20px] border border-border bg-card/50 px-6 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
          {/* Overlapping avatar silhouettes */}
          <div className="flex shrink-0 items-center">
            {AVATAR_COLORS.map((color, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background ${color} ${i > 0 ? "-ml-2.5" : ""}`}
              >
                <User className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* Trust text */}
          <p className="text-sm leading-snug text-muted-foreground">
            {t("text")}
          </p>

          {/* Security indicator */}
          <div className="hidden shrink-0 items-center gap-1.5 text-emerald-500 sm:flex">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
