/* Legal version constants and the subscriber auto-renewal disclosure.
 * The versions must equal the platform's CURRENT_SELLER_TERMS and
 * CURRENT_SUBSCRIBER_TERMS. The disclosure must match the platform's
 * auto_renew_text() character for character. */

export const SELLER_AGREEMENT_VERSION = "2026-10-31";
export const SUBSCRIBER_TERMS_VERSION = "2026-10-31";

export function subscriberDisclosure(priceCents: number): string {
  const price =
    priceCents % 100 === 0 ? `$${priceCents / 100}` : `$${(priceCents / 100).toFixed(2)}`;
  return `Renews every month at ${price} until you cancel. Cancel anytime from Manage subscription; you keep access through the period you paid for. No refunds.`;
}
