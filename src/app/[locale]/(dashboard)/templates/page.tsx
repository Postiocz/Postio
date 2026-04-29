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
  const t = await getTranslations("templates");
  const commonT = await getTranslations("common");
  const { locale } = await params;
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {templates?.length ?? 0} {t("title").toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("newTemplate")}
        </Button>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noTemplates")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noTemplatesSubtitle")}</p>
          </CardContent>
        </Card>
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

