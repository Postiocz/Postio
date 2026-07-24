/**
 * Production-safe logger for Postio.
 *
 * - **Browser / client components**: All output (log, warn, debug) is suppressed
 *   when `NODE_ENV === "production"` or `VERCEL_ENV === "production"`.
 *   `error` and `info` pass through so critical errors are still visible.
 * - **Server-side / API routes**: Same guards apply. Use `logger.error` for
 *   operational errors you want to see in production logs; use `logger.debug`
 *   for development-only traces.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("only in dev", someVar);
 *   logger.error("something broke", err);
 */

const isProduction: boolean =
  (typeof process !== "undefined" &&
    (process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production")) ||
  false;

// Allow list: error and info are always visible so production monitoring works.
function shouldOutput(level: "log" | "warn" | "debug" | "error" | "info"): boolean {
  if (!isProduction) return true;
  return level === "error" || level === "info";
}

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldOutput("log")) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldOutput("warn")) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldOutput("error")) console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (shouldOutput("debug")) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldOutput("info")) console.info(...args);
  },
};

/**
 * Check if the current environment is production.
 * Use this for conditional guards (e.g. "only log this metadata in dev").
 */
export function isProductionEnv(): boolean {
  return isProduction;
}
