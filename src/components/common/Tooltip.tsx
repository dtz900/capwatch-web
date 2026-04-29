interface Props {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: Props) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible
                   transition-opacity duration-150
                   w-[220px]
                   bg-[#13131a] border border-[var(--color-border)]
                   rounded-lg px-3 py-2 text-[11px] font-medium leading-relaxed text-[var(--color-text-soft)]
                   shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]
                   text-center"
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
