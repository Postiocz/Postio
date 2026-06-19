"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updatePreferences } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Clock, Globe, Calendar as CalendarIcon } from "lucide-react";

interface PreferencesFormProps {
  timezone: string;
  timeFormat: string;
  startOfWeek: string;
  defaultPostingTime: string;
  labels: {
    saved: string;
    timezone: string;
    timezoneDescription: string;
    timeFormat: string;
    timeFormatDescription: string;
    timeFormat12: string;
    timeFormat24: string;
    startOfWeek: string;
    startOfWeekDescription: string;
    defaultPostingAction: string;
    defaultPostingActionDescription: string;
    defaultTime: string;
    sunday: string;
    monday: string;
  };
}

const TIMEZONES = [
  { value: "Europe/Prague", label: "(UTC+01:00) Praha, Praha" },
  { value: "Europe/London", label: "(UTC+00:00) Londýn" },
  { value: "Europe/Berlin", label: "(UTC+01:00) Berlín" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paříž" },
  { value: "Europe/Rome", label: "(UTC+01:00) Řím" },
  { value: "Europe/Madrid", label: "(UTC+01:00) Madrid" },
  { value: "Europe/Warsaw", label: "(UTC+01:00) Varšava" },
  { value: "Europe/Vienna", label: "(UTC+01:00) Vídeň" },
  { value: "Europe/Brussels", label: "(UTC+01:00) Brusel" },
  { value: "Europe/Amsterdam", label: "(UTC+01:00) Amsterdam" },
  { value: "Europe/Zurich", label: "(UTC+01:00) Curych" },
  { value: "Europe/Kyiv", label: "(UTC+02:00) Kyjev" },
  { value: "Europe/Budapest", label: "(UTC+01:00) Budapešť" },
  { value: "Europe/Bucharest", label: "(UTC+02:00) Bukurešť" },
  { value: "Europe/Athens", label: "(UTC+02:00) Athény" },
  { value: "Europe/Helsinki", label: "(UTC+02:00) Helsinky" },
  { value: "Europe/Stockholm", label: "(UTC+01:00) Stockholm" },
  { value: "Europe/Copenhagen", label: "(UTC+01:00) Kodaň" },
  { value: "Europe/Dublin", label: "(UTC+00:00) Dublin" },
  { value: "Europe/Lisbon", label: "(UTC+00:00) Lisabon" },
  { value: "America/New_York", label: "(UTC-05:00) New York" },
  { value: "America/Chicago", label: "(UTC-06:00) Chicago" },
  { value: "America/Denver", label: "(UTC-07:00) Denver" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Los Angeles" },
  { value: "America/Toronto", label: "(UTC-05:00) Toronto" },
  { value: "America/Vancouver", label: "(UTC-08:00) Vancouver" },
  { value: "America/Sao_Paulo", label: "(UTC-03:00) Sao Paulo" },
  { value: "America/Mexico_City", label: "(UTC-06:00) Mexico City" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokio" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Šanghaj" },
  { value: "Asia/Hong_Kong", label: "(UTC+08:00) Hong Kong" },
  { value: "Asia/Singapore", label: "(UTC+08:00) Singapur" },
  { value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok" },
  { value: "Asia/Seoul", label: "(UTC+09:00) Soul" },
  { value: "Asia/Mumbai", label: "(UTC+05:30) Mumbai" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Dubai" },
  { value: "Asia/Tehran", label: "(UTC+03:30) Teherán" },
  { value: "Australia/Sydney", label: "(UTC+11:00) Sydney" },
  { value: "Pacific/Auckland", label: "(UTC+13:00) Auckland" },
  { value: "Africa/Cairo", label: "(UTC+02:00) Káhira" },
  { value: "Africa/Lagos", label: "(UTC+01:00) Lagos" },
];

export default function PreferencesForm({
  timezone: initialTimezone,
  timeFormat: initialTimeFormat,
  startOfWeek: initialStartOfWeek,
  defaultPostingTime: initialDefaultPostingTime,
  labels,
}: PreferencesFormProps) {
  const commonT = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [prefState, prefAction] = useActionState(updatePreferences, { error: null, success: false });
  const [saved, setSaved] = useState(false);

  const [timezone, setTimezone] = useState(initialTimezone);
  const [timeFormat, setTimeFormat] = useState(initialTimeFormat);
  const [startOfWeek, setStartOfWeek] = useState(initialStartOfWeek);
  const [defaultPostingTime, setDefaultPostingTime] = useState(initialDefaultPostingTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const formData = new FormData();
    formData.set("timezone", timezone);
    formData.set("time_format", timeFormat);
    formData.set("start_of_week", startOfWeek);
    formData.set("default_posting_time", defaultPostingTime);

    startTransition(() => {
      prefAction(formData);
    });
  };

  const handleSuccess = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (prefState.success && saved === false) {
    handleSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Timezone */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Globe className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold">{labels.timezone}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              {labels.timezoneDescription}
            </p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full sm:w-80 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Time Format */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Clock className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold">{labels.timeFormat}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              {labels.timeFormatDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <label
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200 flex-1 sm:flex-none ${
                  timeFormat === "12"
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    : "border-black/[0.08] dark:border-white/[0.06] bg-background hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="time_format_radio"
                  value="12"
                  checked={timeFormat === "12"}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    timeFormat === "12"
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-400 dark:border-gray-500"
                  }`}
                >
                  {timeFormat === "12" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{labels.timeFormat12}</span>
                  <span className="text-xs text-muted-foreground">10:30 AM</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200 flex-1 sm:flex-none ${
                  timeFormat === "24"
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    : "border-black/[0.08] dark:border-white/[0.06] bg-background hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="time_format_radio"
                  value="24"
                  checked={timeFormat === "24"}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    timeFormat === "24"
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-400 dark:border-gray-500"
                  }`}
                >
                  {timeFormat === "24" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{labels.timeFormat24}</span>
                  <span className="text-xs text-muted-foreground">22:30</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Start of Week */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CalendarIcon className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold">{labels.startOfWeek}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              {labels.startOfWeekDescription}
            </p>
            <select
              value={startOfWeek}
              onChange={(e) => setStartOfWeek(e.target.value)}
              className="flex h-10 w-full sm:w-60 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="sunday">{labels.sunday}</option>
              <option value="monday">{labels.monday}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Default Posting Action */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold">{labels.defaultPostingAction}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
              {labels.defaultPostingActionDescription}
            </p>
            <div className="flex items-center gap-3">
              <Label htmlFor="defaultPostingTime" className="sr-only">
                {labels.defaultTime}
              </Label>
              <input
                type="time"
                id="defaultPostingTime"
                value={defaultPostingTime}
                onChange={(e) => setDefaultPostingTime(e.target.value)}
                className="flex h-10 w-full sm:w-40 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground flex-shrink-0">
                {labels.defaultTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-shrink-0">
          {isPending ? commonT("loading") : commonT("save")}
        </Button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-500">
            <Check className="h-4 w-4" />
            {labels.saved}
          </div>
        )}
        {prefState.error && (
          <p className="text-sm text-red-500">{prefState.error}</p>
        )}
      </div>
    </form>
  );
}
