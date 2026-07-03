import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const navT = await getTranslations({ locale, namespace: "nav" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{navT("inbox")}</h1>
        <p className="mt-1 text-muted-foreground">
          {navT("inbox")}
        </p>
      </div>

      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
          <MessageSquare className="relative h-16 w-16 text-indigo-500/80" />
        </div>
        <p className="text-xl font-medium text-muted-foreground/60">
          Brzy zde objevíte zprávy z komunity
        </p>
        <p className="mt-2 text-sm text-muted-foreground/40">
          Tato funkce je právě ve vývoji. Sledujte novinky.
        </p>
      </div>
    </div>
  );
}
