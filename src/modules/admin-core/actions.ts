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

/**
 * Načte konkrétního uživatele podle ID (včetně emailu z auth.users).
 */
export async function getUserById(userId: string): Promise<(User & { email?: string }) | null> {
  const supabase = createAdminClient();

  // Načti profil z public.users
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError) {
    console.error("Failed to fetch user:", userError);
    return null;
  }

  // Načti email z auth.users
  const { data: authData } = await supabase.auth.admin.getUserById(userId);

  return {
    ...userData,
    email: authData?.user?.email,
  };
}

/**
 * Načte všechny sociální účty pro daného uživatele.
 */
export async function getUserAccounts(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user accounts:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Načte všechny příspěvky pro daného uživatele.
 */
export async function getUserPosts(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user posts:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Změní roli uživatele a zapiše akci do audit_logs.
 */
export async function updateUserRole(
  userId: string,
  newRole: "user" | "admin"
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to update user role:", updateError);
    return false;
  }

  // Zapiš do audit_logs
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: `role_changed_to_${newRole}`,
    target_table: "users",
    target_id: userId,
    metadata: { new_role: newRole },
  });

  return true;
}
