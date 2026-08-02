/**
 * Admin – Feedback přehled
 * Zobrazuje všechny zpětné vazby od uživatelů.
 * i18n: namespace adminFeedbackPage
 */

import { getTranslations } from "next-intl/server";
import { getFeedbackList, updateFeedbackStatus } from "@/lib/actions/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Bug, Lightbulb, HelpCircle, CheckCircle, Eye, Clock } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="h-4 w-4 text-red-400" />,
  feature: <Lightbulb className="h-4 w-4 text-yellow-400" />,
  other: <HelpCircle className="h-4 w-4 text-blue-400" />,
};

const TYPE_COLORS: Record<string, string> = {
  bug: "bg-red-100 dark:bg-red-500/20 text-red-400",
  feature: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-400",
  other: "bg-blue-100 dark:bg-blue-500/20 text-blue-400",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
  read: "bg-blue-100 dark:bg-blue-500/20 text-blue-400",
  resolved: "bg-green-100 dark:bg-green-500/20 text-green-400",
};

export default async function AdminFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminFeedbackPage" });
  const feedback = await getFeedbackList();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          {t("totalFeedback", { count: feedback.length })}
        </p>
      </div>

      {/* Feedback list */}
      {feedback.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <HelpCircle className="h-16 w-16 text-slate-400 dark:text-gray-600 mb-4" />
          <p className="text-slate-500 dark:text-gray-400">{t("noFeedback")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => {
            const status = item.status as string;
            const type = item.type as string;
            const userId = item.user_id as string | null;

            return (
              <div
                key={item.id}
                className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Left side */}
                  <div className="flex-1 space-y-3">
                    {/* Type + Status badges */}
                    <div className="flex items-center gap-2">
                      <Badge className={TYPE_COLORS[type] ?? TYPE_COLORS.other}>
                        <span className="flex items-center gap-1.5">
                          {TYPE_ICONS[type] ?? TYPE_ICONS.other}
                          {t(`type_${type}`)}
                        </span>
                      </Badge>
                      <Badge className={STATUS_COLORS[status] ?? STATUS_COLORS.new}>
                        {t(`status_${status}`)}
                      </Badge>
                    </div>

                    {/* Message */}
                    <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap">
                      {item.message}
                    </p>

                    {/* User + Time */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 dark:text-gray-500">
                      {userId && (
                        <span className="font-mono">
                          {userId.slice(0, 8)}...
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.created_at), "PPp", { locale: cs })}
                      </span>
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div className="flex items-center gap-2">
                    {status === "new" && (
                      <form
                        action={async () => {
                          "use server";
                          await updateFeedbackStatus(item.id, "read");
                          revalidatePath(`/${locale}/admin/feedback`);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("markRead")}
                        </Button>
                      </form>
                    )}
                    {(status === "new" || status === "read") && (
                      <form
                        action={async () => {
                          "use server";
                          await updateFeedbackStatus(item.id, "resolved");
                          revalidatePath(`/${locale}/admin/feedback`);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("markResolved")}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
