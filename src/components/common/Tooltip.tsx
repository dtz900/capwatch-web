"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    isTouchRef.current = window.matchMedia("(hover: none)").matches;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        if (!isTouchRef.current) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isTouchRef.current) setOpen(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                   transition-opacity duration-150
                   w-[220px]
                   bg-[#13131a] border border-[var(--color-border)]
                   rounded-lg px-3 py-2 text-[11px] font-medium leading-relaxed text-[var(--color-text-soft)]
                   shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]
                   text-center
                   ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
      >
        {content}
        <span
          aria-hidden="true"
          className="absolute top-full left-1/2 -translate-x-1/2
                     border-[6px] border-transparent border-t-[#13131a]"
        />
      </span>
    </span>
  );
}
