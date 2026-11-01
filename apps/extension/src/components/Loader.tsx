/** The lane-0 accent, as the glyph draws it. */
const ACCENT = 'var(--color-lane-0, light-dark(#d9480f, #ff8a4c))';

/**
 * What is loading, beside /dev/null's glyph animated as the mobile app's splash (`.loader-*` in tailwind.css): the ink
 * slash pops in, then the lane-0 outline draws itself from the middle of its top edge, clockwise.
 */
export function Loader({ label, class: className = '' }: { label: string; class?: string }) {
  return (
    <p role="status" aria-live="polite" class={`m-0 flex items-center gap-2 text-sm text-fg-muted ${className}`}>
      <svg class="size-5 shrink-0" width="20" height="20" viewBox="1.6 1.5 45 45" aria-hidden="true" focusable="false">
        <path class="loader-ink" fill="currentColor" d="M2 42h10L26 6H16Z" />
        <path
          class="loader-outline"
          fill="none"
          stroke-width="3"
          stroke-linecap="butt"
          stroke-linejoin="miter"
          pathLength="100"
          style={{ stroke: ACCENT }}
          d="M39 6L44 6L30 42L20 42L34 6Z"
        />
      </svg>
      {label}
    </p>
  );
}
