import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BarChart3, ListOrdered, Share2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { HeroDashboardPreview } from "@/components/marketing/hero-dashboard-preview";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { SocialProofStrip } from "@/components/marketing/social-proof-strip";
import { SiteFooter } from "@/components/marketing/site-footer";

// Single bento cell. `accent` gives the hero feature a subtle brand gradient
// so the grid has visual rhythm (not 3 identical cards).
function BenefitCard({
  icon,
  title,
  desc,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-[20px] border border-border p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors duration-300 hover:bg-accent ${
        accent ? "bg-gradient-to-br from-indigo-500/10 to-transparent" : "bg-card"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6366F1]/15 text-[#818cf8]">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });

  return (
    <main className="relative">
      {/* Hero: asymmetric split (text left, real visual right) */}
      <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-20 pt-28 sm:px-6 md:pb-28">
        {/* Hero glow orbs – subtler in light, stronger in dark */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-purple-500/25 blur-3xl dark:bg-purple-500/40" />
          <div className="absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl dark:bg-indigo-500/40" />
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-[52ch] text-base text-muted-foreground sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/login`}
                className="group inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-6 py-3 text-sm font-medium text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5457e5] active:scale-[0.98]"
              >
                {t("hero.cta")}
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link
                href="#cenik"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-black/5 hover:text-slate-900 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative">
            {/* Glow behind the card – bleeds intentionally (this wrapper has no overflow-hidden) */}
            <div className="absolute -inset-6 rounded-[36px] bg-indigo-500/25 blur-3xl dark:bg-indigo-500/45" />
            <div className="relative w-full overflow-visible">
              <HeroDashboardPreview />
            </div>
          </Reveal>
        </div>
      </section>

      <SocialProofStrip />

      {/* Benefits: bento grid with rhythm (2+1, 1+2) */}
      <section id="funkce" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("benefits.heading")}
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <BenefitCard
              accent
              icon={<Sparkles className="h-5 w-5" />}
              title={t("benefits.aiVisionTitle")}
              desc={t("benefits.aiVisionDesc")}
            />
          </Reveal>
          <Reveal delay={0.05} className="md:col-span-1">
            <BenefitCard
              icon={<ListOrdered className="h-5 w-5" />}
              title={t("benefits.autoQueueTitle")}
              desc={t("benefits.autoQueueDesc")}
            />
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-1">
            <BenefitCard
              icon={<Share2 className="h-5 w-5" />}
              title={t("benefits.multiTitle")}
              desc={t("benefits.multiDesc")}
            />
          </Reveal>
          <Reveal delay={0.15} className="md:col-span-2">
            <BenefitCard
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("benefits.analyticsTitle")}
              desc={t("benefits.analyticsDesc")}
            />
          </Reveal>
        </div>
      </section>

      <PricingSection locale={locale} />

      <FaqSection locale={locale} />

      <SiteFooter locale={locale} />
    </main>
  );
}
