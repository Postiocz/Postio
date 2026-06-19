import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/accounts - connect a social account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, accountName, accessToken } = body;

    if (!platform || !accountName || !accessToken) {
      return NextResponse.json(
        { error: "Missing fields: platform, accountName, accessToken" },
        { status: 400 }
      );
    }

    const validPlatforms = [
      "instagram",
      "facebook",
      "twitter",
      "linkedin",
      "youtube",
      "tiktok",
    ];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("social_accounts")
      .insert({
        user_id: user.id,
        platform,
        account_name: accountName,
        access_token: accessToken,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
