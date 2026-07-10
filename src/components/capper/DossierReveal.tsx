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
export function DossierReveal({
  handle,
  children,
}: {
  handle: string;
  children: React.ReactNode;
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
        @keyframes dossier-fold {
          0% { transform: perspective(1200px) scaleY(1) scale(1); opacity: 1; }
          45% { transform: perspective(1200px) scaleY(0.52) rotateX(-7deg) scale(1); opacity: 1; }
          70% { transform: perspective(1200px) scaleY(0.5) rotateX(-3deg) scale(0.55) translateY(-12%); opacity: 1; }
          100% { transform: perspective(1200px) scaleY(0.5) rotateX(0deg) scale(0.1) translateY(-32%); opacity: 0; }
        }
        @keyframes dossier-crease {
          0% { opacity: 0; }
          40% { opacity: 1; }
          75% { opacity: 0.6; }
          100% { opacity: 0; }
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
          animation: dossier-fold 0.85s cubic-bezier(.5, 0, .45, 1) both;
          transform-origin: 50% 0%;
        }
        .dossier-crease {
          background: linear-gradient(to bottom,
            transparent 42%, rgba(23,20,15,0.22) 50%, rgba(23,20,15,0.08) 54%, transparent 62%);
          animation: dossier-crease 0.85s linear both;
        }
        .folder-pop {
          animation: folder-pop 0.3s cubic-bezier(.22, 1, .36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dossier-open, .dossier-closing, .folder-pop { animation: none; }
        }
      `}</style>
      {state === "closed" ? (
        <button
          onClick={() => setState("open")}
          aria-expanded={false}
          className={`group mx-auto block -rotate-1 rounded-lg px-8 py-6 text-left shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:rotate-0 hover:scale-[1.02] ${
            returned ? "folder-pop" : ""
          }`}
          style={{ background: "#f2ecdd", color: "#17140f" }}
        >
          <div className="flex items-center gap-4">
            <InkCrown className="h-9 w-12" />
            <div>
              <div className="text-[13px] font-extrabold uppercase tracking-[0.22em]">
                TailSlips · Scout Report
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#7a7263]">
                Subject @{handle} · VIP eyes only
              </div>
            </div>
            <span className="ml-6 inline-block -rotate-6 rounded border-2 border-[#b91c1c] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b91c1c]">
              Confidential
            </span>
          </div>
          <div className="mt-3 border-t border-dashed border-[rgba(23,20,15,0.3)] pt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7263] group-hover:text-[#17140f]">
            Click to open the file
          </div>
        </button>
      ) : (
        <div
          className={state === "closing" ? "dossier-closing" : "dossier-open"}
          onAnimationEnd={(e) => {
            if (e.animationName === "dossier-fold") {
              setReturned(true);
              setState("closed");
            }
          }}
        >
          <div className="relative">
            {state === "closing" && (
              <div className="dossier-crease pointer-events-none absolute inset-0 z-20 rounded-lg" aria-hidden="true" />
            )}
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
