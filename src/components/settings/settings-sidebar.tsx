"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  User,
  SlidersHorizontal,
  Bell,
  Building2,
  CreditCard,
  Tag,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  user: User,
  sliders: SlidersHorizontal,
  bell: Bell,
  building: Building2,
  "credit-card": CreditCard,
  tag: Tag,
};

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

interface Section {
  title: string;
  items: MenuItem[];
}

interface SettingsSidebarProps {
  accountItems: MenuItem[];
  orgItems: MenuItem[];
  featureItems: MenuItem[];
  accountLabel: string;
  orgLabel: string;
  featureLabel: string;
}

export default function SettingsSidebar({
  accountItems,
  orgItems,
  featureItems,
  accountLabel,
  orgLabel,
  featureLabel,
}: SettingsSidebarProps) {
  const pathname = usePathname();

  const sections: Section[] = [
    { title: accountLabel, items: accountItems },
    { title: orgLabel, items: orgItems },
    { title: featureLabel, items: featureItems },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="w-56 flex-shrink-0 rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none overflow-y-auto">
      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || User;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-white/[0.05] dark:text-foreground dark:border-white/10 shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                          : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-primary" : "text-muted-foreground/60")} />
                      {item.label}
                      {active && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
