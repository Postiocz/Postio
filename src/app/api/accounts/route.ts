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
  publishing_type: "direct" | "manual" | null;
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
    publishing_type: row.publishing_type,
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
        "id, platform, account_name, is_active, avatar_url, platform_id, token_expires_at, publishing_type, created_at, metadata"
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
    const { platform, accountName, accessToken, publishingType } = body;

    const isManual = publishingType === "manual";

    if (!platform || !accountName) {
      return NextResponse.json(
        { error: "Missing fields: platform, accountName" },
        { status: 400 }
      );
    }

    // Manual accounts (e.g. free X) are saved without an access token.
    if (!isManual && !accessToken) {
      return NextResponse.json(
        { error: "Missing field: accessToken" },
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

    // Idempotent connect (legacy manual token entry used by onboarding).
    // A manual entry carries no platform_id, so we dedupe at the application
    // level on (user_id, platform) instead of relying on the DB unique index
    // (user_id, platform, platform_id), which treats NULL platform_id as
    // distinct. Re-connecting the same platform updates the existing row
    // rather than inserting a duplicate.
    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .is("platform_id", null)
      .maybeSingle();

    // Reconnecting an already-connected manual account is always allowed.
    // A brand-new connection is blocked once the user is at their plan's limit.
    if (!existing) {
      const { allowed, info } = await isNewAccountAllowed(supabase, user.id, platform);
      if (!allowed) {
        return NextResponse.json(
          { error: accountLimitErrorMessage(info) },
          { status: 403 }
        );
      }
    }

    // Update the existing manual row, or insert a new one if none exists.
    let dbError: { message: string } | null = null;
    if (existing) {
      // Reconnect: refresh name / publishing mode. Manual accounts carry no
      // token, so clear any previously stored one.
      const { error: updateError } = await supabase
        .from("social_accounts")
        .update({
          account_name: accountName,
          access_token: isManual ? "" : accessToken,
          publishing_type: isManual ? "manual" : "direct",
          is_active: true,
        })
        .eq("id", existing.id);
      dbError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("social_accounts")
        .insert({
          user_id: user.id,
          platform,
          account_name: accountName,
          // Manual accounts have no API token (NOT NULL column -> empty string).
          access_token: isManual ? "" : accessToken,
          publishing_type: isManual ? "manual" : "direct",
          platform_id: null,
          is_active: true,
        });
      dbError = insertError;
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
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
