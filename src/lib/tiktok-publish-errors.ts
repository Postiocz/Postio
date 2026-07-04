export const TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE = "tiktok_sandbox_private_only";

const TIKTOK_SANDBOX_PRIVATE_ONLY_FRAGMENT =
  "unaudited_client_can_only_post_to_private_accounts";

export const DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS =
  "V režimu vývoje (Sandbox) umožňuje TikTok publikovat videa pouze do soukromé sekce 'Pouze já'. Změňte nastavení soukromí a zkuste to znovu.";

export function isTikTokSandboxPrivateOnlyError(error: string | null | undefined): boolean {
  if (!error) return false;
  return error
    .toLowerCase()
    .includes(TIKTOK_SANDBOX_PRIVATE_ONLY_FRAGMENT);
}
