"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type User = Database["public"]["Tables"]["users"]["Row"];

/**
 * Načte VŠECHNY uživatele z DB (globální pohled pro admina).
 * Používá createAdminClient (service_role) k obcházení RLS.
 */
export async function getAllUsers(): Promise<User[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch all users:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Globální statistiky pro admin dashboard.
 * Počet všech uživatelů a celkem všech příspěvků napříč platformou.
 */
export async function getGlobalStats(): Promise<{
  totalUsers: number;
  totalPosts: number;
  payingUsers: number;
}> {
  const supabase = createAdminClient();

  // Počet všech uživatelů
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Celkem všech příspěvků (napříč všemi uživateli)
  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  // Počet placenců
  const { count: payingUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("plan", ["creator", "pro"]);

  return {
    totalUsers: totalUsers ?? 0,
    totalPosts: totalPosts ?? 0,
    payingUsers: payingUsers ?? 0,
  };
}
