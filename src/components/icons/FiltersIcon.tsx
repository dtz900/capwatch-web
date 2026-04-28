export function FiltersIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
         fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M7 12h10M10 18h4"/>
    </svg>
  );
}
