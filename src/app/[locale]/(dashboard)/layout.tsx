import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Copy,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const navT = await getTranslations("nav");
  const authT = await getTranslations("auth");
  const { locale } = await params;
  let session = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    // Supabase unavailable – redirect to login
  }

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const navItems = [
    { href: `/${locale}`, label: navT("dashboard"), icon: LayoutDashboard },
    { href: `/${locale}/posts`, label: navT("posts"), icon: FileText },
    { href: `/${locale}/accounts`, label: navT("accounts"), icon: LinkIcon },
    { href: `/${locale}/templates`, label: navT("templates"), icon: Copy },
    { href: `/${locale}/analytics`, label: navT("analytics"), icon: BarChart3 },
    { href: `/${locale}/settings`, label: navT("settings"), icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">Postio</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <form
            action={async () => {
              "use server";
              const client = await createClient();
              await client.auth.signOut();
              redirect(`/${locale}/login`);
            }}
          >
            <Button type="submit" variant="ghost" className="w-full justify-start gap-3">
              <LogOut className="h-5 w-5" />
              {authT("logout")}
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-primary md:hidden">Postio</span>
            {/* Mobile hamburger menu */}
            <div className="relative md:hidden">
              <label htmlFor="mobile-nav" className="flex cursor-pointer items-center">
                <Menu className="h-6 w-6" />
              </label>
              <input
                id="mobile-nav"
                type="checkbox"
                className="peer absolute -z-10 opacity-0"
              />
              <nav className="absolute left-0 top-full hidden w-56 border rounded-lg bg-card shadow-lg peer-checked:flex flex-col p-2 space-y-1 z-50">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  );
                })}
                <div className="border-t pt-2">
                  <form
                    action={async () => {
                      "use server";
                      const client = await createClient();
                      await client.auth.signOut();
                      redirect(`/${locale}/login`);
                    }}
                  >
                    <Button type="submit" variant="ghost" className="w-full justify-start gap-3">
                      <LogOut className="h-5 w-5" />
                      {authT("logout")}
                    </Button>
                  </form>
                </div>
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
