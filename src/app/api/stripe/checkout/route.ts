import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { Currency } from "@/components/marketing/currency-switcher";

// Master plan lookup keys: postio_{type}_monthly_{currency}
function lookupKeyFor(plan: string, currency: Currency): string {
  return `postio_${plan}_monthly_${currency}`;
}

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

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan parameter." },
        { status: 400 }
      );
    }

    // Determine whether the request is for a master or a custom plan.
    // Master plans use their string type ("creator", "pro") with a lookup_key.
    // Custom plans are referenced by their UUID and use the stored Stripe Price ID.
    const isMasterPlan = ["creator", "pro"].includes(plan);
    let targetPriceId: string;
    let resolvedPlanLabel: string;

    if (isMasterPlan) {
      // ── Master template ─────────────────────────────────────────────
      const lookupKey = lookupKeyFor(plan, currency);
      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
      });
      const targetPrice = prices.data[0];
      if (!targetPrice) {
        return NextResponse.json(
          {
            error: `No active price for plan '${plan}' in currency '${currency}'.`,
          },
          { status: 500 }
        );
      }
      targetPriceId = targetPrice.id;
      resolvedPlanLabel = plan;
    } else {
      // ── Custom plan – fetch from DB by UUID ─────────────────────────
      const adminClient = createAdminClient();
      const { data: customPlan, error: planError } = await adminClient
        .from("pricing_plans")
        .select(
          "id, type, name, stripe_price_id_czk, stripe_price_id_eur, stripe_price_id_usd"
        )
        .eq("id", plan)
        .single();

      if (planError || !customPlan) {
        return NextResponse.json(
          { error: `Plan '${plan}' not found.` },
          { status: 404 }
        );
      }

      const priceField = `stripe_price_id_${currency}` as const;
      const rawPriceId = customPlan[priceField as keyof typeof customPlan];

      if (!rawPriceId || typeof rawPriceId !== "string") {
        return NextResponse.json(
          {
            error: `No Stripe price for plan '${customPlan.name}' in currency '${currency}'.`,
          },
          { status: 500 }
        );
      }

      targetPriceId = rawPriceId;
      resolvedPlanLabel = customPlan.name;
    }

    // Get or create Stripe customer
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

    // If a stored customer ID exists but is no longer valid in Stripe (e.g. it
    // was cleared/recreated elsewhere), treat it as missing and make a new one.
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as { deleted?: boolean }).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

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
      line_items: [{ price: targetPriceId, quantity: 1 }],
      success_url: `${origin}/${locale}/settings/billing?success=true`,
      cancel_url: `${origin}/${locale}/settings/billing?canceled=true`,
      metadata: { user_id: user.id, plan: resolvedPlanLabel },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Stripe checkout error:", msg);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
