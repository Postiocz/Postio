"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const t = useTranslations("common");
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      const locale = window.location.pathname.split("/")[1] || "cs";
      window.location.href = `/${locale}/login`;
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
    >
      <LogOut className="h-4 w-4" />
      <span>{t("logout")}</span>
    </button>
  );
}
