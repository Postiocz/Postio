import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SocialAccountMetadata = {
  access_token?: string;
  category?: string | null;
};

type FacebookPageDto = {
  // Internal Postio row id (used to activate the page later).
  id: string;
  // Facebook Page id (platform-specific id, used for the Graph API).
  platform_id: string;
  account_name: string;
  avatar_url: string | null;
  category: string | null;
  created_at: string;
};

/**
 * GET /api/accounts/facebook/select
 *
 * Returns all Facebook Pages of the current user that are currently
 * `is_active = false` in `social_accounts`. This is the list the UI uses
 * to let the user "tick" which Pages should be enabled for publishing.
 *
 * Authenticated, RLS-scoped to the current user via the standard Supabase
 * server client.
 */
export async function GET(_request: NextRequest) {
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
      .select("id,platform_id,account_name,avatar_url,metadata,created_at")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .eq("is_active", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "[GET /api/accounts/facebook/select] DB error:",
        error
      );
      return NextResponse.json(
        { error: "Failed to load Facebook Pages" },
        { status: 500 }
      );
    }

    const pages: FacebookPageDto[] = (data ?? []).map((row) => {
      const metadata = (row.metadata ?? {}) as SocialAccountMetadata;
      return {
        id: row.id,
        platform_id: row.platform_id ?? "",
        account_name: row.account_name,
        avatar_url: row.avatar_url ?? null,
        category: metadata.category ?? null,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ pages });
  } catch (e) {
    console.error("[GET /api/accounts/facebook/select] Unexpected error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
