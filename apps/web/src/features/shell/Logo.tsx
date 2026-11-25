/** The mark: a map pin with a ring around it, drawn in the text colour with the accent as the dot (Karlaplan). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M16 6.5c-3.6 0-6.5 2.8-6.5 6.3 0 4.6 6.5 11.7 6.5 11.7s6.5-7.1 6.5-11.7c0-3.5-2.9-6.3-6.5-6.3Z" fill="var(--t1)" />
      <circle cx="16" cy="12.8" r="2.4" fill="var(--accent)" />
    </svg>
  );
}
