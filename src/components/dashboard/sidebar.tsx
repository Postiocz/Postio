"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Copy,
  BarChart3,
  ChevronUp,
  User,
  Calendar,
  SlidersHorizontal,
  Bell,
  Building2,
  CreditCard,
  Tag,
  MessageSquare,
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

  return (
    <aside className={cn("hidden w-64 flex-col border-r bg-white/70 dark:bg-card/50 backdrop-blur-md md:flex shadow-[4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300", className)}>
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

      <div className="p-4 space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-3 px-3 py-3 h-auto rounded-[var(--radius)]",
                "bg-gray-50 dark:bg-accent/50 border-gray-200 dark:border-border/50 backdrop-blur-sm",
                "hover:bg-gray-100 dark:hover:bg-accent/70 transition-all duration-200"
              )}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-xs font-semibold truncate">
                  {user?.name || "Uživatel"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-64 p-2 rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {settingsLabels.accountLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/profile`} className="flex items-center gap-3 px-3 py-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.profile}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/preferences`} className="flex items-center gap-3 px-3 py-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.preferences}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/notifications`} className="flex items-center gap-3 px-3 py-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.notifications}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {settingsLabels.organizationLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/general`} className="flex items-center gap-3 px-3 py-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.general}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/billing`} className="flex items-center gap-3 px-3 py-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.billing}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {settingsLabels.featuresLabel}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href={`/${locale}/settings/labels`} className="flex items-center gap-3 px-3 py-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{settingsLabels.labels}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-2" />

            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-xl cursor-pointer focus:text-destructive">
                <LogoutButton />
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 rounded-xl h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <Link href={`/${locale}/settings/billing`}>
            {authT.upgrade}
            <ChevronUp className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
