"use client";

import { useEffect, useState } from "react";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Copy,
  BarChart3,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  posts: FileText,
  accounts: LinkIcon,
  templates: Copy,
  analytics: BarChart3,
  settings: Settings,
};

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
};

export default function MobileNav({
  navItems,
  logoutLabel,
  locale,
}: {
  navItems: NavItem[];
  logoutLabel: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card p-4 md:hidden">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="text-xl font-bold text-primary">Postio</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-2 space-y-1">
              {navItems.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t pt-4">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <LogOut className="h-5 w-5" />
                {logoutLabel}
              </Button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
