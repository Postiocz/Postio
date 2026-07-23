/**
 * Admin Core – hlavní exporty
 * Centralizovaný modul pro administraci Postio.
 */

export { adminConfig } from "./admin-config";
export { checkAdminAccess, isAdminGuard } from "admin-core";
export { getAllUsers, getGlobalStats } from "./actions";

export type { AdminGuardResult, UserRole } from "admin-core";
