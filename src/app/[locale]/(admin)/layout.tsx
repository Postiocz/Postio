/**
 * Admin Layout – chráněné rozhraní pro administrátory
 * Používá Admin Core guard k ověření role.
 * Design: Pure Black pozadí, 20px radius, glassmorphism.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess } from "admin-core";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

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
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* Sidebar */}
      <AdminSidebar locale={locale} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader />

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Glow effects */}
          <div className="absolute top-0 right-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />

          <div className="relative p-6 pb-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
