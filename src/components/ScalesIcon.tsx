/**
 * The Thetis mark: a balance scale.
 *
 * Inlined rather than loaded from `public/favicon.svg` so it inherits
 * `currentColor` — the favicon carries its own `prefers-color-scheme` rule for
 * dark tab strips, which would misfire here because the app itself is always
 * light. Keep the geometry in step with that file if either changes.
 */
export function ScalesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      // Decorative: the wordmark beside it already says "Thetis".
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 11h20" />
        <path d="M16 8.6v17.4" />
        <path d="M10.5 26h11" />
        <path d="M6 11v3" />
        <path d="M26 11v3" />
        <path d="M2 14a4 3 0 0 0 8 0" />
        <path d="M22 14a4 3 0 0 0 8 0" />
      </g>
      <circle cx="16" cy="6.6" r="1.9" fill="currentColor" />
    </svg>
  );
}
