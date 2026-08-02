import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature") as string;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("Missing STRIPE_WEBHOOK_SECRET env var");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const planInstanceId = session.metadata?.plan_instance_id;
        const subscriptionId = session.subscription as string | null;

        if (!userId || !plan) {
          logger.error("Missing user_id or plan in session metadata");
          break;
        }

        const updateData: Record<string, string | null> = {
          plan,
          stripe_customer_id: session.customer as string,
          subscription_status: "active",
        };
        if (subscriptionId) {
          updateData.stripe_subscription_id = subscriptionId;
        }
        // Snapshot: pevně navaz uživatele na konkrétní instanci plánu, kterou si
        // zakoupil. Další změny Master šablony adminem se tak nedotknou
        // podmínek, které uživatel měl v momentě nákupu.
        if (planInstanceId) {
          updateData.current_plan_instance_id = planInstanceId;
        }

        await supabase.from("users").update(updateData).eq("id", userId);
        logger.debug(`User upgraded to ${plan} (instance ${planInstanceId ?? "n/a"})`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await supabase
          .from("users")
          .update({ subscription_status: subscription.status as string })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object;
        const customerId = deletedSub.customer as string;

        // Snapshot: při přechodu zpět na Free přepneme uživatele na Free
        // master instanci (nebo necháme null – uživatel nemá aktivní placený plán).
        const { data: freeMaster } = await supabase
          .from("pricing_plans")
          .select("id")
          .eq("type", "free")
          .eq("is_master_template", true)
          .maybeSingle();

        await supabase
          .from("users")
          .update({
            plan: "free",
            current_plan_instance_id: freeMaster?.id ?? null,
            stripe_subscription_id: null,
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
