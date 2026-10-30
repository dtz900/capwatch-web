import { VipGrantForm } from "./VipGrantForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "VIP | TailSlips Admin" };

export default function AdminVipPage() {
  return (
    <main className="mx-auto max-w-[1080px] px-7 pb-16">
      <header className="pb-5 pt-10">
        <h1 className="text-2xl font-bold">Capper VIP subscriptions</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Grants a subscription without Stripe. For local testing and comped subscriptions.
        </p>
      </header>
      <div className="max-w-md">
        <VipGrantForm />
      </div>
    </main>
  );
}
