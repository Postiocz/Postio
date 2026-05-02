"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logoutAction(formData: FormData) {
  const client = await createClient();
  await client.auth.signOut();
  const rawLocale = String(formData.get("locale") || "cs");
  const locale = rawLocale === "cs" || rawLocale === "en" || rawLocale === "uk" ? rawLocale : "cs";
  redirect(`/${locale}/login`);
}
