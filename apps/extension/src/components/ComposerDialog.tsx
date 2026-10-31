import { useEffect, useRef } from 'preact/hooks';
import { Composer, type Target } from './Composer.tsx';
import { Glyph } from './Glyph.tsx';

/**
 * The composer in a modal dialog, as on dev-null.sh. The native dialog brings the backdrop, the focus trap and Escape;
 * a click on the backdrop closes it too.
 */
export function ComposerDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();

    return () => element?.close();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes the dialog; the keyboard has Escape and the Close button.
    <dialog
      ref={dialog}
      aria-label="Write a commit"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      class="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-border bg-canvas-overlay p-0 font-sans text-sm text-fg shadow-overlay backdrop:bg-black/50"
    >
      <div class="flex items-center gap-2 px-4 pt-4">
        <Glyph />
        <h2 class="m-0 text-base font-semibold">Write a commit</h2>
        <button type="button" onClick={onClose} class="ml-auto rounded-md px-1.5 text-fg-muted hover:bg-button-hover hover:text-fg" aria-label="Close">
          ✕
        </button>
      </div>
      <Composer target={target} />
    </dialog>
  );
}
