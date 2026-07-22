/**
 * Admin Layout – chráněné rozhraní pro administrátory
 * Používá Admin Core guard k ověření role.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess } from "admin-core";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  // Ověř, že uživatel je admin
  const guard = await checkAdminAccess(supabase);

  if (!guard.isAuthenticated || !guard.isAdmin) {
    // Přesměruj na login (nebo 404, pokud uživatel není admin)
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Admin header */}
      <header className="border-b border-gray-200 dark:border-border bg-white/80 dark:bg-card/50 backdrop-blur-sm px-4 md:px-6">
        <div className="flex h-14 items-center justify-between">
          <h1 className="text-lg font-semibold">Admin – Postio</h1>
        </div>
      </header>

      {/* Admin content */}
      <main className="p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
