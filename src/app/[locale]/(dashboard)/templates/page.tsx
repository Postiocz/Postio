import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "templates" });
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {templates?.length ?? 0} {t("title").toLowerCase()}
          </p>
        </div>
        <Link href={`/${locale}/templates/new`} className="sm:w-auto">
          <Button className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            {t("newTemplate")}
          </Button>
        </Link>
      </div>

      {templates?.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
            <Plus className="relative h-16 w-16 text-indigo-500/80" />
          </div>
          <p className="text-xl font-medium text-muted-foreground/60">{t("noTemplates")}</p>
          <p className="mt-2 text-sm text-muted-foreground/40">
            {t("noTemplatesSubtitle")}
          </p>
          <Link href={`/${locale}/templates/new`} className="mt-6">
            <Button
              variant="outline"
              className="gap-2 rounded-[20px] bg-card/40 border-white/5 backdrop-blur-md hover:bg-card/60"
            >
              <Plus className="h-4 w-4" />
              {t("newTemplate")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates || []).map((template: { id: string; name: string; content: string; is_premium: boolean }) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.is_premium && (
                  <Badge variant="warning">Premium</Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {template.content}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/${locale}/posts/new?template=${template.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Copy className="h-3 w-3" />
                      {t("useTemplate")}
                    </Button>
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      const client = await createClient();
                      await client.from("templates").delete().eq("id", template.id);
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
