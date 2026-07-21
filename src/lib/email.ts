// Transactional e-mail helper built on top of Resend.
//
// Why Resend: zero-config Next.js + Vercel integration, a typed Node SDK, and
// first-class support for verified custom domains (info@postio-app.cz). It is
// the recommended provider in the project's production-deployment plan.
//
// Configuration (Vercel Environment Variables):
//   RESEND_API_KEY      – API key from the Resend dashboard (required).
//   POSTIO_FROM_EMAIL   – verified sender override, e.g. "Postio <info@postio-app.cz>".
//                         Falls back to SENDER_INFO so local dev never fails
//                         hard when the key is missing.
//
// System sender addresses (all verified on the postio-app.cz domain):
//   SENDER_NOREPLY  – noreply@postio-app.cz (password resets, technical e-mails)
//   SENDER_HELLO    – hello@postio-app.cz   (welcome, marketing)
//   SENDER_INFO     – info@postio-app.cz    (general inquiries, default)

import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** HTML body. Provide a plain-text fallback via `text` when possible. */
  html: string;
  text?: string;
  /** Optional Reply-To override (defaults to the configured sender). */
  replyTo?: string;
  /**
   * Optional sender override. When omitted the value from `getFromEmail()`
   * is used, which resolves to `POSTIO_FROM_EMAIL` env var or `SENDER_INFO`.
   * Pass one of the SENDER_* constants to send from a specific system address.
   */
  from?: string;
}

// ── System sender addresses ────────────────────────────────────────────────

/** Technical e-mails: password resets, security notifications. */
export const SENDER_NOREPLY = "Postio <noreply@postio-app.cz>";

/** Welcome and marketing e-mails. */
export const SENDER_HELLO = "Postio <hello@postio-app.cz>";

/** General inquiries – default fallback. */
export const SENDER_INFO = "Postio <info@postio-app.cz>";

const DEFAULT_FROM: string = SENDER_INFO;

/** Resolve the sender address, preferring an explicit env override. */
export function getFromEmail(): string {
  return process.env.POSTIO_FROM_EMAIL || DEFAULT_FROM;
}

/** True when a real Resend API key is configured. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send a single transactional e-mail.
 *
 * Returns `{ success: true, id }` on success, or `{ success: false, error }`
 * on failure so callers can decide how to surface the problem without throwing.
 * When no API key is configured (e.g. local dev) it logs and resolves as a
 * no-op success to keep flows like password reset testable.
 */
export async function sendTransactionalEmail(
  options: SendEmailOptions,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY is not set – skipping transactional e-mail to:",
      options.to,
    );
    return { success: true };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: options.from ?? getFromEmail(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[email] Resend send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown e-mail error";
    console.error("[email] Unexpected send failure:", message);
    return { success: false, error: message };
  }
}

/**
 * Absolute base URL of the running deployment, derived from request headers
 * when available (so it works on any Vercel preview/production URL) and
 * falling back to NEXT_PUBLIC_APP_URL. Shared by auth flows and e-mail links
 * so every generated link points back to the canonical production domain.
 *
 * The returned value is guaranteed to have NO trailing slash, so callers that
 * join it with a leading-slash path (`\`${base}/path\``) never emit a double
 * slash (e.g. `https://postio-app.cz//auth/callback`).
 */
export async function getAppBaseUrl(): Promise<string> {
  let base: string;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) base = `${proto}://${host}`;
    else base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  } catch {
    // `next/headers` is unavailable outside a request scope – fall through.
    base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  return base.replace(/\/+$/, "");
}
