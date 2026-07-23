"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAllUsers, updateUserRole } from "@/modules/admin-core/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck } from "lucide-react";

type User = {
  id: string;
  full_name: string | null;
  email?: string;
  role: "user" | "admin";
};

export default function AdminTeamPage() {
  const t = useTranslations("adminTeam");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const data = await getAllUsers();
      setUsers(data as User[]);
    }
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    await updateUserRole(userId, newRole);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
      </div>

      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-indigo-400" />
            {t("allUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-[20px] bg-black/30 border border-white/10"
              >
                <div className="flex flex-col">
                  <span className="text-white font-medium">
                    {user.full_name || t("unknownUser")}
                  </span>
                  <span className="text-gray-500 text-sm">{user.email}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      user.role === "admin"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-gray-600 hover:bg-gray-700"
                    }
                  >
                    {user.role === "admin" ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                    {user.role === "admin" ? t("admin") : t("user")}
                  </Badge>

                  <div className="flex gap-2">
                    {user.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRoleChange(user.id, "admin")}
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-white/5"
                      >
                        {t("setAsAdmin")}
                      </Button>
                    )}
                    {user.role !== "user" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRoleChange(user.id, "user")}
                        className="text-gray-400 hover:text-gray-300 hover:bg-white/5"
                      >
                        {t("removeAdmin")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
