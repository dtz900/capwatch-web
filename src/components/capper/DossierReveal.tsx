"use client";
import { useRef, useState } from "react";

/* Ink-colored crown via CSS mask of the transparent asset, so it prints
   dark on paper surfaces instead of brand green. */
export function InkCrown({ className, color = "#143024" }: { className?: string; color?: string }) {
  const mask: React.CSSProperties = {
    backgroundColor: color,
    WebkitMaskImage: "url(/logo-crown.png)",
    maskImage: "url(/logo-crown.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
  return <span aria-hidden="true" className={`inline-block ${className ?? ""}`} style={mask} />;
}

/* Confidential-file reveal: closed folder until clicked, newspaper-spin
   open. Filing it away rewinds the spin toward the folder's spot, then the
   folder pops back in. */
/* locked: the folder renders sealed as the non-VIP upsell; clicking routes
   to the account page instead of opening. */
export function DossierReveal({
  handle,
  locked = false,
  children,
}: {
  handle: string;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const [returned, setReturned] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fileAway = () => {
    if (state !== "open") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      wrapRef.current?.scrollIntoView({ block: "start" });
      setState("closed");
      return;
    }
    // Scroll back to the folder's spot FIRST, then fold once the viewport
    // has arrived; folding mid-scroll collapses the layout and the browser
    // abandons the smooth scroll.
    const top = wrapRef.current?.getBoundingClientRect().top ?? 0;
    if (top > -8) {
      setState("closing");
      return;
    }
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setState("closing"), 500);
  };

  return (
    <div ref={wrapRef} className="scroll-mt-20">
      <style>{`
        @keyframes dossier-spin {
          0% { transform: rotate(-1080deg) scale(0.05); opacity: 0; }
          55% { opacity: 1; }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes dossier-settle {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(0.97) translateY(-10px); opacity: 0; }
        }
        @keyframes folder-pop {
          0% { transform: rotate(-1deg) scale(0.4); opacity: 0; }
          65% { transform: rotate(-1deg) scale(1.06); opacity: 1; }
          100% { transform: rotate(-1deg) scale(1); opacity: 1; }
        }
        .dossier-open {
          animation: dossier-spin 0.9s cubic-bezier(.22, 1, .36, 1) both;
          transform-origin: 50% 40%;
        }
        .dossier-closing {
          animation: dossier-settle 0.3s cubic-bezier(.22, 1, .36, 1) both;
          transform-origin: 50% 0%;
        }
        .folder-pop {
          animation: folder-pop 0.3s cubic-bezier(.22, 1, .36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dossier-open, .dossier-closing, .folder-pop { animation: none; }
        }
      `}</style>
      {locked ? (
        <a
          href="/account"
          className="group mx-auto block w-full max-w-2xl -rotate-1 rounded-lg px-5 py-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]"
          style={{ background: "#f2ecdd", color: "#17140f" }}
        >
          <div className="flex items-center gap-3">
            <InkCrown className="h-7 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate whitespace-nowrap text-[12px] font-extrabold uppercase tracking-[0.14em]">
                TailSlips · Scout Report
              </div>
              <div className="mt-0.5 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.1em] text-[#7a7263]">
                Subject @{handle} · VIP eyes only
              </div>
            </div>
            <span className="inline-block shrink-0 -rotate-6 rounded border-2 border-[#7a7263] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a7263]">
              Sealed
            </span>
          </div>
          <div className="mt-2.5 border-t border-dashed border-[rgba(23,20,15,0.3)] pt-1.5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#b91c1c]">
            VIP members only · unlock the full report
          </div>
        </a>
      ) : state === "closed" ? (
        <button
          onClick={() => setState("open")}
          aria-expanded={false}
          className={`group mx-auto block w-full max-w-2xl -rotate-1 rounded-lg px-5 py-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:rotate-0 hover:scale-[1.02] ${
            returned ? "folder-pop" : ""
          }`}
          style={{ background: "#f2ecdd", color: "#17140f" }}
        >
          <div className="flex items-center gap-3">
            <InkCrown className="h-7 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate whitespace-nowrap text-[12px] font-extrabold uppercase tracking-[0.14em]">
                TailSlips · Scout Report
              </div>
              <div className="mt-0.5 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.1em] text-[#7a7263]">
                Subject @{handle} · VIP eyes only
              </div>
            </div>
            <span className="inline-block shrink-0 -rotate-6 rounded border-2 border-[#b91c1c] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#b91c1c]">
              Confidential
            </span>
          </div>
          <div className="mt-2.5 border-t border-dashed border-[rgba(23,20,15,0.3)] pt-1.5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#7a7263] group-hover:text-[#17140f]">
            Click to open the file
          </div>
        </button>
      ) : (
        <div
          className={state === "closing" ? "dossier-closing" : "dossier-open"}
          onAnimationEnd={(e) => {
            if (e.animationName === "dossier-settle") {
              setReturned(true);
              setState("closed");
            }
          }}
        >
          <div className="relative">
            <button
              onClick={fileAway}
              className="absolute -top-3 right-10 z-10 rounded-t-md px-3 pb-1 pt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
              style={{ background: "#e6dec9", color: "#3f3a30" }}
            >
              ✕ File away
            </button>
            {children}
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={fileAway}
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              File it away
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
