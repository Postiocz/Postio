import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import MobileNav from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Logo } from "@/components/ui/logo";
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
  const settingsT = await getTranslations({ locale, namespace: "settings" });
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
    { href: `/${locale}`, label: navT("dashboard"), icon: "dashboard" as const },
    { href: `/${locale}/posts`, label: navT("posts"), icon: "posts" as const },
    { href: `/${locale}/calendar`, label: navT("calendar"), icon: "calendar" as const },
    { href: `/${locale}/analytics`, label: navT("analytics"), icon: "analytics" as const },
    { href: `/${locale}/settings`, label: navT("settings"), icon: "settings" as const },
  ];

  const mobileNavItems = [
    { href: `/${locale}`, label: navT("dashboard"), icon: "dashboard" as const },
    { href: `/${locale}/posts`, label: navT("posts"), icon: "posts" as const },
    { href: `/${locale}/calendar`, label: navT("calendar"), icon: "calendar" as const },
    { href: `/${locale}/analytics`, label: navT("analytics"), icon: "analytics" as const },
    { href: `/${locale}/settings`, label: navT("settings"), icon: "settings" as const },
  ];

  return (
    <div className="flex h-screen bg-background font-sans">
      {/* Desktop Sidebar */}
      <Sidebar 
        navItems={navItems} 
        user={
          session?.email
            ? {
                email: session.email,
                name:
                  (session.user_metadata?.full_name as string | undefined) ||
                  (session.user_metadata?.name as string | undefined) ||
                  undefined,
              }
            : null
        }
        locale={locale}
        authT={{
          logout: authT("logout"),
          upgrade: settingsT("upgrade"),
        }}
        className="hidden lg:flex"
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 shadow-sm dark:shadow-none md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Logo className="text-xl md:hidden" />
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <div className="relative flex-1 overflow-hidden">
          {/* Background Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="bg-purple-600/5 blur-[120px] w-full h-full absolute -z-10" />
            <div className="bg-blue-600/5 blur-[120px] w-full h-full absolute -z-10" />
          </div>

          <main className="relative h-full overflow-y-auto bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] p-4 md:p-6 pb-24 lg:pb-6">
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav locale={locale} />
    </div>
  );
}
