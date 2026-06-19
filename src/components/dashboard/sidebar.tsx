"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Copy,
  BarChart3,
  ChevronDown,
  User,
  Calendar,
  SlidersHorizontal,
  Bell,
  Building2,
  CreditCard,
  Tag,
  MessageSquare,
  Settings,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  posts: FileText,
  accounts: LinkIcon,
  templates: Copy,
  analytics: BarChart3,
  calendar: Calendar,
  inbox: MessageSquare,
  settings: Settings,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  navItems: NavItem[];
  user: {
    email: string;
    name?: string;
  } | null;
  locale: string;
  authT: {
    logout: string;
    upgrade: string;
  };
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
    accountLabel: string;
    organizationLabel: string;
    featuresLabel: string;
  };
  className?: string;
}

export function Sidebar({
  navItems,
  user,
  locale,
  authT,
  settingsLabels,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");

  const isSettingsSection =
    normalizedPathname.startsWith("/settings") ||
    normalizedPathname.startsWith("/templates") ||
    normalizedPathname.startsWith("/analytics") ||
    normalizedPathname.startsWith("/inbox");

  const [settingsOpen, setSettingsOpen] = useState(isSettingsSection);

  useEffect(() => {
    if (isSettingsSection) setSettingsOpen(true);
  }, [isSettingsSection]);

  const [inboxSeen, setInboxSeen] = useState(false);

  useEffect(() => {
    try {
      setInboxSeen(window.localStorage.getItem("postio:seen:inbox") === "1");
    } catch {
      setInboxSeen(false);
    }
  }, []);

  useEffect(() => {
    if (!normalizedPathname.startsWith("/inbox")) return;
    try {
      window.localStorage.setItem("postio:seen:inbox", "1");
    } catch {
      // ignore
    }
    setInboxSeen(true);
  }, [normalizedPathname]);

  const settingsHasAttention = !inboxSeen;

  const submenuItems = useMemo(() => {
    return {
      features: [
        { href: `/${locale}/templates`, label: settingsLabels.templates, icon: Copy },
        { href: `/${locale}/analytics`, label: settingsLabels.analytics, icon: BarChart3 },
        {
          href: `/${locale}/inbox`,
          label: settingsLabels.inbox,
          icon: MessageSquare,
          badge: inboxSeen ? undefined : "NEW",
        },
        { href: `/${locale}/settings/labels`, label: settingsLabels.labels, icon: Tag },
      ],
      account: [
        { href: `/${locale}/settings/profile`, label: settingsLabels.profile, icon: User },
        { href: `/${locale}/settings/preferences`, label: settingsLabels.preferences, icon: SlidersHorizontal },
        { href: `/${locale}/settings/notifications`, label: settingsLabels.notifications, icon: Bell },
      ],
      organization: [
        { href: `/${locale}/settings/general`, label: settingsLabels.general, icon: Building2 },
        { href: `/${locale}/settings/billing`, label: settingsLabels.billing, icon: CreditCard },
      ],
    };
  }, [inboxSeen, locale, settingsLabels]);

  return (
    <aside className={cn("hidden w-64 flex-col border-r bg-white/70 dark:bg-card/50 backdrop-blur-md md:flex shadow-[4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300", className)}>
      <div className="flex h-16 items-center px-6">
        <Logo className="text-2xl" />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isSettingsItem = item.icon === "settings";
          const itemPath = item.href.replace(`/${locale}`, "") || "/";
          const isActive = isSettingsItem
            ? isSettingsSection
            : normalizedPathname === itemPath ||
              (itemPath !== "/" && normalizedPathname.startsWith(itemPath));

          const Icon = ICON_MAP[item.icon] || LayoutDashboard;

          if (isSettingsItem) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 backdrop-blur-sm border border-indigo-200 dark:bg-white/[0.05] dark:text-foreground dark:border-white/10 dark:shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                      : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                  )}
                >
                  <span className="relative">
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    {settingsHasAttention && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {item.label}
                    {item.badge && <Badge variant="premium" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>}
                  </span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform duration-200",
                      settingsOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>

                {settingsOpen && (
                  <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/60 dark:bg-card/30 backdrop-blur-md p-2 space-y-2">
                    <div>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {settingsLabels.featuresLabel}
                      </div>
                      <div className="space-y-0.5">
                        {submenuItems.features.map((sub) => {
                          const active =
                            normalizedPathname === sub.href.replace(`/${locale}`, "") ||
                            normalizedPathname.startsWith(sub.href.replace(`/${locale}`, ""));
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200",
                                active
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-white/[0.06] dark:text-foreground"
                                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                              )}
                            >
                              <SubIcon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                              <span className="flex items-center gap-1.5">
                                {sub.label}
                                {sub.badge && <Badge variant="premium" className="text-[10px] px-1.5 py-0">{sub.badge}</Badge>}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {settingsLabels.accountLabel}
                      </div>
                      <div className="space-y-0.5">
                        {submenuItems.account.map((sub) => {
                          const active =
                            normalizedPathname === sub.href.replace(`/${locale}`, "") ||
                            normalizedPathname.startsWith(sub.href.replace(`/${locale}`, ""));
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200",
                                active
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-white/[0.06] dark:text-foreground"
                                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                              )}
                            >
                              <SubIcon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {settingsLabels.organizationLabel}
                      </div>
                      <div className="space-y-0.5">
                        {submenuItems.organization.map((sub) => {
                          const active =
                            normalizedPathname === sub.href.replace(`/${locale}`, "") ||
                            normalizedPathname.startsWith(sub.href.replace(`/${locale}`, ""));
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200",
                                active
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-white/[0.06] dark:text-foreground"
                                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                              )}
                            >
                              <SubIcon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-black/[0.06] dark:bg-white/[0.08]" />

                    <Link
                      href={`/${locale}/settings/billing`}
                      className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                      <span>{authT.upgrade}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.7)]" />
                    </Link>

                    <div className="px-2.5 py-2">
                      <LogoutButton />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-50 text-indigo-700 backdrop-blur-sm border border-indigo-200 dark:bg-white/[0.05] dark:text-foreground dark:border-white/10 dark:shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className="flex items-center gap-1.5">
                {item.label}
                {item.badge && <Badge variant="premium" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>}
              </span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/60 dark:bg-card/30 backdrop-blur-md p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                {user?.name || "Uživatel"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
