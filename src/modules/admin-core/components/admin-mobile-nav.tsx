"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, CreditCard, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AdminMobileNavProps {
  locale: string;
}

type AdminNavItem = {
  id: string;
  icon: React.ElementType;
  path: string;
  labelKey: string;
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
    id: "back",
    icon: ArrowLeft,
    path: "/",
    labelKey: "nav.adminBackToApp",
  },
];

export function AdminMobileNav({ locale }: AdminMobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      <div className="bg-[#09090b]/90 backdrop-blur-xl border-t border-white/5 h-[56px] flex items-center justify-evenly px-1 pb-safe shadow-[0_-4px_20px_rgba(99,102,241,0.06)]">
        {adminNavItems.map((item) => {
          const href = `/${locale}${item.path}`;
          const isActive =
            item.path === "/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");

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
                  isActive && item.id !== "back"
                    ? "text-indigo-400"
                    : "text-zinc-400"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive &&
                      item.id !== "back" &&
                      "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                  )}
                />
                <span className="text-[9px] mt-0.5 font-medium">
                  {t(item.labelKey)}
                </span>
              </motion.div>

              {isActive && item.id !== "back" && (
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
