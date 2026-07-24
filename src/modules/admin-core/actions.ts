"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { stripe } from "@/lib/stripe";

type User = Database["public"]["Tables"]["users"]["Row"];
type Post = Database["public"]["Tables"]["posts"]["Row"];
type PostPlatform = Database["public"]["Tables"]["post_platforms"]["Row"];

/** Status check result for a single service. */
export interface ServiceStatus {
  key: string;
  label: string;
  connected: boolean;
  detail?: string;
}

/**
 * Checks availability of all external API keys / services.
 * Returns an array of status objects – purely env-based, no external pings.
 */
export async function getSystemStatus(): Promise<ServiceStatus[]> {
  const checks: ServiceStatus[] = [
    {
      key: "stripe",
      label: "Stripe (payments)",
      connected: !!process.env.STRIPE_SECRET_KEY,
    },
    {
      key: "openai",
      label: "OpenAI (AI images)",
      connected: !!process.env.OPENAI_API_KEY,
    },
    {
      key: "gemini",
      label: "Google Gemini (AI content)",
      connected: !!process.env.GOOGLE_GEMINI_API_KEY,
    },
    {
      key: "tiktok",
      label: "TikTok API",
      connected: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    },
    {
      key: "linkedin",
      label: "LinkedIn API",
      connected: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    },
    {
      key: "twitter",
      label: "X / Twitter API",
      connected: !!(process.env.TWITTER_CLIENT_ID || process.env.X_API_KEY),
    },
    {
      key: "google",
      label: "Google OAuth (YouTube)",
      connected: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    {
      key: "supabase",
      label: "Supabase",
      connected: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    {
      key: "cronSecret",
      label: "CRON_SECRET (external scheduler)",
      connected: !!process.env.CRON_SECRET,
    },
  ];

  return checks;
}

/**
 * Načte VŠECHNY uživatele z DB (globální pohled pro admina).
 * Používá createAdminClient (service_role) k obcházení RLS.
 */
export async function getAllUsers(options?: { role?: "user" | "admin" }): Promise<User[]> {
  const supabase = createAdminClient();

  let query = supabase.from("users").select("*");

  if (options?.role) {
    query = query.eq("role", options.role);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch all users:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Globální statistiky pro admin dashboard.
 * Počet všech uživatelů a celkem všech příspěvků napříč platformou.
 */
export async function getGlobalStats(): Promise<{
  totalUsers: number;
  totalPosts: number;
  payingUsers: number;
}> {
  const supabase = createAdminClient();

  // Počet všech uživatelů
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Celkem všech příspěvků (napříč všemi uživateli)
  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  // Počet placenců
  const { count: payingUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("plan", ["creator", "pro"]);

  return {
    totalUsers: totalUsers ?? 0,
    totalPosts: totalPosts ?? 0,
    payingUsers: payingUsers ?? 0,
  };
}

/**
 * Načte konkrétního uživatele podle ID (včetně emailu z auth.users).
 */
export async function getUserById(userId: string): Promise<(User & { email?: string }) | null> {
  const supabase = createAdminClient();

  // Načti profil z public.users
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError) {
    console.error("Failed to fetch user:", userError);
    return null;
  }

  // Načti email z auth.users
  const { data: authData } = await supabase.auth.admin.getUserById(userId);

  return {
    ...userData,
    email: authData?.user?.email,
  };
}

/**
 * Načte všechny sociální účty pro daného uživatele.
 */
export async function getUserAccounts(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user accounts:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Načte všechny příspěvky pro daného uživatele.
 */
export async function getUserPosts(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user posts:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Změní roli uživatele a zapiše akci do audit_logs.
 */
export async function updateUserRole(
  userId: string,
  newRole: "user" | "admin"
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to update user role:", updateError);
    return false;
  }

  // Zapiš do audit_logs
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: `role_changed_to_${newRole}`,
    target_table: "users",
    target_id: userId,
    metadata: { new_role: newRole },
  });

  return true;
}

/**
 * Prompt 044-REVISED KROK 2: Admin Credit Manager
 * Updates user's ai_credits and twitter_auto_credits.
 * Logs the change to audit_logs with old/new values.
 */
export async function updateUserCredits(
  userId: string,
  credits: { ai_credits: number; twitter_auto_credits: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // First, get current values for audit log
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("ai_credits, twitter_auto_credits")
    .eq("id", userId)
    .single();

  if (fetchError || !currentUser) {
    return { success: false, error: "User not found" };
  }

  const oldAi = currentUser.ai_credits ?? 0;
  const oldTwitter = currentUser.twitter_auto_credits ?? 0;

  // Update credits
  const { error: updateError } = await supabase
    .from("users")
    .update({
      ai_credits: credits.ai_credits,
      twitter_auto_credits: credits.twitter_auto_credits,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to update user credits:", updateError);
    return { success: false, error: updateError.message };
  }

  // Log to audit_logs
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "credits_updated",
    target_table: "users",
    target_id: userId,
    metadata: {
      old_ai_credits: oldAi,
      new_ai_credits: credits.ai_credits,
      old_twitter_credits: oldTwitter,
      new_twitter_credits: credits.twitter_auto_credits,
    },
  });

  return { success: true };
}

/**
 * Načte VŠECHNY příspěvky z DB (globální pohled pro admina).
 * Včetně informací o platformách a uživateli.
 */
export async function getAllPosts(): Promise<
  (Post & {
    user?: { full_name: string | null; avatar_url: string | null } | null;
    platforms?: PostPlatform[];
  })[]
> {
  const supabase = createAdminClient();

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      user:users ( full_name, avatar_url ),
      platforms:post_platforms ( * )
    `)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Failed to fetch all posts:", postsError);
    return [];
  }

  return posts ?? [];
}

/**
 * Načte všechny aktivní předplatné ze Stripe
 */
export async function getAllSubscriptions() {
  try {
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: "all",
      expand: ["data.customer"],
    });
    return subscriptions.data;
  } catch (error) {
    console.error("Failed to fetch Stripe subscriptions:", error);
    return [];
  }
}

/**
 * Načte všechny faktury ze Stripe
 */
export async function getAllInvoices() {
  try {
    const invoices = await stripe.invoices.list({
      limit: 100,
      expand: ["data.customer"],
    });
    return invoices.data;
  } catch (error) {
    console.error("Failed to fetch Stripe invoices:", error);
    return [];
  }
}

/**
 * Načte globální billing statistiky
 */
export async function getBillingStats() {
  const supabase = createAdminClient();

  // Počet uživatelů podle tarifu
  const [freeCount, creatorCount, proCount] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("plan", "free"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("plan", "creator"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("plan", "pro"),
  ]);

  return {
    totalUsers: (freeCount.count ?? 0) + (creatorCount.count ?? 0) + (proCount.count ?? 0),
    freeUsers: freeCount.count ?? 0,
    creatorUsers: creatorCount.count ?? 0,
    proUsers: proCount.count ?? 0,
    payingUsers: (creatorCount.count ?? 0) + (proCount.count ?? 0),
  };
}

/**
 * Získá nové uživatele za posledních 12 měsíců
 */
export async function getNewUsersOverTime() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch users over time:", error);
    return [];
  }

  // Agregace za měsíce
  const monthlyUsers = data.reduce((acc, user) => {
    const date = new Date(user.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(monthlyUsers)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({
      month,
      count,
    }));
}

/**
 * Získá MRR (měsíční opakované tržby) ze Stripe předplatných
 */
export async function getMRR() {
  try {
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    // Výpočet MRR (převod na měsíční sazbu)
    let mrr = 0;
    subscriptions.data.forEach((sub) => {
      const item = sub.items.data[0];
      if (!item?.price) return;

      const amount = item.price.unit_amount ?? 0;
      const interval = item.price.recurring?.interval;

      if (interval === "month") {
        mrr += amount;
      } else if (interval === "year") {
        mrr += Math.round(amount / 12);
      }
    });

    return {
      mrr,
      currency: subscriptions.data[0]?.currency || "czk",
    };
  } catch (error) {
    console.error("Failed to fetch MRR:", error);
    return { mrr: 0, currency: "czk" };
  }
}

/**
 * Načte audit logy s informacemi o uživateli
 */
export async function getAuditLogs() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      *,
      user:users ( id, full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }

  return data ?? [];
}
