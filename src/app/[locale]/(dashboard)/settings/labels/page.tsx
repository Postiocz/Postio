import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Tag, Plus } from "lucide-react";
import { CreateTagDialog } from "./create-tag-dialog";
import { TagItem } from "./tag-item";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tags" });
  const supabase = await createClient();

  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .order("created_at", { ascending: false });

  const modalTranslations = {
    modalTitle: t("modalTitle"),
    nameLabel: t("nameLabel"),
    namePlaceholder: t("namePlaceholder"),
    colorLabel: t("colorLabel"),
    cancel: t("cancel"),
    create: t("create"),
  };

  const itemTranslations = {
    deleteConfirm: t("deleteConfirm"),
    deleteTag: t("deleteTag"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {tags?.length ?? 0} {t("title").toLowerCase()}
          </p>
        </div>
        <CreateTagDialog t={modalTranslations} />
      </div>

      {tags?.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
            <Tag className="relative h-16 w-16 text-indigo-500/80" />
          </div>
          <h2 className="text-xl font-medium text-muted-foreground/60">
            {t("emptyTitle")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground/40">
            {t("emptySubtitle")}
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground/50">
            {t("emptyDescription")}
          </p>
          <div className="mt-6">
            <CreateTagDialog t={modalTranslations} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(tags || []).map((tag: { id: string; name: string; color: string }) => (
            <TagItem
              key={tag.id}
              id={tag.id}
              name={tag.name}
              color={tag.color}
              t={itemTranslations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
