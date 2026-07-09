import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { applySubscriptionState } from "@/lib/stripe-sync";

export const runtime = "nodejs";

// current_period_end in Stripe SDK v22+ (basil API) lives on
// SubscriptionItem (sub.items.data[0].current_period_end), not on the
// Subscription object itself. The sync() helper reads it from items.data[0].

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // Stripe SDK is instantiated inside the handler so the build succeeds
  // even when STRIPE_SECRET_KEY is absent from the environment.
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const db = serviceDb();

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      if (userId && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await sync(db, userId, sub, s.customer as string);
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const { data: row } = await db
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", sub.customer as string)
        .maybeSingle();
      if (row?.user_id) await sync(db, row.user_id, sub, sub.customer as string);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("stripe webhook error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

async function sync(
  db: ReturnType<typeof serviceDb>,
  userId: string,
  sub: Stripe.Subscription,
  customerId: string
) {
  // current_period_end is on SubscriptionItem in SDK v22+ (basil API)
  const periodEnd = sub.items.data[0]?.current_period_end;
  const { tier, subscription } = applySubscriptionState({
    userId,
    status: sub.status,
    customerId,
    subscriptionId: sub.id,
    periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
  const { error: upsertErr } = await db.from("subscriptions").upsert(subscription, { onConflict: "user_id" });
  if (upsertErr) throw new Error(`subscriptions upsert failed: ${upsertErr.message}`);
  const { error: tierErr } = await db.from("ts_profiles").update({ tier }).eq("user_id", userId);
  if (tierErr) throw new Error(`ts_profiles tier update failed: ${tierErr.message}`);
}
