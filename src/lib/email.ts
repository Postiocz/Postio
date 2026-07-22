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

// Locale messages used by sendWelcomeEmail (loaded directly – next-intl/server
// does not share context in Route Handlers).
import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";

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

// ── Locale helper ──────────────────────────────────────────────────
type LocaleMessages = typeof csMessages;

function loadLocaleMessages(locale: string): LocaleMessages {
  switch (locale) {
    case "en":
      return enMessages;
    case "uk":
      return ukMessages;
    default:
      return csMessages;
  }
}

/**
 * Sends a branded welcome e-mail to a newly registered user.
 *
 * Uses the branded referral-reward template and sends from
 * hello@postio-app.cz. Localised to the locale the user registered
 * with. Best-effort – failures are logged but never thrown.
 */
export async function sendWelcomeEmail(
  email: string,
  locale: string,
): Promise<{ success: boolean; error?: string }> {
  const messages = loadLocaleMessages(locale);
  const welcome = messages.email.welcome;

  const baseUrl = await getAppBaseUrl();
  const appLink = `${baseUrl}/${locale}/dashboard`;

  const html = buildReferralRewardEmailHtml({
    title: welcome.title,
    body: welcome.body,
    cta: welcome.cta,
    appLink,
    footerTagline: messages.email.footerTagline,
  });

  const text = `${welcome.title}\n\n${welcome.body}\n\n${appLink}`;

  const result = await sendTransactionalEmail({
    to: email,
    subject: welcome.subject,
    html,
    text,
    from: SENDER_HELLO,
  });

  if (!result.success) {
    console.error("[email] Failed to send welcome email:", result.error);
  }

  return result;
}

/**
 * Build a branded HTML e-mail for the referral-reward notification.
 *
 * Uses the same design system as `buildResetEmailHtml` in auth.ts:
 * pure-black background, glassmorphism card, indigo CTA – consistent
 * with the Postio brand.
 */
export function buildReferralRewardEmailHtml(params: {
  title: string;
  body: string;
  cta: string;
  appLink: string;
  footerTagline: string;
}): string {
  const { title, body, cta, appLink, footerTagline } = params;

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
      background-color: #000;
      color: #fff;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="font-size:36px;font-weight:800;letter-spacing:-0.02em;margin:0;color:#fff;">
                <span style="color:#6366F1;">P</span>ostio
              </h1>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:rgba(9,9,11,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;">
                <tr>
                  <td align="left" style="padding-bottom:16px;">
                    <h2 style="font-size:24px;font-weight:700;margin:0;color:#fff;">
                      ${title}
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-bottom:24px;">
                    <p style="font-size:16px;line-height:1.6;color:rgba(255,255,255,0.8);margin:0;">
                      ${body}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color:#6366F1;border-radius:12px;padding:0;">
                          <a href="${appLink}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;">
                            ${cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="left">
                    <p style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.5);margin:0;">
                      Postio
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0;">
                ${footerTagline}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
