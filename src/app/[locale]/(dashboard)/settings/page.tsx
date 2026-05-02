"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";
import { ChevronRight } from "lucide-react";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  creator: 199,
  pro: 499,
};

export default function SettingsPage() {
  const settingsT = useTranslations("settings");
  const commonT = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("cs");
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No session");
        const { data } = await supabase.from("users").select("*").single();
        if (data) {
          setFullName(data.full_name ?? user.email?.split("@")[0] ?? "");
          setLanguage(data.language ?? "cs");
          setPlan(data.plan ?? "free");
        }
      } catch {
        // Supabase unavailable or no session – dev mode with defaults
        setDevMode(true);
        setFullName("Demo uživatel");
      }
      setLoading(false);
    })();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const currentLocale = pathname.split("/")[1];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session");
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName, language })
        .eq("id", user.id);

      if (error) {
        setMessage(commonT("somethingWentWrong"));
        setSaving(false);
        return;
      } else {
        setMessage(settingsT("saved"));
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage(settingsT("saved"));
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);

    if (language !== currentLocale) {
      setTimeout(() => switchLocale(language), 150);
    }
  };

  if (loading) return <div>{commonT("loading")}</div>;

  const formatPrice = (p: string) => {
    const price = PLAN_PRICES[p];
    return price === 0 ? commonT("free") : `${price} Kč`;
  };

  const switchLocale = (newLocale: string) => {
    const currentLocale = pathname.split("/")[1];
    const nextPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    const query = searchParams.toString();
    window.location.href = query ? `${nextPath}?${query}` : nextPath;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32">
      <h1 className="text-2xl font-bold sm:text-3xl">{settingsT("title")}</h1>

      {devMode && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Dev mode – Supabase auth není dostupná. Data nejsou ukládána do databáze.
        </div>
      )}

      {message && (
        <div className="rounded-md border bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          {message}
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{settingsT("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{settingsT("fullName")}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{settingsT("language")}</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="cs">Čeština</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? commonT("loading") : commonT("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>{settingsT("plan")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current plan */}
          <div className="mb-4 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">{settingsT("currentPlan")}</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold capitalize">{plan}</p>
                <Badge variant={plan === "pro" ? "default" : plan === "creator" ? "secondary" : "outline"}>
                  {plan}
                </Badge>
              </div>
            </div>
            <p className="font-medium">{formatPrice(plan)}</p>
          </div>

          {/* Plan options */}
          <div className="grid gap-3 sm:grid-cols-3">
            {(["free", "creator", "pro"] as const).map((p) => (
              <div
                key={p}
                className={`rounded-lg border p-4 text-center ${
                  plan === p ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="font-semibold capitalize">{p}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatPrice(p)}</p>
                {plan !== p && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                  >
                    {settingsT("upgrade")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{settingsT("dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {settingsT("dangerZoneDesc")}
          </p>
          <Button variant="destructive" size="sm">
            {settingsT("deleteAccount")}
          </Button>

          <div className="w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between hover:bg-destructive/5 transition-all group">
            <LogoutButton />
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
