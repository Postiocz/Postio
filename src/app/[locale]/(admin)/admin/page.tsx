/**
 * Admin Dashboard – vstupní stránka pro administrátory
 */

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  // Základní statistiky
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <p className="text-muted-foreground">
        Celkem uživatelů: <strong>{userCount ?? 0}</strong>
      </p>
    </div>
  );
}
