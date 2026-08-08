import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/user/language
 * Persists the authenticated user's UI language into `users.language`, so
 * server-generated e-mails (password reset, low-credit alerts) are delivered
 * in the language the user actually browses. Called by the LocaleSwitcher.
 */
const VALID_LANGUAGES = new Set(["cs", "en", "uk"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    language?: string;
  } | null;

  const language = body?.language;
  if (typeof language !== "string" || !VALID_LANGUAGES.has(language)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ language })
    .eq("id", user.id);

  if (error) {
    console.error("[api] Failed to persist user language:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}