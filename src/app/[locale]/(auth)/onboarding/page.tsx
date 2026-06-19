import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingPage from "./client";

export default async function OnboardingPageWrapper({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let session = null; // actually a user object

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    session = user;
  } catch {
    // Supabase unavailable – redirect to login
  }

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return <OnboardingPage />;
}
