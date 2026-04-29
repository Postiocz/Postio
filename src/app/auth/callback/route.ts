import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    try {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // Supabase unavailable – continue to login
    }
  }

  // Detect locale from the referrer or default to "cs"
  const referer = request.headers.get("referer") ?? "";
  const localeMatch = referer.match(/\/(cs|en|uk)\//);
  const locale = localeMatch ? localeMatch[1] : "cs";

  return NextResponse.redirect(`${requestUrl.origin}/${locale}/dashboard`);
}
