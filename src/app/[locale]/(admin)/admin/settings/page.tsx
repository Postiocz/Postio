"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminSettingsPage() {
  const t = useTranslations("adminSettingsPage");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const handleBackToMenu = () => {
    // Navigate to admin dashboard and trigger the menu to open
    // We'll use a query param to signal the menu should open
    router.push(`/${locale}/admin?menu=open`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Back button for mobile */}
      <div className="lg:hidden mb-4">
        <button
          onClick={handleBackToMenu}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{t("backToMenu")}</span>
        </button>
      </div>

      <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/${locale}/admin/settings/team`}>
          <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px] hover:bg-white/5 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-white">{t("adminManagement")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">{t("adminManagementDesc")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/settings/audit-log`}>
          <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px] hover:bg-white/5 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-white">{t("auditLog")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">{t("auditLogDesc")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
