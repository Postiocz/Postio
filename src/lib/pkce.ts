/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0.
 * Used by X (Twitter) and any future OAuth flows that require PKCE.
 *
 * RFC 7636: https://www.rfc-editor.org/rfc/rfc7636
 */

/**
 * Generate a random code verifier (43-128 high-entropy base64url chars).
 */
export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 128);
}

/**
 * SHA-256 hash the code verifier to produce the code challenge (S256 method).
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
