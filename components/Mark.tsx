// blurt's mark: a speech bubble with a level meter in it.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="mark">
      <path d="M6 4h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H14l-7 5v-5H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" fill="currentColor" />
      <rect x="9" y="11" width="2.6" height="6" rx="1.3" fill="var(--mark-ink, #fff)" />
      <rect x="14.7" y="8.5" width="2.6" height="11" rx="1.3" fill="var(--mark-ink, #fff)" />
      <rect x="20.4" y="12" width="2.6" height="4" rx="1.3" fill="var(--mark-ink, #fff)" />
    </svg>
  );
}
