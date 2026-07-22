/**
 * Admin Core – typy
 * Sdílené typy pro admin rozhraní a guard.
 */

/** Role uživatele v systému */
export type UserRole = "user" | "admin";

/** Konfigurace pro konkrétní aplikaci (např. Postio) */
export interface AdminConfig {
  /** Název aplikace */
  appName: string;
  /** Výchozí locale pro admin rozhraní */
  defaultLocale: string;
  /** Podporované lokality */
  locales: string[];
  /** Cesty, které mají být chráněny adminem */
  adminPaths: string[];
  /** Tabulky, které admin může číst globálně (mimo vlastní data) */
  adminOnlyTables: string[];
}

/** Výsledek admin guardu */
export interface AdminGuardResult {
  /** Je uživatel přihlášen? */
  isAuthenticated: boolean;
  /** Je uživatel administrátor? */
  isAdmin: boolean;
  /** ID uživatele (nebo null) */
  userId: string | null;
  /** Role uživatele (nebo null) */
  role: UserRole | null;
}
