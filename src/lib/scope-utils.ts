// Shared OAuth scope helpers for connected accounts.
//
// `scope_list` on `social_accounts` holds the scopes granted to an
// account's token. NULL means "unknown" (account connected before the
// column existed). A missing scope must never crash on `.includes()`
// for NULL/undefined input – these helpers centralize that guard.

/**
 * True when `scopeList` is a known (non-null/non-undefined) array that
 * contains `scope`. NULL/undefined ("scope unknown", legacy accounts) is
 * treated as "does not have the scope" and returns false.
 */
export function hasScope(
  scopeList: string[] | null | undefined,
  scope: string
): boolean {
  if (scopeList == null) return false;
  return scopeList.includes(scope);
}

/**
 * True when an account is KNOWN to lack `scope` and should be prompted to
 * reconnect. Only a non-null `scopeList` (we actually know the scopes)
 * without the scope answers "yes". NULL/undefined means "unknown" (account
 * connected before the column existed) – do NOT nag those accounts, so we
 * return false. This keeps the "we don't know" and "we know it lacks it"
 * cases distinct; `!hasScope()` would collapse them (both return false
 * from hasScope, so both would show the banner).
 */
export function needsReconnect(
  scopeList: string[] | null | undefined,
  scope: string
): boolean {
  if (scopeList == null) return false;
  return !scopeList.includes(scope);
}