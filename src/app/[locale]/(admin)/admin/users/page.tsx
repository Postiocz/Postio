/**
 * Admin – Globální správa uživateli
 * Zobrazuje VŠECHNY uživatele z tabulky public.users.
 */

import { getAllUsers } from "@/modules/admin-core/actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-500/20 text-gray-400",
  creator: "bg-blue-500/20 text-blue-400",
  pro: "bg-purple-500/20 text-purple-400",
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Uživatelé</h1>
        <p className="text-sm text-gray-400">
          {users.length} uživatelů celkem
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[20px] border border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Uživatel
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Tarif
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Registrován
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Streak
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-white/5 transition-colors"
              >
                {/* User info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[20px] bg-white/5 text-sm font-medium text-white">
                      {user.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <Link
                        href={`/${locale}/admin/users/${user.id}`}
                        className="font-medium text-white hover:text-purple-400"
                      >
                        {user.full_name ?? "Neznámý"}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </td>

                {/* Plan */}
                <td className="px-6 py-4">
                  <Badge
                    className={
                      PLAN_COLORS[user.plan] ?? PLAN_COLORS.free
                    }
                  >
                    {PLAN_LABELS[user.plan] ?? user.plan}
                  </Badge>
                </td>

                {/* Created at */}
                <td className="px-6 py-4 text-sm text-gray-300">
                  {format(new Date(user.created_at), "PPp", {
                    locale: cs,
                  })}
                </td>

                {/* Streak */}
                <td className="px-6 py-4 text-sm text-gray-300">
                  🔥 {user.streak ?? 0}
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <Badge
                    className={
                      user.role === "admin"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {user.role === "admin" ? "Admin" : "Uživatel"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            Žádní uživatelé nebyli nalezeni.
          </div>
        )}
      </div>
    </div>
  );
}
