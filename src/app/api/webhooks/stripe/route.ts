import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature") as string;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET env var");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
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
        const subscriptionId = session.subscription as string | null;

        if (!userId || !plan) {
          console.error("Missing user_id or plan in session metadata");
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

        await supabase.from("users").update(updateData).eq("id", userId);
        console.log(`User ${userId} upgraded to ${plan}`);
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

        await supabase
          .from("users")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
