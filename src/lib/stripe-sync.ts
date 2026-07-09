const VIP_STATUSES = new Set(["active", "trialing"]);

export function applySubscriptionState(input: {
  userId: string;
  status: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  periodEnd: string | null;
}) {
  const tier: "vip" | "free" = VIP_STATUSES.has(input.status ?? "") ? "vip" : "free";
  return {
    tier,
    subscription: {
      user_id: input.userId,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscriptionId,
      status: input.status,
      current_period_end: input.periodEnd,
      updated_at: new Date().toISOString(),
    },
  };
}
