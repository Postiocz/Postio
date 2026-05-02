"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Link as LinkIcon, 
  BarChart3, 
  Settings 
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
    id: "settings", 
    icon: Settings, 
    path: "/settings", 
    labelKey: "nav.settings" 
  },
];

export default function MobileNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations();

  const normalizedPathname = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 h-[64px] flex items-center justify-around px-4 pb-safe">
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
                  "w-6 h-6",
                  isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                )} />
                <span className="text-[10px] mt-1 font-medium">
                  {t(item.labelKey)}
                </span>
              </motion.div>
              
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
