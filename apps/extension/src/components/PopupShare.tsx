import type { WebPage } from '../lib/web-page.ts';
import { PopupComposer } from './PopupComposer.tsx';

/**
 * The popup's share view: the composer, on the page in the current tab, under a header that goes back to the card.
 * Once committed, the popup closes by itself: the user is back on the page they shared.
 */
export function PopupShare({ page, onBack, onDone = () => window.close() }: { page: WebPage; onBack: () => void; onDone?: () => void }) {
  return (
    <section class="flex flex-col">
      <header class="flex items-center gap-2 border-0 border-b border-solid border-zinc-200 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          class="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-zinc-600 hover:bg-zinc-100"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <h1 class="m-0 text-[15px] font-semibold">Commit this page</h1>
      </header>
      <PopupComposer page={page} onDone={onDone} />
    </section>
  );
}
