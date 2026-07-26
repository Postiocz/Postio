"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Users, FileText, CreditCard, Settings, BarChart3, MessageCircle, Activity, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminMobileNavProps {
  locale: string;
}

type AdminNavItem = {
  id: string;
  icon: React.ElementType;
  path: string;
  labelKey: string;
  isSettings?: boolean;
};

const adminNavItems: AdminNavItem[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    path: "/admin",
    labelKey: "nav.adminDashboard",
  },
  {
    id: "users",
    icon: Users,
    path: "/admin/users",
    labelKey: "nav.adminUsers",
  },
  {
    id: "posts",
    icon: FileText,
    path: "/admin/posts",
    labelKey: "nav.adminPosts",
  },
  {
    id: "billing",
    icon: CreditCard,
    path: "/admin/billing",
    labelKey: "nav.adminBilling",
  },
  {
    id: "settings",
    icon: Settings,
    path: "#",
    labelKey: "nav.adminOther",
    isSettings: true,
  },
];

// Submenu items for Settings dropdown
const settingsSubmenuItems: AdminNavItem[] = [
  {
    id: "analytics",
    icon: BarChart3,
    path: "/admin/analytics",
    labelKey: "nav.adminAnalytics",
  },
  {
    id: "feedback",
    icon: MessageCircle,
    path: "/admin/feedback",
    labelKey: "nav.adminFeedback",
  },
  {
    id: "system-check",
    icon: Activity,
    path: "/admin/system-check",
    labelKey: "nav.adminSystemCheck",
  },
  {
    id: "settings-page",
    icon: Settings,
    path: "/admin/settings",
    labelKey: "nav.adminSettings",
  },
  {
    id: "back-to-app",
    icon: ArrowLeft,
    path: "/dashboard",
    labelKey: "nav.adminBackToApp",
  },
];

export function AdminMobileNav({ locale }: AdminMobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Check if menu should open from query param
  useEffect(() => {
    if (searchParams.get("menu") === "open") {
      setIsMenuOpen(true);
    }
  }, [searchParams]);

  // Check if any settings submenu item is active
  const isSettingsActive =
    pathname.startsWith(`/${locale}/admin/analytics`) ||
    pathname.startsWith(`/${locale}/admin/feedback`) ||
    pathname.startsWith(`/${locale}/admin/system-check`) ||
    pathname === `/${locale}/admin/settings`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 h-[56px] flex items-center justify-evenly px-1 pb-safe">
        {adminNavItems.map((item) => {
          const href = `/${locale}${item.path}`;
          const isActive =
            item.path === "/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");

          // Settings button - opens dropdown
          if (item.isSettings) {
            return (
              <DropdownMenu key={item.id} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <div className="relative flex flex-col items-center justify-center w-full h-full transition-colors cursor-pointer">
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "flex flex-col items-center justify-center transition-all duration-300",
                        isSettingsActive ? "text-indigo-500" : "text-zinc-500"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5",
                          isSettingsActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                        )}
                      />
                      <span className="text-[9px] mt-0.5 font-medium">
                        {t(item.labelKey)}
                      </span>
                    </motion.div>

                    {isSettingsActive && (
                      <motion.div
                        layoutId="adminActiveNav"
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
                  <DropdownMenuGroup>
                    {settingsSubmenuItems.map((subItem) => {
                      const subHref = `/${locale}${subItem.path}`;
                      const isSubActive = pathname === subHref || pathname.startsWith(subHref + "/");

                      return (
                        <DropdownMenuItem key={subItem.id} asChild className="rounded-xl cursor-pointer">
                          <Link
                            href={subHref}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2",
                              isSubActive && "bg-white/10 dark:bg-white/5"
                            )}
                          >
                            <subItem.icon
                              className={cn(
                                "h-4 w-4 text-slate-600 dark:text-white/70",
                                isSubActive && "text-indigo-500 dark:text-indigo-400"
                              )}
                            />
                            <span className={cn(
                              "text-sm",
                              isSubActive && "font-medium"
                            )}>
                              {t(subItem.labelKey)}
                            </span>
                            {isSubActive && (
                              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            )}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          // Regular nav items
          return (
            <Link
              key={item.id}
              href={href}
              className="relative flex flex-col items-center justify-center w-full h-full transition-colors"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-zinc-400"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                  )}
                />
                <span className="text-[9px] mt-0.5 font-medium">
                  {t(item.labelKey)}
                </span>
              </motion.div>

              {isActive && (
                <motion.div
                  layoutId="adminActiveNav"
                  className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
