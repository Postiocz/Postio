/**
 * Admin – Detail uživatele
 * URL: /admin/users/[id]
 * Design: Pure Black pozadí, 20px radius, glassmorphism, fialové akcenty.
 * i18n: namespace adminUserDetail
 */

import { getTranslations } from "next-intl/server";
import { getUserById, getUserAccounts, getUserPosts, updateUserRole, updateUserCredits } from "@/modules/admin-core/actions";
import { SendLowCreditsAlertButton, QuickActions } from "@/components/admin/user-control-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import Link from "next/link";
import {
  Users,
  Mail,
  Calendar,
  Shield,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  ArrowLeft,
  Coins,
  Globe,
} from "lucide-react";
import { revalidatePath } from "next/cache";

const PLATFORM_ICONS: Record<string, React.ReactElement> = {
  instagram: <ExternalLink className="h-4 w-4 text-pink-400" />,
  facebook: <ExternalLink className="h-4 w-4 text-blue-400" />,
  twitter: <ExternalLink className="h-4 w-4 text-sky-400" />,
  linkedin: <ExternalLink className="h-4 w-4 text-blue-300" />,
  youtube: <ExternalLink className="h-4 w-4 text-red-400" />,
  tiktok: <ExternalLink className="h-4 w-4 text-slate-900 dark:text-white" />,
};

// UI language the user has set in the app (drives e-mail localization too).
const LANGUAGE_LABELS: Record<string, string> = {
  cs: "Čeština",
  en: "English",
  uk: "Українська",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 dark:bg-gray-500/20 text-slate-500 dark:text-gray-400",
  scheduled: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-400",
  publishing: "bg-blue-100 dark:bg-blue-500/20 text-blue-400",
  published: "bg-green-100 dark:bg-green-500/20 text-green-400",
  failed: "bg-red-100 dark:bg-red-500/20 text-red-400",
};

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "adminUserDetail" });

  // Načti data uživatele
  const user = await getUserById(id);
  const accounts = await getUserAccounts(id);
  const posts = await getUserPosts(id);

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-slate-400 dark:text-gray-500">{t("userNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/admin/users`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToUsers")}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {t("idLabel", { id: user.id.slice(0, 8) + "..." })}
          </p>
        </div>

        {/* Role toggle */}
        <form
          action={async () => {
            "use server";
            await updateUserRole(id, user.role === "admin" ? "user" : "admin");
            revalidatePath(`/${locale}/admin/users/${id}`);
          }}
        >
          <Button
            type="submit"
            variant={user.role === "admin" ? "default" : "outline"}
            className={
              user.role === "admin"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
            }
          >
            {user.role === "admin" ? (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t("admin")}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t("promoteToAdmin")}
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Profile Card */}
      <div className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-slate-100 dark:bg-white/5 text-3xl font-bold text-slate-900 dark:text-white">
            {user.full_name?.charAt(0) ?? user.id.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user.full_name ?? t("unknownUser")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {user.email ?? t("emailNotAvailable")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  {t("registered")} {format(new Date(user.created_at), "PPp", { locale: cs })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  {t("role")}{" "}
                  <Badge
                    className={
                      user.role === "admin"
                        ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                        : "bg-gray-100 dark:bg-gray-500/20 text-slate-500 dark:text-gray-400"
                    }
                  >
                    {user.role === "admin" ? t("admin") : t("user")}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  {t("plan")}{" "}
                  <Badge
                    className={
                      user.plan === "pro"
                        ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                        : user.plan === "creator"
                        ? "bg-blue-100 dark:bg-blue-500/20 text-blue-400"
                        : "bg-gray-100 dark:bg-gray-500/20 text-slate-500 dark:text-gray-400"
                    }
                  >
                    {user.plan === "free" ? t("freePlan") : user.plan === "creator" ? "Creator" : "Pro"}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                <span className="text-sm text-slate-600 dark:text-gray-300">{t("streakValue", { count: user.streak ?? 0 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  {t("language")}{" "}
                  <Badge className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
                    {LANGUAGE_LABELS[user.language] ?? LANGUAGE_LABELS["cs"]}
                  </Badge>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions – Prompt 060 Krok 4 */}
      <QuickActions userId={id} isActive={user.is_active} />

      {/* Credits Management - Prompt 044-REVISED KROK 2 */}
      <div className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("creditsManagement")}</h3>
          </div>
          <SendLowCreditsAlertButton userId={id} />
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            const aiCredits = parseInt(formData.get("ai_credits") as string, 10) || 0;
            const twitterCredits = parseInt(formData.get("twitter_auto_credits") as string, 10) || 0;
            await updateUserCredits(id, { ai_credits: aiCredits, twitter_auto_credits: twitterCredits });
            revalidatePath(`/${locale}/admin/users/${id}`);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai_credits" className="text-sm text-slate-600 dark:text-gray-300">
                {t("aiCreditsLabel")}
              </Label>
              <Input
                type="number"
                id="ai_credits"
                name="ai_credits"
                defaultValue={user.ai_credits ?? 0}
                min={0}
                className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 dark:text-gray-500">{t("aiCreditsHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_auto_credits" className="text-sm text-slate-600 dark:text-gray-300">
                {t("twitterCreditsLabel")}
              </Label>
              <Input
                type="number"
                id="twitter_auto_credits"
                name="twitter_auto_credits"
                defaultValue={user.twitter_auto_credits ?? 0}
                min={0}
                className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 dark:text-gray-500">{t("twitterCreditsHint")}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {t("saveCredits")}
            </Button>
          </div>
        </form>
      </div>

      {/* Two-column layout: Accounts + Posts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Social Accounts */}
        <div className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            {t("connectedAccounts", { count: accounts.length })}
          </h3>

          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500">{t("noAccounts")}</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-[20px] border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {PLATFORM_ICONS[account.platform] ?? (
                      <ExternalLink className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {account.account_name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">
                        {account.platform}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      account.is_active
                        ? "bg-green-100 dark:bg-green-500/20 text-green-400"
                        : "bg-gray-100 dark:bg-gray-500/20 text-slate-500 dark:text-gray-400"
                    }
                  >
                    {account.is_active ? t("active") : t("inactive")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Posts History */}
        <div className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            {t("postHistory", { count: posts.length })}
          </h3>

          {posts.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500">{t("noPosts")}</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between rounded-[20px] border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-white/5 p-3"
                >
                  <div className="flex-1">
                    <p className="line-clamp-2 text-sm text-slate-600 dark:text-gray-300">
                      {post.content}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                      {format(new Date(post.created_at), "PPp", { locale: cs })}
                    </p>
                  </div>
                  <Badge
                    className={
                      STATUS_COLORS[post.status] ?? "bg-gray-100 dark:bg-gray-500/20 text-slate-500 dark:text-gray-400"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
