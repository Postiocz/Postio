"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Link as LinkIcon,
  BarChart3,
  Settings,
  User,
  SlidersHorizontal,
  Bell,
  Building2,
  CreditCard,
  Tag,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    path: "/",
    labelKey: "nav.dashboard"
  },
  {
    id: "posts",
    icon: FileText,
    path: "/posts",
    labelKey: "nav.posts"
  },
  {
    id: "calendar",
    icon: Calendar,
    path: "/calendar",
    labelKey: "nav.calendar"
  },
  {
    id: "accounts",
    icon: LinkIcon,
    path: "/accounts",
    labelKey: "nav.accounts"
  },
  {
    id: "analytics",
    icon: BarChart3,
    path: "/analytics",
    labelKey: "nav.analytics"
  },
  {
    id: "inbox",
    icon: MessageSquare,
    path: "/inbox",
    labelKey: "nav.inbox",
    badge: "NEW"
  },
];

interface MobileNavProps {
  locale: string;
  settingsLabels: {
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
}

export default function MobileNav({ locale, settingsLabels }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const settingsT = useTranslations("settings");
  const commonT = useTranslations("common");
  const supabase = createClient();

  const normalizedPathname = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
  const isSettingsPage = normalizedPathname.startsWith("/settings");

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = `/${locale}/login`;
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 h-[56px] flex items-center justify-evenly px-1 pb-safe">
        {navItems.map((item) => {
          const isActive = normalizedPathname === item.path ||
            (item.path !== "/" && normalizedPathname.startsWith(item.path));

          return (
            <Link
              key={item.id}
              href={`/${locale}${item.path === "/" ? "" : item.path}`}
              className="relative flex flex-col items-center justify-center w-full h-full transition-colors"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isActive ? "text-indigo-500" : "text-zinc-500"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                )} />
                <span className="text-[9px] mt-0.5 font-medium flex items-center gap-0.5">
                  {t(item.labelKey)}
                  {item.badge && <Badge variant="premium" className="text-[7px] px-1 py-0 leading-none">{item.badge}</Badge>}
                </span>
              </motion.div>

              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full"
                />
              )}
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative flex flex-col items-center justify-center w-full h-full transition-colors cursor-pointer">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isSettingsPage ? "text-indigo-500" : "text-zinc-500"
                )}
              >
                <Settings className={cn(
                  "w-5 h-5",
                  isSettingsPage && "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                )} />
                <span className="text-[9px] mt-0.5 font-medium">
                  {settingsT("title")}
                </span>
              </motion.div>

              {isSettingsPage && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full"
                />
              )}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-56 p-2 rounded-[20px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white"
          >
            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {settingsLabels.accountLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/profile`} className="flex items-center gap-3 px-3 py-2">
                  <User className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.profile}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/preferences`} className="flex items-center gap-3 px-3 py-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.preferences}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/notifications`} className="flex items-center gap-3 px-3 py-2">
                  <Bell className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.notifications}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {settingsLabels.organizationLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/general`} className="flex items-center gap-3 px-3 py-2">
                  <Building2 className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.general}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/billing`} className="flex items-center gap-3 px-3 py-2">
                  <CreditCard className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.billing}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {settingsLabels.featuresLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/labels`} className="flex items-center gap-3 px-3 py-2">
                  <Tag className="h-4 w-4 text-slate-600 dark:text-white/70" />
                  <span className="text-sm">{settingsLabels.labels}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl cursor-pointer focus:text-destructive"
              >
                <LogOut className="h-4 w-4 text-slate-600 dark:text-white/70" />
                <span className="text-sm">{commonT("logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
