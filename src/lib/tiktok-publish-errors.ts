export const TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE = "tiktok_sandbox_private_only";

const TIKTOK_SANDBOX_PRIVATE_ONLY_FRAGMENT =
  "unaudited_client_can_only_post_to_private_accounts";

export const DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS =
  "TikTok u neauditované aplikace povolí publikování jen na soukromé účty. Nestačí nastavit příspěvek na 'Pouze já' - samotný TikTok účet musí být při publikování nastaven jako soukromý.";

export function isTikTokSandboxPrivateOnlyError(error: string | null | undefined): boolean {
  if (!error) return false;
  return error
    .toLowerCase()
    .includes(TIKTOK_SANDBOX_PRIVATE_ONLY_FRAGMENT);
}
