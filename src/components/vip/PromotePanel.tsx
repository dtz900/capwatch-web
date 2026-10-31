"use client";

/* Promote: share cards a selling capper can post to advertise their VIP.
 * Closed until opened (like Subscribers). Each card shows the live PNG, the
 * post text, and Post to X / Download image / Copy text. Cards appear only
 * when the record backs them up (see postText). Approved mock 2026-10-30. */

import { useEffect, useRef, useState } from "react";
import { getVipReceipts } from "@/lib/vip/client";
import {
  cardPath,
  postText,
  receiptTitle,
  shareUrl,
  xIntentUrl,
  type PromoKind,
  type VipReceipt,
} from "@/lib/vip/promote";
import type { VipCapperStatus } from "@/lib/vip/types";
import { ERROR_TEXT, EYEBROW } from "./styles";

const BTN = "h-9 px-3 rounded-lg border border-[var(--color-border-h)] text-[12px] font-bold text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50";
const BTN_PRIMARY = "h-9 px-3 rounded-lg bg-[var(--color-text)] text-[var(--color-vip-deep)] text-[12px] font-extrabold hover:opacity-90";

const CARDS: { kind: PromoKind; title: string; hint: string }[] = [
  { kind: "brand", title: "TailSlips VIP", hint: "Your badge, any time" },
  { kind: "launch", title: "Now selling VIP", hint: "For your launch post" },
  { kind: "receipt", title: "Winning pick receipt", hint: "After a VIP pick cashes" },
  { kind: "record", title: "VIP record", hint: "Your running VIP record" },
];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function PromoCard({
  kind,
  title,
  hint,
  handle,
  text,
  ticket,
  picker,
}: {
  kind: PromoKind;
  title: string;
  hint: string;
  handle: string;
  text: string;
  ticket?: string | null;
  picker?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const img = cardPath(handle, kind, ticket);
  const link = shareUrl(handle, kind, ticket);
  const full = `${text}\n${link}`;

  const copy = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("promote copy failed", err);
      setError("Could not copy. Select the text and copy it.");
    }
  };

  const download = async () => {
    setError(null);
    try {
      const res = await fetch(img);
      if (!res.ok) throw new Error(`card ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `tailslips-vip-${kind}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("promote download failed", err);
      setError("Could not download the image. Try again.");
    }
  };

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={`${title} card`}
        width={1200}
        height={675}
        className="w-full h-auto aspect-[1200/675] rounded-[10px] border border-[var(--color-border-h)] bg-[#0f0f13]"
      />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[var(--color-text)]">{title}</span>
        {picker ?? <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span>}
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-3 text-[12px] leading-relaxed text-[var(--color-text-soft)] whitespace-pre-line break-words">
        {full}
      </div>
      <div className="flex gap-2 flex-wrap">
        <a
          href={xIntentUrl(text, link)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN_PRIMARY} inline-flex items-center`}
        >
          Post to X<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" className={BTN} onClick={download}>
          Download image
        </button>
        <button type="button" className={BTN} onClick={copy}>
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>
      {error && (
        <span role="status" className={ERROR_TEXT}>
          {error}
        </span>
      )}
    </div>
  );
}

export function PromotePanel({
  handle,
  capperId,
  status,
  token,
}: {
  handle: string;
  capperId: number;
  status: VipCapperStatus;
  token: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [receipts, setReceipts] = useState<VipReceipt[] | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Receipts load the first time the panel opens.
  useEffect(() => {
    if (!open || receipts !== null) return;
    let cancelled = false;
    getVipReceipts(capperId, tokenRef.current)
      .then((r) => {
        if (cancelled) return;
        setReceipts(r.receipts);
        setTicket(r.receipts[0]?.ticket_id ?? null);
      })
      .catch((err: unknown) => {
        console.error("VIP receipts failed", err);
        if (!cancelled) setReceipts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, receipts, capperId]);

  const receipt = receipts?.find((r) => r.ticket_id === ticket) ?? null;
  const cards = CARDS.map((c) => ({ ...c, text: postText(c.kind, { status, receipt }) })).filter(
    (c): c is (typeof CARDS)[number] & { text: string } => c.text !== null,
  );

  return (
    <div className="border-t border-[var(--color-border)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full px-5 sm:px-6 py-3 flex items-center gap-3 text-left hover:bg-[rgba(255,255,255,0.02)]"
      >
        <span className={EYEBROW}>Promote</span>
        <span className="hidden sm:inline text-[12px] text-[var(--color-text-muted)]">
          Images and posts for your VIP, from your verified record
        </span>
        <span className="ml-auto text-[12px] font-semibold text-[var(--color-text-soft)]">{open ? "Hide ▴" : "View ▾"}</span>
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-6">
          {cards.length === 0 ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Cards show up once you have an eligible sport or graded VIP picks.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map((c) => (
                <PromoCard
                  key={c.kind}
                  kind={c.kind}
                  title={c.title}
                  hint={c.hint}
                  handle={handle}
                  text={c.text}
                  ticket={c.kind === "receipt" ? ticket : null}
                  picker={
                    c.kind === "receipt" && receipts && receipts.length > 1 ? (
                      <select
                        aria-label="Winning pick"
                        value={ticket ?? ""}
                        onChange={(e) => setTicket(e.target.value)}
                        className="max-w-[60%] h-7 px-1.5 text-[11px] rounded-md bg-[rgba(255,255,255,0.04)] border border-[var(--color-border-h)] text-[var(--color-text-soft)]"
                      >
                        {receipts.map((r) => (
                          <option key={r.ticket_id} value={r.ticket_id} className="bg-[#0e0e12]">
                            {receiptTitle(r)}, {shortDate(r.posted_at)}
                          </option>
                        ))}
                      </select>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
