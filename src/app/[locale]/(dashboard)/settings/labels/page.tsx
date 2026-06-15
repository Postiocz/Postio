import { getTranslations } from "next-intl/server";
import { Tag } from "lucide-react";
import { CreateTagDialog } from "./create-tag-dialog";
import { TagsList } from "./tags-list";
import { TagInfoBanner } from "./tag-info-banner";
import { getUserTagsWithCounts } from "@/lib/actions/tag-actions";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tags" });

  // Fetch tags with their post counts in a single server action (RLS-safe).
  const result = await getUserTagsWithCounts();
  const tags = result.success ? (result.data ?? []) : [];

  const modalTranslations = {
    modalTitle: t("modalTitle"),
    nameLabel: t("nameLabel"),
    namePlaceholder: t("namePlaceholder"),
    colorLabel: t("colorLabel"),
    cancel: t("cancel"),
    create: t("create"),
  };

  const listTranslations = {
    deleteConfirm: t("deleteConfirm"),
    deleteTag: t("deleteTag"),
    editTag: t("editTag"),
    nameLabel: t("nameLabel"),
    namePlaceholder: t("namePlaceholder"),
    colorLabel: t("colorLabel"),
    cancel: t("cancel"),
    save: t("save"),
    tagUpdated: t("tagUpdated"),
    tagNameExists: t("tagNameExists"),
    noPosts: t("noPosts"),
    onePost: t("onePost"),
    postsCount: t("postsCount"),
    postsCountFew: t("postsCountFew"),
    sortByName: t("sortByName"),
    sortByCount: t("sortByCount"),
  };

  const bannerTranslations = {
    text: t("infoBannerText"),
    learnMore: t("infoBannerLearnMore"),
    dismiss: t("infoBannerDismiss"),
  };

  // Translations for the modal opened from the banner's "Zjistit více" link.
  const infoDialogTranslations = {
    title: t("infoDialogTitle"),
    intro: t("infoDialogIntro"),
    whatTitle: t("infoDialogWhatTitle"),
    whatBody: t("infoDialogWhatBody"),
    whyTitle: t("infoDialogWhyTitle"),
    whyItems: [
      t("infoDialogWhyItem1"),
      t("infoDialogWhyItem2"),
      t("infoDialogWhyItem3"),
      t("infoDialogWhyItem4"),
    ],
    howTitle: t("infoDialogHowTitle"),
    howItems: [
      t("infoDialogHowItem1"),
      t("infoDialogHowItem2"),
      t("infoDialogHowItem3"),
      t("infoDialogHowItem4"),
    ],
    visibilityTitle: t("infoDialogVisibilityTitle"),
    visibilityBody: t("infoDialogVisibilityBody"),
    close: t("infoDialogClose"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {tags.length} {t("title").toLowerCase()}
          </p>
        </div>
        <CreateTagDialog t={modalTranslations} />
      </div>

      {/* Sticky info banner – visible in both empty and populated states. */}
      <TagInfoBanner
        t={bannerTranslations}
        infoDialog={infoDialogTranslations}
      />

      {tags.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
            <Tag className="relative h-16 w-16 text-indigo-500/80" />
          </div>
          <h2 className="text-xl font-medium text-muted-foreground/60">
            {t("noTagsYet")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground/40">
            {t("emptySubtitle")}
          </p>
          {/*
            Highlighted description block – visual nod to Buffer's highlighted
            "Create tags to organize…" callout, adapted to the Postio
            glassmorphism design system with an indigo accent.
          */}
          <div className="mt-5 max-w-md rounded-[20px] border border-indigo-500/20 bg-indigo-500/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-indigo-100/90 sm:text-base">
              {t("emptyDescription")}
            </p>
          </div>
          <div className="mt-6">
            <CreateTagDialog t={modalTranslations} />
          </div>
        </div>
      ) : (
        <TagsList tags={tags} locale={locale} t={listTranslations} />
      )}
    </div>
  );
}
