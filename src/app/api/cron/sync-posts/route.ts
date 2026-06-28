import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncPublishedPostsForUser, cleanupAutoDeletedPostsForUser } from "@/lib/actions/cron-sync";
import { revalidatePath } from "next/cache";

const LOCALES = ["cs", "en", "uk"];
function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`, "page");
  }
}

/**
 * Vercel Cron endpoint — syncs published posts and cleans up auto-deleted ones.
 * Runs every 30 minutes (configured in vercel.json).
 *
 * Authentication: Verifies the Authorization header against CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Get all active users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id");

  if (usersError || !users) {
    console.error("[cron] Error fetching users:", usersError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const results = {
    totalUsers: users.length,
    synced: 0,
    cleaned: 0,
    errors: 0,
  };

  for (const user of users) {
    try {
      await Promise.all([
        syncPublishedPostsForUser(user.id),
        cleanupAutoDeletedPostsForUser(user.id),
      ]);
      results.synced++;
    } catch (err) {
      console.error(`[cron] Error processing user ${user.id}:`, err);
      results.errors++;
    }
  }

  // Revalidate pages across all locales
  revalidateAllLocales("/posts");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/");

  return NextResponse.json({
    message: "Cron job completed",
    results,
    timestamp: new Date().toISOString(),
  });
}
