import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { type Database } from "@/lib/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📷",
  facebook: "📘",
  twitter: "🐦",
  linkedin: "💼",
};

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("accounts");
  const { locale } = await params;
  const supabase = await createClient();

  type SocialAccount = Database['public']['Tables']['social_accounts']['Row'];
  const result = await supabase
    .from("social_accounts")
    .select('*')
    .order("created_at", { ascending: false });
  const accounts = result.data as SocialAccount[] | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {accounts?.length ?? 0} {t("title").toLowerCase()}
          </p>
        </div>
      </div>

      {/* Connect new account buttons */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("connect")}</h2>
        <div className="flex flex-wrap gap-3">
          {["instagram", "facebook", "twitter", "linkedin"].map((platform) => (
            <Button key={platform} variant="outline" className="gap-2" asChild>
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL}/api/connect/${platform}`}
                className="flex items-center gap-2"
              >
                <span>{PLATFORM_ICONS[platform]}</span>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            </Button>
          ))}
        </div>
      </div>

      {/* Connected accounts */}
      {(!accounts || accounts.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noAccounts")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noAccountsSubtitle")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(accounts || []).map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{PLATFORM_ICONS[account.platform] ?? "🔗"}</span>
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
                  <form
                    action={async () => {
                      "use server";
                      const client = await createClient();
                      await (client as any)
                        .from("social_accounts")
                        .update({ is_active: false })
                        .eq("id", account.id);
                    }}
                  >
                    <Button variant="ghost" size="icon-xs" type="submit">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
