"use client";

import { useState, useEffect } from "react";
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
  Link as LinkIcon,
  PlusCircle,
} from "lucide-react";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from "@/components/ui/social-icons";

const PLATFORMS = [
  { 
    id: "instagram", 
    label: "Instagram", 
    icon: Instagram, 
    color: "hover:border-pink-500", 
    glow: "group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]" 
  },
  { 
    id: "facebook", 
    label: "Facebook", 
    icon: Facebook, 
    color: "hover:border-blue-600", 
    glow: "group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]" 
  },
  { 
    id: "twitter", 
    label: "Twitter/X", 
    icon: Twitter, 
    color: "hover:border-gray-400", 
    glow: "group-hover:shadow-[0_0_20px_rgba(156,163,175,0.3)]" 
  },
  { 
    id: "linkedin", 
    label: "LinkedIn", 
    icon: Linkedin, 
    color: "hover:border-blue-700", 
    glow: "group-hover:shadow-[0_0_20px_rgba(29,78,216,0.3)]" 
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
  const [connectPlatform, setConnectPlatform] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data as SocialAccount[]);
    setLoading(false);
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!connectPlatform || !accountName || !accessToken) return;

    setConnecting(true);
    setError(null);

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: connectPlatform,
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

    setConnectPlatform(null);
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
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />
      
      <div className="relative">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground/60">
          {t("connectedAccounts", { count: accounts.length })}
        </p>
      </div>

      {/* Connect buttons */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40">
          {t("connect")}
        </h2>
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setConnectPlatform(platform.id)}
              className={`group relative flex h-28 w-28 flex-col items-center justify-center gap-3 rounded-[20px] border border-white/5 bg-card/40 backdrop-blur-md transition-all hover:scale-105 ${platform.color} ${platform.glow}`}
            >
              <platform.icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-white" />
              <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-white">
                {platform.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Connect form modal */}
      {connectPlatform && (() => {
        const platform = PLATFORMS.find((p) => p.id === connectPlatform);
        const Icon = platform?.icon;
        return (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5" />}
                  {platform?.label}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConnectPlatform(null);
                    setAccountName("");
                    setAccessToken("");
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {error && (
                <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleConnect} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">{t("accountName")}</Label>
                  <Input
                    id="accountName"
                    placeholder="@username"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessToken">{t("accessToken")}</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder={t("accessTokenPlaceholder")}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={connecting}>
                    <Plus className="mr-2 h-4 w-4" />
                    {connecting ? t("connecting") : t("connectAccount")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setConnectPlatform(null);
                      setAccountName("");
                      setAccessToken("");
                      setError(null);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );
      })()}

      {/* Connected accounts list */}
      {accounts.length === 0 ? (
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
        <div className="space-y-3">
          {accounts.map((account) => {
            const platform = PLATFORMS.find((p) => p.id === account.platform);
            const Icon = platform?.icon;
            return (
              <Card key={account.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {Icon ? <Icon className="h-6 w-6" /> : "🔗"}
                    </span>
                    <div>
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
      )}
    </div>
  );
}
