"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  BarChart3,
  CreditCard,
  ArrowLeft,
} from "lucide-react";

interface AdminNavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
}

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "nav.adminDashboard" },
  { href: "/admin/users", icon: Users, labelKey: "nav.adminUsers" },
  { href: "/admin/posts", icon: FileText, labelKey: "nav.adminPosts" },
  { href: "/admin/billing", icon: CreditCard, labelKey: "nav.adminBilling" },
  { href: "/admin/analytics", icon: BarChart3, labelKey: "nav.adminAnalytics" },
  { href: "/admin/settings", icon: Settings, labelKey: "nav.adminSettings" },
];

export function AdminSidebar({ locale }: { locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/admin") {
      return pathname === fullHref;
    }
    return pathname === fullHref || pathname.startsWith(fullHref + "/");
  };

  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col gap-2 overflow-y-auto p-4 bg-[#09090b]/80 border-r border-white/10 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-indigo-600 text-sm font-bold text-white">
          P
        </div>
        <span className="text-lg font-bold text-white">Admin</span>
      </div>

      <nav className="flex flex-col gap-1">
        {adminNavItems.map((item) => {
          const href = `/${locale}${item.href}`;
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-indigo-400")} />
              {t(item.labelKey)}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <div className="h-px bg-white/10 mx-4 mb-4" />
        <Link
          href={`/${locale}/`}
          className="flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-all duration-200 text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          {t("nav.adminBackToApp")}
        </Link>
      </div>
    </aside>
  );
}
