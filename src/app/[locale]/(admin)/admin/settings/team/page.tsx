"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAllUsers, updateUserRole } from "@/modules/admin-core/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  ShieldCheck,
  Search,
  Filter,
  UserCheck,
  Mail,
  Calendar
} from "lucide-react";

type User = {
  id: string;
  full_name: string | null;
  email?: string;
  role: "user" | "admin";
  created_at: string;
  plan?: string;
  streak?: number;
};

export default function AdminTeamPage() {
  const t = useTranslations("adminTeam");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const data = await getAllUsers();
        setUsers(data as User[]);
        setFilteredUsers(data as User[]);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  // Filtrování uživatelů podle role a vyhledávání
  useEffect(() => {
    let result = users;

    // Filtrování podle role
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
    }

    // Vyhledávání podle jména nebo emailu
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(user =>
        (user.full_name?.toLowerCase().includes(term) ?? false) ||
        (user.email?.toLowerCase().includes(term) ?? false) ||
        user.id.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(result);
  }, [searchTerm, roleFilter, users]);

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    await updateUserRole(userId, newRole);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const getPlanBadgeColor = (plan?: string) => {
    switch (plan) {
      case "pro": return "bg-purple-600 hover:bg-purple-700";
      case "creator": return "bg-indigo-600 hover:bg-indigo-700";
      default: return "bg-gray-600 hover:bg-gray-700";
    }
  };

  const getPlanLabel = (plan?: string) => {
    switch (plan) {
      case "pro": return "Pro";
      case "creator": return "Creator";
      default: return "Free";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <UserCheck className="h-4 w-4" />
          <span>{t("usersTotal", { count: users.length })}</span>
          <span className="mx-2">•</span>
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span className="text-indigo-400">
            {t("adminsTotal", { count: users.filter(u => u.role === "admin").length })}
          </span>
        </div>
      </div>

      {/* Filtry a vyhledávání */}
      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/50 border-white/10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              {/* Jednoduchý filter toggle místo Tabs — vlastní tlačítka */}
              <div className="flex rounded-lg bg-black/50 border border-white/10 p-1">
                {(["all", "admin", "user"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setRoleFilter(filter)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                      roleFilter === filter
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    {filter === "admin" && <ShieldCheck className="h-3 w-3" />}
                    {filter === "user" && <Users className="h-3 w-3" />}
                    {filter === "all" ? t("filterAll") : filter === "admin" ? t("filterAdmins") : t("filterUsers")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hlavní obsah - tabulka uživatelů */}
      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>{roleFilter === "all" ? t("cardAll") : roleFilter === "admin" ? t("cardAdmins") : t("cardUsers")}</span>
            </div>
            <div className="text-sm text-gray-400">
              {t("showingXofY", { count: filteredUsers.length, total: users.length })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">{t("loading")}</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-white font-medium">{t("noUsersFound")}</h3>
              <p className="text-gray-400 text-sm mt-1">
                {searchTerm
                  ? t("noUsersSearch", { term: searchTerm })
                  : t("noUsersFilter")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-[20px] bg-black/30 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Levý sloupec - informace o uživateli */}
                    <div className="flex-1">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">
                            {user.full_name || t("unknownUser")}
                          </span>
                          <Badge className={getPlanBadgeColor(user.plan)}>
                            {getPlanLabel(user.plan)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          {user.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(user.created_at).toLocaleDateString("cs-CZ")}
                            </span>
                          </div>

                          {user.streak && user.streak > 0 && (
                            <div className="flex items-center gap-1 text-orange-400">
                              <span>🔥</span>
                              <span>{t("streakLabel", { days: user.streak })}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {t("idLabel", { id: user.id })}
                        </div>
                      </div>
                    </div>

                    {/* Pravý sloupec - role a akce */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Badge
                        className={
                          user.role === "admin"
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }
                      >
                        {user.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1" />}
                        {user.role === "admin" ? t("admin") : t("user")}
                      </Badge>

                      <div className="flex gap-2">
                        {user.role !== "admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, "admin")}
                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 border-indigo-700"
                          >
                            <ShieldCheck className="h-3 w-3 mr-2" />
                            {t("setAsAdmin")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, "user")}
                            className="text-gray-400 hover:text-gray-300 hover:bg-gray-900/30 border-gray-700"
                          >
                            <Users className="h-3 w-3 mr-2" />
                            {t("removeAdmin")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiky */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t("totalUsers")}</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t("totalAdmins")}</p>
                <p className="text-2xl font-bold text-indigo-400">
                  {users.filter(u => u.role === "admin").length}
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t("payingUsers")}</p>
                <p className="text-2xl font-bold text-purple-400">
                  {users.filter(u => u.plan && u.plan !== "free").length}
                </p>
              </div>
              <div className="text-purple-600 font-bold text-lg">€</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
