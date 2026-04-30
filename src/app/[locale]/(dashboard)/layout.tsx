import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/mobile-nav";
import {
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Copy,
  BarChart3,
  Settings,
  LogOut,
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
  const { locale } = await params;
  const navT = await getTranslations({ locale, namespace: "nav" });
  const authT = await getTranslations({ locale, namespace: "auth" });
  let session = null;
  let supabaseAvailable = true;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    session = user;
  } catch {
    supabaseAvailable = false;
  }

  if (!session && supabaseAvailable) {
    redirect(`/${locale}/login`);
  }

  if (session) {
    try {
      const supabase = await createClient();
      const { data: userData } = await supabase
        .from("users")
        .select("onboarded")
        .eq("id", session.id)
        .single();

      if (!userData?.onboarded) {
        redirect(`/${locale}/onboarding`);
      }
    } catch {
      // let through
    }
  }

  const navItems = [
    { href: `/${locale}`, label: navT("dashboard"), icon: LayoutDashboard },
    { href: `/${locale}/posts`, label: navT("posts"), icon: FileText },
    { href: `/${locale}/accounts`, label: navT("accounts"), icon: LinkIcon },
    { href: `/${locale}/templates`, label: navT("templates"), icon: Copy },
    { href: `/${locale}/analytics`, label: navT("analytics"), icon: BarChart3 },
    { href: `/${locale}/settings`, label: navT("settings"), icon: Settings },
  ];
 
   const mobileNavItems = [
     { href: `/${locale}`, label: navT("dashboard"), icon: "dashboard" as const },
     { href: `/${locale}/posts`, label: navT("posts"), icon: "posts" as const },
     { href: `/${locale}/accounts`, label: navT("accounts"), icon: "accounts" as const },
     { href: `/${locale}/templates`, label: navT("templates"), icon: "templates" as const },
     { href: `/${locale}/analytics`, label: navT("analytics"), icon: "analytics" as const },
     { href: `/${locale}/settings`, label: navT("settings"), icon: "settings" as const },
   ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex shadow-sm dark:shadow-none">
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
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm dark:shadow-none md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xl font-bold text-primary md:hidden">Postio</span>
            <MobileNav
              navItems={mobileNavItems}
              logoutLabel={authT("logout")}
              locale={locale}
            />
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
