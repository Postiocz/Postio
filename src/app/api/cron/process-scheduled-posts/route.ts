import { NextResponse } from "next/server";

function getSupabaseFunctionsBaseUrl(supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  return `${url.protocol}//${url.host.replace(".supabase.co", ".functions.supabase.co")}`;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const baseUrl = getSupabaseFunctionsBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/process-scheduled-posts`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ source: "vercel-cron" }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "application/json";
  const text = await response.text();

  return new NextResponse(text, { status: response.status, headers: { "content-type": contentType } });
}
