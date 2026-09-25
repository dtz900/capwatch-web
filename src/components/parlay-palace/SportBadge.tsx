// Small sport tag on palace cards. The palace was MLB-only until 2026-09-25,
// so a null sport means an entry stored before the column existed: MLB.
const TONE: Record<string, string> = {
  MLB: "text-[#e3c787] ring-[rgba(227,199,135,0.28)]",
  NFL: "text-[#8fc7ff] ring-[rgba(143,199,255,0.28)]",
};

export function SportBadge({ sport }: { sport?: string | null }) {
  const label = (sport ?? "MLB").toUpperCase();
  const tone = TONE[label] ?? TONE.MLB;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md bg-[rgba(255,255,255,0.05)] ring-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${tone}`}
    >
      {label}
    </span>
  );
}
