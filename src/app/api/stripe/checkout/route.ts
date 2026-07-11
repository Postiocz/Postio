import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  creator: process.env.STRIPE_PRICE_ID_CREATOR,
  pro: process.env.STRIPE_PRICE_ID_PRO,
};

export async function POST(request: NextRequest) {
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
    const { plan } = body;
    const locale = body?.locale ?? "cs";

    if (!plan || !["creator", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'creator' or 'pro'." },
        { status: 400 }
      );
    }

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan '${plan}'. Set STRIPE_PRICE_ID_${plan.toUpperCase()} env var.` },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      // Fetch email from auth.users via admin client
      const adminClient = createAdminClient();
      const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);
      const customer = await stripe.customers.create({
        email: authUser?.user?.email ?? undefined,
        name: userData?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Persist the Stripe customer ID
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/${locale}/settings/billing?success=true`,
      cancel_url: `${origin}/${locale}/settings/billing?canceled=true`,
      metadata: { user_id: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
