import type { WebPage } from '../lib/web-page.ts';
import { Glyph } from './Glyph.tsx';
import { PopupComposer } from './PopupComposer.tsx';

/**
 * The share view framed over any page by Alt+Shift+D: the popup's composer, under a header with the way out. Escape
 * and the close button leave the stash as it is; once committed, it closes by itself.
 */
export function ShareFrame({ page, onClose }: { page: WebPage | null; onClose: () => void }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape closes the frame from any of its fields, as a dialog's.
    <section
      class="flex flex-col bg-white font-sans text-sm text-zinc-900"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <header class="flex items-center gap-2 border-0 border-b border-solid border-zinc-200 px-4 py-2.5">
        <Glyph class="size-5" />
        <h1 class="m-0 text-[15px] font-semibold">Commit this page</h1>
        <kbd class="ml-auto rounded border border-solid border-zinc-200 px-1.5 font-mono text-[11px] text-zinc-600">Esc</kbd>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close, keeping the stash"
          title="Close, keeping the stash"
          class="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-zinc-600 hover:bg-zinc-100"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      </header>
      {page ? <PopupComposer page={page} onDone={onClose} /> : <p class="m-0 p-4 text-zinc-600">Nothing to commit: open this from a page, with Alt+Shift+D.</p>}
    </section>
  );
}
