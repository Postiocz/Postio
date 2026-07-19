// Transactional e-mail helper built on top of Resend.
//
// Why Resend: zero-config Next.js + Vercel integration, a typed Node SDK, and
// first-class support for verified custom domains (info@postio-app.cz). It is
// the recommended provider in the project's production-deployment plan.
//
// Configuration (Vercel Environment Variables):
//   RESEND_API_KEY      – API key from the Resend dashboard (required).
//   POSTIO_FROM_EMAIL   – verified sender, e.g. "Postio <info@postio-app.cz>".
//                         Falls back to a sandbox sender so local dev never fails
//                         hard when the key is missing.

import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** HTML body. Provide a plain-text fallback via `text` when possible. */
  html: string;
  text?: string;
  /** Optional Reply-To override (defaults to the configured sender). */
  replyTo?: string;
}

const DEFAULT_FROM = "Postio <info@postio-app.cz>";

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
      from: getFromEmail(),
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
 */
export async function getAppBaseUrl(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  } catch {
    // `next/headers` is unavailable outside a request scope – fall through.
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
