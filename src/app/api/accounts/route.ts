import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNewAccountAllowed, accountLimitErrorMessage } from "@/lib/account-limit";

type SocialAccountMetadata = {
  category?: string | null;
  custom_url?: string | null;
};

type SocialAccountRow = {
  id: string;
  platform: string;
  account_name: string;
  is_active: boolean;
  avatar_url: string | null;
  platform_id: string | null;
  token_expires_at: string | null;
  created_at: string;
  metadata: SocialAccountMetadata | null;
};

function sanitizeSocialAccount(row: SocialAccountRow) {
  return {
    id: row.id,
    platform: row.platform,
    account_name: row.account_name,
    is_active: row.is_active,
    avatar_url: row.avatar_url,
    platform_id: row.platform_id,
    token_expires_at: row.token_expires_at,
    metadata: row.metadata
      ? {
          category: row.metadata.category ?? null,
          custom_url: row.metadata.custom_url ?? null,
        }
      : null,
  };
}

// GET /api/accounts - return sanitized connected accounts for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("social_accounts")
      .select(
        "id, platform, account_name, is_active, avatar_url, platform_id, token_expires_at, created_at, metadata"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const accounts = ((data ?? []) as SocialAccountRow[]).map(sanitizeSocialAccount);
    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Enforce the account limit for the user's plan (server-side).
    // The manual form has no platform_id, so reconnects are not detected and
    // every submission is treated as a new account (consistent with legacy use).
    const { allowed, info } = await isNewAccountAllowed(supabase, user.id, platform);
    if (!allowed) {
      return NextResponse.json(
        { error: accountLimitErrorMessage(info) },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("social_accounts")
      .insert({
        user_id: user.id,
        platform,
        account_name: accountName,
        access_token: accessToken,
        is_active: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/accounts - remove one connected account owned by the current user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const accountId =
      typeof body?.accountId === "string" ? body.accountId.trim() : "";
    if (!accountId) {
      return NextResponse.json({ error: "Missing field: accountId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
