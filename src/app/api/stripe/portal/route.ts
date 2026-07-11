import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

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
    const locale = body?.locale ?? "cs";

    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = userData?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please upgrade first." },
        { status: 400 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { url } = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/${locale}/settings/billing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
