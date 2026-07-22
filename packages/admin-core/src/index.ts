/**
 * Admin Core – hlavní exporty
 * Sdílený framework pro administraci Postio.
 */

export { checkAdminAccess, isAdminGuard } from "./guard";
export { postioAdminConfig } from "./admin-config";
export type { AdminConfig, AdminGuardResult, UserRole } from "./types";
