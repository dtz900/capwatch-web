import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { vipEnabled } from "@/lib/flags";

export async function POST(request: Request) {
  if (!vipEnabled()) return NextResponse.json({ error: "not enabled" }, { status: 404 });
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  // Stripe SDK is instantiated inside the handler so the build succeeds
  // even when STRIPE_SECRET_KEY is absent from the environment.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_VIP_PRICE_ID!, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    success_url: `${origin}/account?upgraded=1`,
    cancel_url: `${origin}/account`,
  });
  return NextResponse.json({ url: session.url });
}
