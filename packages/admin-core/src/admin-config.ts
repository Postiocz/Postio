/**
 * Admin Core – konfigurace pro Postio
 * Definuje, jak se admin napojí na konkrétní app.
 */

import type { AdminConfig } from "./types";

/** Výchozí konfigurace pro Postio */
export const postioAdminConfig: AdminConfig = {
  appName: "Postio",
  defaultLocale: "cs",
  locales: ["cs", "en", "uk"],
  adminPaths: ["/admin", "/admin/users", "/admin/audit", "/admin/settings"],
  adminOnlyTables: ["audit_logs"],
};
