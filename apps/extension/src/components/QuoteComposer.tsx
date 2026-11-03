import type { Commit } from '@dev-null-ext/client';
import { useEffect, useRef } from 'preact/hooks';
import { useCommitDraft } from '../lib/use-commit-draft.ts';
import { DraftForm } from './DraftForm.tsx';
import { QuotedCommit } from './QuotedCommit.tsx';

/**
 * A quote of a commit of the log, in a modal dialog, as dev-null.sh's: who is quoted, the take to add, then the quoted
 * commit as a card. Images and preview as in the other composers; no poll, which /dev/null refuses on a quote.
 */
export function QuoteComposer({ quoted, onQuoted, onClose }: { quoted: Commit; onQuoted: (quote: Commit) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const draft = useCommitDraft({ quotedCommitId: quoted.id }, (quote) => {
    onQuoted(quote);
    close();
  });
  const label = `Quote @${quoted.author.handle}`;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();

    return () => element?.close();
  }, []);

  function close() {
    dialog.current?.close();
  }

  /** Once it popped out (`.dialog-pop` in tailwind.css), as the modal composer. */
  async function closed() {
    const animations = dialog.current?.getAnimations?.() ?? [];
    await Promise.allSettled(animations.map((animation) => animation.finished));
    onClose();
  }

  const { step } = draft.state;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes the dialog; the keyboard has Escape and the Close button.
    <dialog
      ref={dialog}
      data-quote-composer
      aria-label={label}
      onClose={() => void closed()}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
      class="dialog-pop m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-border bg-canvas-overlay p-4 font-sans text-sm text-fg shadow-overlay"
    >
      <div class="mb-2 flex items-center gap-2">
        <h2 class="m-0 text-base font-semibold">{label}</h2>
        <button type="button" onClick={close} class="ml-auto rounded-md px-1.5 text-fg-muted hover:bg-button-hover hover:text-fg" aria-label="Close">
          ✕
        </button>
      </div>
      {step !== 'loading' && step !== 'signed-out' && (
        <DraftForm
          draft={draft}
          label={label}
          placeholder="Add your take"
          action="Quote"
          sending="Quoting…"
          previewTitle="Preview the quote as /dev/null will publish it"
          onCancel={close}
        >
          <div class="mb-2">
            <QuotedCommit quoted={quoted} link={false} />
          </div>
        </DraftForm>
      )}
    </dialog>
  );
}
