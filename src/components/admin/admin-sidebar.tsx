"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  BarChart3,
} from "lucide-react";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Uživatelé", icon: Users },
  { href: "/admin/posts", label: "Příspěvky", icon: FileText },
  { href: "/admin/analytics", label: "Analytika", icon: BarChart3 },
  { href: "/admin/settings", label: "Nastavení", icon: Settings },
];

export function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col gap-2 overflow-y-auto p-4 bg-[#09090b]/80 border-r border-white/10 backdrop-blur-xl">
      <nav className="flex flex-col gap-1">
        {adminNavItems.map((item) => {
          const href = `/${locale}${item.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
