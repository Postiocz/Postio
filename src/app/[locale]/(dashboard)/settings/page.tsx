"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  pro: "Pro",
};

const PLAN_PRICES: Record<string, string> = {
  free: "Zdarma",
  creator: "199 Kč/měs",
  pro: "499 Kč/měs",
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const commonT = useTranslations("common");
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("cs");
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("users").select("*").single();
      if (data) {
        setFullName(data.full_name ?? "");
        setLanguage(data.language ?? "cs");
        setPlan(data.plan ?? "free");
      }
      setLoading(false);
    })();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName, language })
      .eq("id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      setMessage(commonT("somethingWentWrong"));
    } else {
      setMessage("Uloženo!");
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div>{commonT("loading")}</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {message && (
        <div className="rounded-md border bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          {message}
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t("language")}</Label>
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
          <CardTitle>{t("plan")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current plan */}
          <div className="mb-4 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("plan")}</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{PLAN_LABELS[plan]}</p>
                <Badge variant={plan === "pro" ? "default" : plan === "creator" ? "secondary" : "outline"}>
                  {PLAN_LABELS[plan]}
                </Badge>
              </div>
            </div>
            <p className="font-medium">{PLAN_PRICES[plan]}</p>
          </div>

          {/* Plan options */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "free" as const, label: "Free", price: "Zdarma" },
              { id: "creator" as const, label: "Creator", price: "199 Kč/měs" },
              { id: "pro" as const, label: "Pro", price: "499 Kč/měs" },
            ].map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-4 text-center ${
                  plan === p.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="font-semibold">{p.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.price}</p>
                {plan !== p.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={p.id === "free"}
                  >
                    {t("upgrade")}
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
          <CardTitle className="text-destructive">Nebezpečná zóna</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Odstranění účtu je nevratná akce. Všechna vaše data budou trvale smazána.
          </p>
          <Button variant="destructive" size="sm">
            {commonT("delete")} účet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
