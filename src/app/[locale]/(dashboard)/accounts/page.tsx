"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  X,
  PlusCircle,
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
};

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const supabase = createClient();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(
    null
  );
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const platformById = useMemo(() => {
    return new Map(platforms.map((p) => [p.id, p]));
  }, [platforms]);

  function getPlatformLabel(id: PlatformId) {
    return t(`platforms.${id}` as never);
  }

  async function fetchAccounts() {
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data as SocialAccount[]);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchAccounts();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatform || !accountName || !accessToken) return;

    setConnecting(true);
    setError(null);

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: selectedPlatform,
        accountName,
        accessToken,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || t("errorConnecting"));
      setConnecting(false);
      return;
    }

    setSelectedPlatform(null);
    setAccountName("");
    setAccessToken("");
    fetchAccounts();
    setConnecting(false);
  }

  async function handleDisconnect(id: string) {
    await supabase
      .from("social_accounts")
      .update({ is_active: false })
      .eq("id", id);
    fetchAccounts();
  }

  if (loading) return <div className="text-muted-foreground">Načítání…</div>;

  return (
    <div className="relative space-y-8">
      {/* Background grid & glow effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      {/* Top bar */}
      <div className="relative flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground/60">
            {t("connectedAccounts", { count: accounts.length })}
          </p>
        </div>
        {/* Logo removed from here */}
      </div>

      <div className="max-w-xl mx-auto mt-12 bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl relative">
        {selectedPlatform === null ? (
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
                    setSelectedPlatform(platform.id);
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
        ) : (() => {
          const platform = platformById.get(selectedPlatform);
          const Icon = platform?.icon;
          return (
            <>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  {Icon && <Icon className="h-5 w-5" />}
                  {getPlatformLabel(selectedPlatform)}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPlatform(null);
                    setAccountName("");
                    setAccessToken("");
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleConnect} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="accountName"
                    className="text-sm font-medium text-muted-foreground/80"
                  >
                    {t("accountName")}
                  </Label>
                  <Input
                    id="accountName"
                    placeholder="@username"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                    className="bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="accessToken"
                    className="text-sm font-medium text-muted-foreground/80"
                  >
                    {t("accessToken")}
                  </Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder={t("accessTokenPlaceholder")}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                    className="bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={connecting}
                    className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {connecting
                      ? t("connecting") || "Connecting..."
                      : t("connectAccount") || "Connect Account"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedPlatform(null);
                      setAccountName("");
                      setAccessToken("");
                      setError(null);
                    }}
                    className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </>
          );
        })()}
      </div>

      {/* Connected accounts list */}
      {!selectedPlatform && accounts.length === 0 ? (
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
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const platform = platformById.get(account.platform as PlatformId);
            const Icon = platform?.icon;
            return (
              <Card key={account.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {Icon ? <Icon className="h-6 w-6" /> : "🔗"}
                    </span>
                    <div className="flex flex-col">
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.is_active ? "success" : "outline"}>
                      {account.is_active ? t("connected") : t("disconnected")}
                    </Badge>
                    {account.is_active && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
