/**
 * The Lucide icons (ISC license, https://lucide.dev, © Lucide Contributors) dev-null.sh draws under its commits, so the
 * log's actions look the same as there: 24px outlines, drawn at the text's size in the current colour.
 */
const PATHS = {
  star: [
    'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
  ],
  quote: [
    'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z',
    'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z',
  ],
  'message-square-reply': ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'm10 7-3 3 3 3', 'M17 13v-1a2 2 0 0 0-2-2H7'],
  'chevron-right': ['m9 18 6-6-6-6'],
  check: ['M20 6 9 17l-5-5'],
  'chart-bar': ['M3 3v16a2 2 0 0 0 2 2h16', 'M7 16h8', 'M7 11h12', 'M7 6h3'],
  'chevron-down': ['m6 9 6 6 6-6'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
} as const;

export type LucideName = keyof typeof PATHS;

export function Lucide({ name, filled = false, class: className = 'size-4' }: { name: LucideName; filled?: boolean; class?: string }) {
  return (
    <svg
      class={`lucide lucide-${name} shrink-0 ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
