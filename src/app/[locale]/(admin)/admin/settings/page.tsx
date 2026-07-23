"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Nastavení</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/settings/team">
          <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px] hover:bg-white/5 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-white">Správa adminů</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">
                Spravujte uživatelské role a oprávnění.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings/audit-log">
          <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px] hover:bg-white/5 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-white">Audit log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">
                Zobrazit historii událostí a akcí v systému.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
