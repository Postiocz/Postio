/**
 * Admin Core – Guard (Zabezpečení)
 * Server-side kontrola, zda má uživatel přístup do admin rozhraní.
 */

import type { AdminGuardResult, UserRole } from "./types";

/**
 * Zkontroluje, zda uživatel má roli admin.
 * Používá Supabase client k načtení role z DB.
 *
 * @param supabase - Supabase server client (vytvořený přes createClient)
 * @returns AdminGuardResult s informacemi o uživateli
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkAdminAccess(supabase: any): Promise<AdminGuardResult> {
  // 1. Zkontroluj, zda je uživatel přihlášen
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      userId: null,
      role: null,
    };
  }

  // 2. Načti roli uživatele z DB
  const { data: userData, error: dbError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbError || !userData) {
    // Uživatel neexistuje v public.users
    return {
      isAuthenticated: true,
      isAdmin: false,
      userId: user.id,
      role: null,
    };
  }

  const role = (userData.role ?? "user") as UserRole;

  return {
    isAuthenticated: true,
    isAdmin: role === "admin",
    userId: user.id,
    role,
  };
}

/**
 * Typ guard – ověří, že guard výsledek obsahuje admina.
 * Použití: if (isAdminGuard(guardResult)) { ... }
 */
export function isAdminGuard(result: AdminGuardResult): boolean {
  return result.isAuthenticated && result.isAdmin;
}
