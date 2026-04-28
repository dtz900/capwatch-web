export function ChevronIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
         fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}
