import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import PreferencesForm from "./preferences-form";
import type { PostingSchedule } from "./preferences-form";

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let timezone = "Europe/Prague";
  let timeFormat = "24";
  let startOfWeek = "monday";
  let defaultPostingTime = "09:00";
  let postingSchedule: PostingSchedule | null = null;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("timezone, time_format, start_of_week, default_posting_time, posting_schedule")
      .eq("id", user.id)
      .single();

    if (userData) {
      timezone = userData.timezone ?? "Europe/Prague";
      timeFormat = userData.time_format ?? "24";
      startOfWeek = userData.start_of_week ?? "monday";
      defaultPostingTime = userData.default_posting_time ?? "09:00";
      postingSchedule = (userData.posting_schedule as PostingSchedule) ?? null;
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("preferences")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("preferencesDescription")}
        </p>
      </div>

      <PreferencesForm
        timezone={timezone}
        timeFormat={timeFormat}
        startOfWeek={startOfWeek}
        defaultPostingTime={defaultPostingTime}
        postingSchedule={postingSchedule}
        labels={{
          saved: t("savedPreferences"),
          timezone: t("timezone"),
          timezoneDescription: t("timezoneDescription"),
          timeFormat: t("timeFormat"),
          timeFormatDescription: t("timeFormatDescription"),
          timeFormat12: t("timeFormat12"),
          timeFormat24: t("timeFormat24"),
          startOfWeek: t("startOfWEEK"),
          startOfWeekDescription: t("startOfWEEKDescription"),
          defaultPostingAction: t("defaultPostingAction"),
          defaultPostingActionDescription: t("defaultPostingActionDescription"),
          defaultTime: t("defaultTime"),
          sunday: t("sunday"),
          monday: t("monday"),
          queueSchedule: t("queueSchedule"),
          queueScheduleDescription: t("queueScheduleDescription"),
          autoQueueEnabled: t("autoQueueEnabled"),
          addTime: t("addTime"),
          tuesday: t("tuesday"),
          wednesday: t("wednesday"),
          thursday: t("thursday"),
          friday: t("friday"),
          saturday: t("saturday"),
        }}
      />
    </div>
  );
}
