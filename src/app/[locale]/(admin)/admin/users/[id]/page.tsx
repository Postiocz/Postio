/**
 * Admin – Detail uživatele
 * URL: /admin/users/[id]
 *
 * Design: Pure Black pozadí, 20px radius, glassmorphism, fialové akcenty.
 */

import { getUserById, getUserAccounts, getUserPosts, updateUserRole } from "@/modules/admin-core/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Users,
  Mail,
  Calendar,
  Shield,
  ExternalLink,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { revalidatePath } from "next/cache";

const PLATFORM_ICONS: Record<string, React.ReactElement> = {
  instagram: <ExternalLink className="h-4 w-4 text-pink-400" />,
  facebook: <ExternalLink className="h-4 w-4 text-blue-400" />,
  twitter: <ExternalLink className="h-4 w-4 text-sky-400" />,
  linkedin: <ExternalLink className="h-4 w-4 text-blue-300" />,
  youtube: <ExternalLink className="h-4 w-4 text-red-400" />,
  tiktok: <ExternalLink className="h-4 w-4 text-white" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  scheduled: "bg-yellow-500/20 text-yellow-400",
  publishing: "bg-blue-500/20 text-blue-400",
  published: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // Načti data uživatele
  const user = await getUserById(id);
  const accounts = await getUserAccounts(id);
  const posts = await getUserPosts(id);

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-gray-500">Uživatel nebyl nalezen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Detail uživatele</h1>
          <p className="text-sm text-gray-400">
            ID: {user.id.slice(0, 8)}...
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
                : "border-white/10 text-gray-300 hover:bg-white/5"
            }
          >
            {user.role === "admin" ? (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Povýšit na admina
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Profile Card */}
      <div className="rounded-[20px] border border-white/10 bg-[#09090b]/80 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-white/5 text-3xl font-bold text-white">
            {user.full_name?.charAt(0) ?? user.id.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {user.full_name ?? "Neznámý uživatel"}
              </h2>
              <p className="text-sm text-gray-400">
                {user.email ?? "Email není dostupný"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-300">
                  Registrován: {format(new Date(user.created_at), "PPp", { locale: cs })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-300">
                  Role:{" "}
                  <Badge
                    className={
                      user.role === "admin"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {user.role === "admin" ? "Admin" : "Uživatel"}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-300">
                  Tarif:{" "}
                  <Badge
                    className={
                      user.plan === "pro"
                        ? "bg-purple-500/20 text-purple-400"
                        : user.plan === "creator"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {user.plan === "free" ? "Zdarma" : user.plan === "creator" ? "Creator" : "Pro"}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-300">🔥 Streak: {user.streak ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Accounts + Posts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Social Accounts */}
        <div className="rounded-[20px] border border-white/10 bg-[#09090b]/80 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Propojené účty ({accounts.length})
          </h3>

          {accounts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Žádné propojené účty.
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-[20px] border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {PLATFORM_ICONS[account.platform] ?? (
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {account.account_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.platform}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      account.is_active
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {account.is_active ? "Aktivní" : "Neaktivní"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Posts History */}
        <div className="rounded-[20px] border border-white/10 bg-[#09090b]/80 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Historie příspěvků ({posts.length})
          </h3>

          {posts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Žádné příspěvky nebyly nalezeny.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between rounded-[20px] border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex-1">
                    <p className="line-clamp-2 text-sm text-gray-300">
                      {post.content}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {format(new Date(post.created_at), "PPp", { locale: cs })}
                    </p>
                  </div>
                  <Badge
                    className={
                      STATUS_COLORS[post.status] ?? "bg-gray-500/20 text-gray-400"
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
