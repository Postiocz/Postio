/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  PlusCircle,
  ChevronRight,
  Sparkles,
  Tag,
  RefreshCw,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";
import { Reorder } from "framer-motion";
import { toast } from "sonner";
import { ConnectAccountModal } from "@/components/connect-account-modal";
import {
  FacebookPageSelector,
  type FacebookPageDto,
} from "@/components/facebook-page-selector";

type PlatformId =
  | "instagram"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "tiktok";

type Platform = {
  id: PlatformId;
  icon: ComponentType<{ className?: string }>;
  borderHoverClassName: string;
  hoverGlowClassName: string;
  dragShadow: string;
  iconHoverClassName: string;
};

const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: "instagram",
    icon: Instagram,
    borderHoverClassName: "hover:border-pink-500",
    hoverGlowClassName: "group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]",
    dragShadow: "0 0 45px rgba(236,72,153,0.45)",
    iconHoverClassName: "group-hover:text-white",
  },
  {
    id: "facebook",
    icon: Facebook,
    borderHoverClassName: "hover:border-blue-600",
    hoverGlowClassName: "group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]",
    dragShadow: "0 0 45px rgba(37,99,235,0.4)",
    iconHoverClassName: "group-hover:text-white",
  },
  {
    id: "twitter",
    icon: Twitter,
    borderHoverClassName: "hover:border-gray-400",
    hoverGlowClassName:
      "group-hover:shadow-[0_0_20px_rgba(156,163,175,0.3)]",
    dragShadow: "0 0 45px rgba(156,163,175,0.35)",
    iconHoverClassName: "group-hover:text-white",
  },
  {
    id: "linkedin",
    icon: Linkedin,
    borderHoverClassName: "hover:border-blue-700",
    hoverGlowClassName: "group-hover:shadow-[0_0_20px_rgba(29,78,216,0.3)]",
    dragShadow: "0 0 45px rgba(29,78,216,0.4)",
    iconHoverClassName: "group-hover:text-white",
  },
  {
    id: "youtube",
    icon: Youtube,
    borderHoverClassName: "hover:border-red-600",
    hoverGlowClassName: "group-hover:shadow-[0_0_24px_rgba(220,38,38,0.35)]",
    dragShadow: "0 0 55px rgba(220,38,38,0.45)",
    iconHoverClassName: "group-hover:text-red-600",
  },
  {
    id: "tiktok",
    icon: TikTok,
    borderHoverClassName: "hover:border-cyan-500",
    hoverGlowClassName:
      "group-hover:shadow-[0_0_22px_rgba(6,182,212,0.26),0_0_22px_rgba(236,72,153,0.2)]",
    dragShadow:
      "0 0 40px rgba(6,182,212,0.32), 0 0 40px rgba(236,72,153,0.28)",
    iconHoverClassName:
      "group-hover:text-white [&_.tiktok-pink]:opacity-0 [&_.tiktok-cyan]:opacity-0 group-hover:[&_.tiktok-pink]:opacity-100 group-hover:[&_.tiktok-cyan]:opacity-100 group-hover:[&_.tiktok-pink]:stroke-pink-500 group-hover:[&_.tiktok-cyan]:stroke-cyan-500",
  },
];

type SocialAccount = {
  id: string;
  platform: string;
  account_name: string;
  is_active: boolean;
  avatar_url?: string | null;
  platform_id?: string | null;
  token_expires_at?: string | null;
  /**
   * Per-platform JSON blob. Shape varies by platform:
   *
   *  - **Facebook Pages**: `{ access_token, category }` (see migration 029
   *    + callback route). `category` is the Meta Page category
   *    (e.g. "Marketingová agentura") and is rendered as a small badge
   *    under the account name.
   *  - **YouTube channels**: `{ refresh_token?, custom_url? }`.
   *    `refresh_token` is used by the scheduled-post processor to mint
   *    fresh access tokens (Google access tokens expire after 1 hour).
   *    `custom_url` is the channel handle (e.g. `@pepa`) shown in the UI
   *    so the user can recognise which channel was connected.
   */
  metadata?: {
    access_token?: string;
    category?: string | null;
    refresh_token?: string | null;
    custom_url?: string | null;
  } | null;
};

/**
 * Renders a platform/account avatar image with a graceful fallback.
 * If the image URL fails to load (e.g. 403 / expired CDN), we hide the
 * broken <img> and render the provided fallback node (usually the platform
 * icon) instead.
 */
function PlatformAvatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [accountToDelete, setAccountToDelete] = useState<SocialAccount | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectModalPlatform, setConnectModalPlatform] = useState<{
    id: PlatformId;
    name: string;
    icon: ComponentType<{ className?: string }>;
  } | null>(null);
  // Facebook Pages that are still inactive (pending the user's opt-in).
  // Loaded by GET /api/accounts/facebook/select.
  const [pendingPages, setPendingPages] = useState<FacebookPageDto[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const isDraggingRef = useRef(false);
  // Current user plan – used for client-side account-limit enforcement.
  const [userPlan, setUserPlan] = useState<"free" | "creator" | "pro">("free");

  const platformById = useMemo(() => {
    return new Map(platforms.map((p) => [p.id, p]));
  }, [platforms]);

  // Maximum number of *connected* (active) accounts allowed per plan.
  // Mirrors the server-side limits in src/lib/account-limit.ts.
  const ACCOUNT_LIMITS = { free: 1, creator: 5, pro: Infinity } as const;
  const accountLimit = ACCOUNT_LIMITS[userPlan];
  const activeAccountCount = useMemo(
    () => accounts.filter((a) => a.is_active).length,
    [accounts]
  );
  // True when the user already has as many active accounts as their plan
  // allows (Pro is unlimited, so it is never at the limit).
  const isAtAccountLimit =
    accountLimit !== Infinity && activeAccountCount >= accountLimit;

  function getPlatformLabel(id: PlatformId) {
    return t(`platforms.${id}` as never);
  }

  // Determine token expiry status for an account.
  // Returns { isExpired, daysLeft, label } or null if no expiry info.
  function getTokenStatus(account: SocialAccount) {
    if (!account.token_expires_at) return null;
    const expires = new Date(account.token_expires_at).getTime();
    const now = Date.now();
    const daysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
    const isExpired = expires < now;
    return { isExpired, daysLeft };
  }

  // Open the connect modal for a given platform (used by reconnect button).
  const handleReconnect = useCallback((platform: PlatformId) => {
    const platformDef = platformById.get(platform);
    if (!platformDef) return;
    setConnectModalPlatform({
      id: platform,
      name: getPlatformLabel(platform),
      icon: platformDef.icon,
    });
    setShowConnectModal(true);
  }, [platformById]);

  async function fetchAccounts() {
    try {
      // Load accounts through a server route that strips secrets (access tokens,
      // refresh tokens in metadata) before anything reaches the browser.
      const res = await fetch("/api/accounts", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await res.json()) as {
        accounts?: SocialAccount[];
        error?: string;
      };

      if (!res.ok) {
        setAccounts([]);
        return;
      }

      setAccounts(result.accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchAccounts();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

 
  // Pull the list of Facebook Pages that are still inactive. This is the
  // "tick which Pages to enable" list shown below the connect buttons.
  const fetchPendingPages = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/accounts/facebook/select", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        // Fail silently – the section just stays hidden.
        setPendingPages([]);
        return;
      }
      const data = (await res.json()) as { pages: FacebookPageDto[] };
      setPendingPages(data.pages ?? []);
    } catch {
      setPendingPages([]);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load the user's plan so we can enforce the account limit client-side
  // (proactively block new connections before they hit the server).
  const fetchPlan = async () => {
    const { data } = await supabase.from("users").select("plan").single();
    if (data?.plan) {
      setUserPlan(data.plan as "free" | "creator" | "pro");
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchPendingPages();
      fetchPlan();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // When the user is redirected back from Facebook OAuth, the callback
  // route appends `?fb=connected` to the URL. We use that signal to:
  //   1. open the page selector dialog automatically (if there are pages)
  //   2. clean the query param so a refresh does not re-open the dialog
  useEffect(() => {
    if (searchParams.get("fb") !== "connected") return;
    // Open the dialog only when we actually have pages to pick from.
    // The actual list is fetched in the effect above; we rely on the
    // pendingPages state being populated by the time this runs. The
    // dependency on `pendingPages.length` ensures we re-evaluate when the
    // list arrives.
    if (pendingPages.length > 0) {
      setSelectorOpen(true);
    } else if (!loadingPending) {
      // No pages to pick – just clean the param so we do not loop.
      router.replace(window.location.pathname);
    }
  }, [searchParams, pendingPages.length, loadingPending, router]);

  // ──────────────────────────────────────────────────────────────────
  // OAuth callback signal handling (YouTube + LinkedIn + generic errors)
  // ──────────────────────────────────────────────────────────────────
  // Each Postio OAuth flow appends a single success query param to the
  // post-auth redirect so we can show a toast + refresh the list without
  // guessing which provider just completed:
  //   - `?yt=connected` – `/api/auth/google` (YouTube channel connect)
  //   - `?li=connected` – `/api/accounts/linkedin` (LinkedIn OpenID Connect)
  //   - `?fb=connected` – Supabase Auth Facebook (Pages, see selector below)
  //   - `?error=<msg>`  – any provider reported a failure. The message is
  //     surfaced as a toast so the user knows why nothing was connected.
  // The Facebook Page selector has its own effect above because it needs
  // `pendingPages.length` to decide whether to auto-open the dialog.
  const ytSignal = searchParams.get("yt");
  const liSignal = searchParams.get("li");
  const xSignal = searchParams.get("x");
  const tiktokSignal = searchParams.get("tiktok");
  const errorSignal = searchParams.get("error");
  useEffect(() => {
    if (!ytSignal && !liSignal && !xSignal && !tiktokSignal && !errorSignal) return;

    // Strip the query params from the URL immediately so we never loop on
    // a manual refresh (the same pattern used for `?fb=connected` above).
    if (ytSignal || liSignal || xSignal || tiktokSignal || errorSignal) {
      router.replace(window.location.pathname);
    }

    if (ytSignal === "connected") {
      // Re-fetch the active list so the freshly connected YouTube channel
      // shows up immediately in the connected accounts section below.
      // The toast text is intentionally generic – the actual channel name
      // is visible right next to the toast in the list below.
      fetchAccounts();
      toast.success(t("ytConnectedShort"));
      return;
    }

    if (liSignal === "connected") {
      // Same pattern as YouTube – the LinkedIn OAuth route at
      // `/api/accounts/linkedin` redirects back here with `?li=connected`
      // after a successful upsert into `social_accounts`. We re-fetch the
      // active list and show a localized toast (cs/en/uk via `liConnectedShort`).
      fetchAccounts();
      toast.success(t("liConnectedShort"));
      return;
    }

    if (xSignal === "connected") {
      // X (Twitter) OAuth 2.0 with PKCE – the route at `/api/accounts/x`
      // redirects back here with `?x=connected` after a successful upsert.
      fetchAccounts();
      toast.success(t("xConnectedShort"));
      return;
    }

    if (tiktokSignal === "connected") {
      // TikTok OAuth – the route at `/api/accounts/tiktok` redirects back
      // here with `?tiktok=connected` after a successful upsert.
      fetchAccounts();
      toast.success(t("tiktokConnectedShort"));
      return;
    }

    if (errorSignal) {
      toast.error(t("connectionError", { error: errorSignal }));
    }
  }, [ytSignal, liSignal, xSignal, tiktokSignal, errorSignal, router, t]);

  async function handleDeleteConnectedAccount() {
    if (!accountToDelete) return;

    setDeleting(true);
    setDeleting(true);

    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: accountToDelete.id }),
    });
    const result = (await res.json()) as { error?: string };

    if (!res.ok) {
      toast.error(result.error || t("errorDeletingAccount"));
      setDeleting(false);
      return;
    }

    setAccounts((prev) => prev.filter((a) => a.id !== accountToDelete.id));
    setAccountToDelete(null);
    setDeleting(false);
  }

  if (loading) return <div className="text-muted-foreground">{t("loading")}</div>;

  const hasConnectedAccounts = accounts.some((a) => a.is_active);

  return (
    <div className="relative space-y-8 max-w-3xl mx-auto">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      {/* Top bar */}
      <div className="relative flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground/60">
            {t("connectedAccounts", { count: accounts.filter((a) => a.is_active).length })}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto mt-12 bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl relative">
        <div className="space-y-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40">
            {t("connect")}
          </h2>
          <Reorder.Group
              axis="y"
              values={platforms}
              onReorder={setPlatforms}
              as="div"
              className="flex flex-wrap justify-center gap-4"
            >
              {platforms.map((platform) => (
                <Reorder.Item
                  key={platform.id}
                  value={platform}
                  as="button"
                  type="button"
                  drag
                  onDragStart={() => {
                    isDraggingRef.current = true;
                  }}
                  onDragEnd={() => {
                    window.setTimeout(() => {
                      isDraggingRef.current = false;
                    }, 0);
                  }}
                  onClick={() => {
                    if (isDraggingRef.current) return;
                    // Proactively block NEW connections when the user is at
                    // their plan's account limit. Reconnecting an already
                    // connected (active) account is always allowed because it
                    // does not increase the connected-account count.
                    const alreadyConnected = accounts.some(
                      (a) => a.platform === platform.id && a.is_active
                    );
                    if (isAtAccountLimit && !alreadyConnected) {
                      toast.error(t("accountLimitReached"));
                      return;
                    }
                    // All platforms connect through the universal OAuth modal.
                    setConnectModalPlatform({
                      id: platform.id,
                      name: getPlatformLabel(platform.id),
                      icon: platform.icon,
                    });
                    setShowConnectModal(true);
                  }}
                  whileDrag={{
                    scale: 1.06,
                    boxShadow: platform.dragShadow,
                    zIndex: 50,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 40,
                    mass: 0.5,
                  }}
                  className={`group relative flex h-28 w-28 flex-col items-center justify-center gap-3 rounded-[20px] border border-white/5 bg-card/40 backdrop-blur-md transition-colors will-change-transform cursor-grab active:cursor-grabbing touch-none ${platform.borderHoverClassName} ${platform.hoverGlowClassName}`}
                >
                  <platform.icon
                    className={`h-6 w-6 text-muted-foreground transition-colors ${platform.iconHoverClassName}`}
                  />
                  <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-white">
                    {getPlatformLabel(platform.id)}
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
      </div>

      {/* Pending Facebook Pages – "tick which Pages to enable" section. */}
      {!loadingPending && pendingPages.length > 0 && (
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-500/[0.07] to-indigo-500/[0.07] backdrop-blur-md border border-blue-500/15 rounded-[24px] p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10">
              <Facebook className="h-6 w-6 text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {t("pendingPagesTitle")}
                </h3>
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-xs font-medium text-indigo-300">
                  {pendingPages.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground/70 leading-relaxed">
                {t("pendingPagesSubtitle")}
              </p>
              <Button
                type="button"
                onClick={() => setSelectorOpen(true)}
                className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("managePagesButton")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Compact preview of the first 3 pending pages (avatars only) */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2">
              {pendingPages.slice(0, 4).map((page) => (
                <div
                  key={page.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 overflow-hidden"
                  title={page.account_name}
                >
                  <PlatformAvatar
                    src={page.avatar_url}
                    alt={page.account_name}
                    className="h-full w-full object-cover"
                    fallback={<Facebook className="h-4 w-4 text-blue-300" />}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 truncate">
              {pendingPages
                .slice(0, 3)
                .map((p) => p.account_name)
                .join(", ")}
              {pendingPages.length > 3 &&
                ` ${t("andMore").replace("{count}", String(pendingPages.length - 3))}`}
            </p>
          </div>
        </div>
      )}

      {/* Connected accounts list - glassmorphism cards */}
      {!hasConnectedAccounts ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
            <PlusCircle className="relative h-16 w-16 text-indigo-500/80" />
          </div>
          <p className="text-xl font-medium text-muted-foreground/60">
            {t("noAccounts")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground/40">
            {t("noAccountsSubtitle")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.filter((a) => a.is_active).map((account) => {
            const platform = platformById.get(account.platform as PlatformId);
            const Icon = platform?.icon;
            const tokenStatus = getTokenStatus(account);
            const isExpired = tokenStatus?.isExpired ?? false;
            const expiringSoon = tokenStatus?.daysLeft != null && tokenStatus.daysLeft < 7 && !isExpired;

            return (
              <div
                key={account.id}
                className="max-w-2xl mx-auto bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-6 flex items-center justify-between shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 overflow-hidden">
                    <PlatformAvatar
                      src={
                        account.avatar_url ? String(account.avatar_url) : null
                      }
                      alt={account.account_name}
                      className="h-full w-full object-cover"
                      fallback={
                        Icon ? (
                          <Icon className="h-7 w-7 text-muted-foreground/60" />
                        ) : (
                          <span className="text-2xl">🔗</span>
                        )
                      }
                    />
                    {Icon && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur">
                        <Icon className="h-3.5 w-3.5 text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-lg font-semibold text-foreground">
                      {account.account_name}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {getPlatformLabel(account.platform as PlatformId)}
                    </p>
                    {account.platform === "facebook" &&
                      account.metadata?.category && (
                        <Badge
                          variant="premium"
                          className="mt-1.5 w-fit gap-1 rounded-full px-2 py-0 text-[10px] font-medium"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {account.metadata.category}
                        </Badge>
                      )}
                    {account.platform === "youtube" &&
                      account.metadata?.custom_url && (
                        <Badge
                          variant="premium"
                          className="mt-1.5 w-fit gap-1 rounded-full px-2 py-0 text-[10px] font-medium"
                          title={`YouTube handle: ${account.metadata.custom_url}`}
                        >
                          <Youtube className="h-2.5 w-2.5" />
                          {account.metadata.custom_url}
                        </Badge>
                      )}
                    {/* Token expiry warning */}
                    {isExpired && tokenStatus && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("tokenExpired")}
                      </div>
                    )}
                    {expiringSoon && tokenStatus && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("tokenExpiringSoon", { days: tokenStatus.daysLeft })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  {isExpired ? (
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        {t("tokenExpiredStatus")}
                      </span>
                    </div>
                  ) : expiringSoon ? (
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="text-sm font-medium text-amber-400">
                        {t("tokenExpiringStatus")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      </div>
                      <span className="text-sm font-medium text-emerald-400">
                        {t("active")}
                      </span>
                    </div>
                  )}
                  {/* Reconnect button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReconnect(account.platform as PlatformId)}
                    className="rounded-xl hover:bg-indigo-500/10"
                    title={t("reconnect")}
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-indigo-400" />
                  </Button>
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAccountToDelete(account);
                    }}
                    className="rounded-xl hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setAccountToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDesc", {
                name: accountToDelete?.account_name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccountToDelete(null)}
              disabled={deleting}
            >
              {t("deleteCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConnectedAccount}
              disabled={deleting}
            >
              {t("deleteConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Connect Account Info Modal */}
      {connectModalPlatform && (
        <ConnectAccountModal
          open={showConnectModal}
          onOpenChange={(open) => {
            setShowConnectModal(open);
            if (!open) {
              setConnectModalPlatform(null);
            }
          }}
          platformName={connectModalPlatform.name}
          PlatformIcon={connectModalPlatform.icon}
          onConnect={async () => {
            setShowConnectModal(false);
            const next = window.location.pathname || "/accounts";

            if (connectModalPlatform.id === "linkedin") {
              // LinkedIn OAuth – custom flow via our API route
              const localeMatch = window.location.pathname.match(/\/(cs|en|uk)(?:\/|$)/);
              const locale = localeMatch?.[1] ?? "cs";
              const linkedinAuthUrl = `/api/accounts/linkedin?state=${encodeURIComponent(next)}&locale=${locale}`;
              window.location.assign(linkedinAuthUrl);
            } else if (connectModalPlatform.id === "twitter") {
              // X (Twitter) OAuth 2.0 with PKCE – custom flow via /api/accounts/x
              // PKCE is handled entirely server-side: the route generates the
              // code_verifier, stores it in an httpOnly cookie, derives the
              // code_challenge (S256), and redirects to Twitter. On callback
              // the verifier is read from the cookie – never exposed in the URL.
              const localeMatch = window.location.pathname.match(/\/(cs|en|uk)(?:\/|$)/);
              const locale = localeMatch?.[1] ?? "cs";
              const xAuthUrl = `/api/accounts/x?state=${encodeURIComponent(next)}&locale=${locale}`;
              window.location.assign(xAuthUrl);
            } else if (connectModalPlatform.id === "youtube") {
              // YouTube OAuth via Google – routed through /api/auth/google,
              // which adds `?provider=youtube` to its internal redirect_uri
              // so `/auth/callback` branches into handleYouTubeCallback()
              // BEFORE Supabase tries to sign the user in as a Google
              // identity (which would otherwise ignore the youtube.upload
              // scope and discard our refresh_token request).
              const localeMatch = window.location.pathname.match(/\/(cs|en|uk)(?:\/|$)/);
              const locale = localeMatch?.[1] ?? "cs";
              const googleAuthUrl = `/api/auth/google?state=${encodeURIComponent(next)}&locale=${locale}`;
              window.location.assign(googleAuthUrl);
            } else if (connectModalPlatform.id === "tiktok") {
              // TikTok OAuth – custom flow via /api/accounts/tiktok
              const localeMatch = window.location.pathname.match(/\/(cs|en|uk)(?:\/|$)/);
              const locale = localeMatch?.[1] ?? "cs";
              const tiktokAuthUrl = `/api/accounts/tiktok?state=${encodeURIComponent(next)}&locale=${locale}`;
              window.location.assign(tiktokAuthUrl);
            } else if (connectModalPlatform.id === "instagram") {
              // Instagram Direct Login – no Facebook Page required
              const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "facebook",
                options: {
                  scopes:
                    "public_profile,email,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,business_management",
                  redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&platform=instagram`,
                  queryParams: {
                    auth_type: "rerequest",
                    config_id: "891876470597727",
                  },
                },
              });
              if (error) {
                toast.error(error.message);
                return;
              }
              if (data?.url) {
                window.location.assign(data.url);
              }
            } else {
              // Facebook Page connection
              const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "facebook",
                options: {
                  scopes:
                    "public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts",
                  redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                  queryParams: {
                    auth_type: "rerequest",
                    config_id: "891876470597727",
                  },
                },
              });
              if (error) {
                toast.error(error.message);
                return;
              }
              if (data?.url) {
                window.location.assign(data.url);
              }
            }
          }}
          t={{
            title: t("connectModal.title"),
            autoPublishing: t("connectModal.autoPublishing"),
            analytics: t("connectModal.analytics"),
            aiAssistant: t("connectModal.aiAssistant"),
            warningTitle: t("connectModal.warningTitle"),
            warningDesc:
              connectModalPlatform.id === "instagram"
                ? t("connectModal.warningDescInstagram")
                : connectModalPlatform.id === "linkedin"
                  ? t("connectModal.warningDescLinkedIn")
                  : connectModalPlatform.id === "youtube"
                    ? t("connectModal.warningDescYouTube")
                    : connectModalPlatform.id === "twitter"
                      ? t("connectModal.warningDescX")
                      : connectModalPlatform.id === "tiktok"
                        ? t("connectModal.warningDescTikTok")
                        : t("connectModal.warningDesc"),
            connectButton: t("connectModal.connectButton"),
            learnMore: t("connectModal.learnMore"),
            errorTitle: t("connectModal.errorTitle"),
            learnMoreUrl:
              connectModalPlatform.id === "instagram"
                ? "https://help.instagram.com/601258076737249"
                : connectModalPlatform.id === "linkedin"
                  ? "https://www.linkedin.com/help/linkedin/ask/auth-api-articles"
                  : connectModalPlatform.id === "youtube"
                    ? "https://support.google.com/youtube/answer/2573669"
                    : connectModalPlatform.id === "twitter"
                      ? "https://developer.twitter.com/en/docs/twitter-api"
                      : connectModalPlatform.id === "tiktok"
                        ? "https://developers.tiktok.com/doc/"
                        : "https://www.facebook.com/business/help/193027849380904",
          }}
        />
      )}

      {/* Facebook Page selector dialog (tick which Pages to enable). */}
      <FacebookPageSelector
        pages={pendingPages}
        open={selectorOpen}
        onOpenChange={(open) => {
          setSelectorOpen(open);
          if (!open) {
            // Clean the ?fb=connected query param when the dialog closes so
            // a refresh does not re-open the dialog.
            if (searchParams.get("fb") === "connected") {
              router.replace(window.location.pathname);
            }
            // Refresh the active list so freshly activated Pages show up
            // immediately in the connected accounts section below.
            fetchAccounts();
            fetchPendingPages();
          }
        }}
        onChanged={() => {
          // Re-fetch the active accounts list so the connected accounts
          // section is updated as soon as the user toggles a page on.
          fetchAccounts();
          fetchPendingPages();
        }}
        t={{
          title: t("selectorTitle"),
          subtitle: t("selectorSubtitle"),
          noCategory: t("pageNoCategory"),
          // Dynamic strings are wrapped in functions so next-intl receives
          // the placeholder values and formats them via ICU. Passing a raw
          // string (e.g. `t("pageConnected")`) triggers FORMATTING_ERROR
          // because ICU sees `{name}` but no value is provided.
          categoryLabel: (category) =>
            t("pageCategoryLabel", { category }),
          inactive: t("inactive"),
          activating: t("activating"),
          done: t("done"),
          pageConnected: (name: string) => t("pageConnected", { name }),
          errorToggle: t("errorToggle"),
          emptyState: t("selectorEmpty"),
          activateAll: (count) => t("activateAll", { count }),
          activatingAll: t("activatingAll"),
          allActivated: (count) => t("allActivated", { count }),
          someFailed: (failed) => t("someFailed", { failed }),
          connectPage: t("connectPage"),
        }}
      />
    </div>
  );
}
