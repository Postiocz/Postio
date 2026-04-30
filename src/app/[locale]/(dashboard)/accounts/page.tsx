"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📷" },
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "twitter", label: "Twitter/X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {accounts.length} {t("title").toLowerCase()}
        </p>
      </div>

      {/* Connect buttons */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("connect")}</h2>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((platform) => (
            <Button
              key={platform.id}
              variant="outline"
              className="gap-2"
              onClick={() => setConnectPlatform(platform.id)}
            >
              <span>{platform.icon}</span>
              {platform.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Connect form modal */}
      {connectPlatform && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {PLATFORMS.find((p) => p.id === connectPlatform)?.icon}{" "}
                {PLATFORMS.find((p) => p.id === connectPlatform)?.label}
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
      )}

      {/* Connected accounts list */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noAccounts")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noAccountsSubtitle")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {PLATFORMS.find((p) => p.id === account.platform)?.icon ?? "🔗"}
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
          ))}
        </div>
      )}
    </div>
  );
}
