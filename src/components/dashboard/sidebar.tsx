"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  Link as LinkIcon, 
  Copy, 
  BarChart3, 
  Settings, 
  ChevronUp,
  User
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  posts: FileText,
  accounts: LinkIcon,
  templates: Copy,
  analytics: BarChart3,
  settings: Settings,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
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
  className?: string;
}

export function Sidebar({ 
  navItems, 
  user, 
  locale,
  authT,
  className
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("hidden w-64 flex-col border-r bg-card/50 backdrop-blur-md md:flex shadow-sm dark:shadow-none transition-all duration-300", className)}>
      <div className="flex h-16 items-center px-6">
        <Logo className="text-2xl" />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white/[0.05] backdrop-blur-sm text-foreground shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-4">
        <div className="rounded-[var(--radius)] bg-accent/50 p-3 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate">
                {user?.name || "Uživatel"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <Link href={`/${locale}/settings`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-between gap-2 rounded-xl h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            {authT.upgrade}
            <ChevronUp className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
