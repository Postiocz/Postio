/**
 * Admin Core – konfigurace pro Postio
 * Definuje nastavení admin rozhraní.
 */

export const adminConfig = {
  appName: "Postio",
  defaultLocale: "cs",
  locales: ["cs", "en", "uk"],
  primaryColor: "#6366F1", // indigo/purple
  backgroundColor: "#000000", // pure black
  cardBackground: "#09090b",
  borderRadius: "20px",
  adminPaths: ["/admin", "/admin/users"],
  adminOnlyTables: ["audit_logs"],
} as const;
