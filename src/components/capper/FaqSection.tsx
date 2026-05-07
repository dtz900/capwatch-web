import type { FaqQA } from "@/lib/seo";

export function FaqSection({ items }: { items: FaqQA[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
      <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-5">
        Frequently asked
      </h2>
      <div className="flex flex-col gap-5">
        {items.map((item) => (
          <div key={item.question}>
            <h3 className="text-[16px] sm:text-[17px] font-bold text-[var(--color-text)] mb-2 leading-snug">
              {item.question}
            </h3>
            <p className="text-[13px] sm:text-[14px] text-[var(--color-text-soft)] leading-relaxed">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
