"use client";
import { useState } from "react";
import Image from "next/image";

/* Confidential-file reveal: the dossier stays closed until clicked, then
   spins open like a newspaper. Lab prototype for the VIP section. */
export function DossierReveal({
  handle,
  children,
}: {
  handle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="group mx-auto block -rotate-1 rounded-lg px-8 py-6 text-left shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]"
        style={{ background: "#f2ecdd", color: "#17140f" }}
      >
        <div className="flex items-center gap-4">
          <Image src="/logo-crown.png" alt="" width={1135} height={793} className="h-8 w-auto" />
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
    );
  }

  return (
    <div>
      <style>{`
        @keyframes dossier-spin {
          0% { transform: rotate(-1080deg) scale(0.05); opacity: 0; }
          55% { opacity: 1; }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        .dossier-open {
          animation: dossier-spin 0.9s cubic-bezier(.22, 1, .36, 1) both;
          transform-origin: 50% 40%;
        }
        @media (prefers-reduced-motion: reduce) {
          .dossier-open { animation: none; }
        }
      `}</style>
      <div className="dossier-open">
        {children}
        <div className="mt-2 text-center">
          <button
            onClick={() => setOpen(false)}
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            File it away
          </button>
        </div>
      </div>
    </div>
  );
}
