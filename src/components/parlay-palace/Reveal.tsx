"use client";
import { type ReactNode } from "react";

/** Staggered entrance. CSS-only; no deps. */
export function Reveal({ children, index = 0 }: {
  children: ReactNode; index?: number;
}) {
  return (
    <div className="pp-rise" style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}>
      {children}
    </div>
  );
}
