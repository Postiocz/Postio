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
    const requestedCurrency: Currency = ["czk", "eur", "usd"].includes(body?.currency)
      ? body.currency
      : "eur";

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan parameter." },
        { status: 400 }
      );
    }

    // Stripe nedovoluje měnit měnu u zákazníka, který už má aktivní předplatné.
    // Pokud uživatel aktivní subscription má, vynutíme měnu jeho předplatného,
    // jinak použijeme požadovanou měnu z requestu.
    let currency: Currency = requestedCurrency;
    try {
      const { data: custRow } = await supabase
        .from("users")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();
      if (custRow?.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({
          customer: custRow.stripe_customer_id,
          status: "active",
          limit: 1,
        });
        const subCurrency = subs.data[0]?.currency as Currency | undefined;
        if (subCurrency && ["czk", "eur", "usd"].includes(subCurrency)) {
          currency = subCurrency;
        }
      }
    } catch {
      // Pokud se nepodařilo zjistit předplatné, pokračuj s požadovanou měnou.
    }

    // Determine whether the request is for a master or a custom plan.
    // Master plans use their string type ("creator", "pro") with a lookup_key.
    // Custom plans are referenced by their UUID and use the stored Stripe Price ID.
    // Master plans arrive as either "pro"/"creator" (marketing page) or
    // "plan_pro"/"plan_creator" (billing page prefixes master ids since
    // Prompt 050). Normalize so both hit the master branch; custom plans are
    // always a UUID and never carry the prefix.
    const normalizedPlan = plan.startsWith("plan_") ? plan.slice("plan_".length) : plan;
    const isMasterPlan = ["creator", "pro"].includes(normalizedPlan);
    let targetPriceId: string;
    let resolvedPlanLabel: string;
    let planInstanceId: string | null = null; // snapshot: users.current_plan_instance_id

    // Za účelem ověření granulárních pravidel viditelnosti (visibility_rules)
    // zjistí aktuální tarif uživatele a instanci plánu, kterou aktivně používá.
    const { data: userRow } = await supabase
      .from("users")
      .select("plan, current_plan_instance_id")
      .eq("id", user.id)
      .single();
    const userPlan = (userRow?.plan as string) || "free";
    const userCurrentPlanInstanceId = userRow?.current_plan_instance_id ?? null;

    // Ověří, zda uživatel smí tento plán koupit. Pravidla viditelnosti musí
    // obsahovat jeho aktuální tarif (free/creator/pro) – nebo se jedná o plán,
    // který už aktivně používá (výjimka pro obnovu vlastního plánu).
    const canPurchasePlan = (
      visibilityRules: string[] | null | undefined,
      planId: string | null
    ): boolean => {
      if (planId && planId === userCurrentPlanInstanceId) return true;
      if (!visibilityRules || visibilityRules.length === 0) return false;
      return visibilityRules.includes(userPlan);
    };

    if (isMasterPlan) {
      // ── Master template ─────────────────────────────────────────────
      const lookupKey = lookupKeyFor(normalizedPlan, currency);
      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
      });
      const targetPrice = prices.data[0];
      if (!targetPrice) {
        return NextResponse.json(
          {
            error: `No active price for plan '${normalizedPlan}' in currency '${currency}'.`,
          },
          { status: 500 }
        );
      }
      targetPriceId = targetPrice.id;
      resolvedPlanLabel = normalizedPlan;

      // Snapshot: resolve the master template's DB id so we can bind the user
      // to this specific plan instance after a successful checkout.
      const adminClient = createAdminClient();
      const { data: masterPlan } = await adminClient
        .from("pricing_plans")
        .select("id, visibility_rules")
        .eq("type", normalizedPlan)
        .eq("is_master_template", true)
        .maybeSingle();

      if (!masterPlan) {
        return NextResponse.json(
          { error: `Master plan '${normalizedPlan}' not found.` },
          { status: 404 }
        );
      }

      // ── Ochrana granulární viditelnosti ─────────────────────────────────
      if (!canPurchasePlan(masterPlan.visibility_rules, masterPlan.id)) {
        return NextResponse.json(
          { error: "Tento plán není pro váš aktuální tarif dostupný." },
          { status: 403 }
        );
      }

      planInstanceId = masterPlan.id;
    } else {
      // ── Custom plan – fetch from DB by UUID ─────────────────────────
      const adminClient = createAdminClient();
      const { data: customPlan, error: planError } = await adminClient
        .from("pricing_plans")
        .select(
          "id, type, name, visibility_rules, stripe_price_id_czk, stripe_price_id_eur, stripe_price_id_usd"
        )
        .eq("id", plan)
        .single();

      if (planError || !customPlan) {
        return NextResponse.json(
          { error: `Plan '${plan}' not found.` },
          { status: 404 }
        );
      }

      // ── Ochrana granulární viditelnosti ─────────────────────────────────
      // Stávající uživatel si plán NESMÍ koupit, pokud jeho aktuální tarif není
      // mezi povolenými pravidly viditelnosti (a plán není jeho aktivní instance).
      if (!canPurchasePlan(customPlan.visibility_rules, customPlan.id)) {
        return NextResponse.json(
          {
            error: "Tento plán není pro váš aktuální tarif dostupný.",
          },
          { status: 403 }
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
      planInstanceId = customPlan.id;
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
      metadata: {
        user_id: user.id,
        plan: resolvedPlanLabel,
        plan_instance_id: planInstanceId ?? "",
      },
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
