"use client";

import { useState } from "react";

interface Props {
  text: string;
}

export function CopySnippetButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Some browsers / contexts block writeText (insecure origin, perm
      // denied). Fall back to a hidden textarea + execCommand so the admin
      // tool still works even from a non-localhost http preview.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="px-4 py-2 rounded-md text-[12px] font-extrabold uppercase tracking-[0.10em]
                 bg-[var(--color-gold)] text-[#0a0a0c] hover:opacity-90 transition"
    >
      {copied ? "Copied" : "Copy snippet for X reply"}
    </button>
  );
}
