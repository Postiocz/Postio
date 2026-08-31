import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Link as LinkIcon,
  Lock,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  Instagram,
  Facebook,
  Linkedin,
  XIcon,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";

const networks = [
  { Icon: Instagram, label: "Instagram" },
  { Icon: Facebook, label: "Facebook" },
  { Icon: Linkedin, label: "LinkedIn" },
  { Icon: XIcon, label: "X" },
  { Icon: Youtube, label: "YouTube" },
  { Icon: TikTok, label: "TikTok" },
];

/**
 * WelcomeSection – premium onboarding pair for the empty dashboard.
 * Step 1 (connect networks) is the primary action; Step 2 is locked until
 * the first network is connected. Rendered only when the dashboard is empty.
 */
export default function WelcomeSection({
  locale,
  unlocked = false,
}: {
  locale: string;
  unlocked?: boolean;
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Krok 1 – Propojte své sítě (aktivní primární akce) */}
      <Link
        href={`/${locale}/accounts`}
        className="group relative flex flex-col overflow-hidden rounded-[20px] border border-white/10 bg-card/40 p-6 backdrop-blur-xl transition-all duration-200 hover:border-indigo-500/30 hover:bg-card/60 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/25 blur-[80px]" />
        <div className="relative flex flex-1 flex-col">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
              <LinkIcon className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              {t("welcomeStep1Label")}
            </span>
          </div>

          <h3 className="text-xl font-semibold tracking-tight">
            {t("welcomeStep1Title")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("welcomeStep1Desc")}
          </p>

          <div className="mt-6 flex items-center gap-3">
            {networks.map(({ Icon, label }) => (
              <span
                key={label}
                title={label}
                className="inline-flex text-muted-foreground/60 transition-colors group-hover:text-muted-foreground"
              >
                <Icon className="h-5 w-5" />
              </span>
            ))}
          </div>

          <div className="mt-8 inline-flex w-max items-center gap-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 group-hover:bg-indigo-600 group-hover:shadow-indigo-500/35">
            {t("welcomeStep1Cta")}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Krok 2 – Vytvořte první příspěvek (uzamčená, odemyká se po propojení sítě) */}
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-[20px] border border-white/5 bg-card/40 p-6 backdrop-blur-xl sm:p-8",
          !unlocked && "opacity-60"
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
            {t("welcomeStep2Label")}
          </span>
        </div>

        <h3 className="text-xl font-semibold tracking-tight">
          {t("welcomeStep2Title")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("welcomeStep2Desc")}
        </p>

        <div className="mt-auto pt-8">
          {unlocked ? (
            <span className="inline-flex w-max items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              {t("welcomeStep2Unlocked")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              {t("welcomeStep2Locked")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}