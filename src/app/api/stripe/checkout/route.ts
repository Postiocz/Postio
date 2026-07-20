import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { Currency } from "@/components/marketing/currency-switcher";

// Each plan maps to a single Stripe Lookup Key that carries all currency prices.
const LOOKUP_KEYS: Record<string, string | undefined> = {
  creator: "postio_creator_monthly",
  pro: "postio_pro_monthly",
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
    const currency: Currency = ["czk", "eur", "usd"].includes(body?.currency)
      ? body.currency
      : "eur";

    if (!plan || !["creator", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'creator' or 'pro'." },
        { status: 400 }
      );
    }

    const lookupKey = LOOKUP_KEYS[plan];
    if (!lookupKey) {
      return NextResponse.json(
        { error: `Lookup key not configured for plan '${plan}'.` },
        { status: 500 }
      );
    }

    // Resolve the price for the requested currency from the lookup key.
    // The key groups every currency variant of the plan's price.
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
    });
    const targetPrice = prices.data.find((p) => p.currency === currency);
    if (!targetPrice) {
      return NextResponse.json(
        { error: `No active price for plan '${plan}' in currency '${currency}'.` },
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
      line_items: [{ price: targetPrice.id, quantity: 1 }],
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
