/**
 * The lane-0 accent, from the extension's theme when its stylesheet is there (shadow roots), with the same colours as
 * a fallback for the light DOM of GitHub's pages.
 */
const ACCENT = 'var(--color-lane-0, light-dark(#d9480f, #ff8a4c))';

/**
 * /dev/null's two slashes, the second one hollow, drawn in the current text colour with the lane-0 accent; all in the
 * current colour when muted, as GitHub draws its secondary icon buttons.
 */
export function Glyph({ class: className = 'size-4', muted = false }: { class?: string; muted?: boolean }) {
  return (
    <svg class={className} width="16" height="16" viewBox="1.6 1.5 45 45" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M2 42h10L26 6H16Z" />
      <path
        style={{ fill: muted ? 'currentColor' : ACCENT }}
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M17.81 43.5h13.22L46.19 4.5H32.97ZM22.19 40.5l12.84-33h6.78l-12.84 33Z"
      />
    </svg>
  );
}
