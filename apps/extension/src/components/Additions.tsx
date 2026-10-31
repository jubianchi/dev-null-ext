import { type Addition, isIn, withAddition, withoutAddition } from '../lib/additions.ts';
import { replaceText } from '../lib/textarea.ts';
import { Octicon, type OcticonName } from './Octicon.tsx';

const ICONS: Record<Addition['kind'], OcticonName> = { link: 'link', mention: 'mention' };

export interface AdditionEditor {
  add(addition: Addition): void;
  remove(addition: Addition): void;
}

/**
 * Adds and removes additions in the text: in the textarea when it is there, as one edit the user can undo, at its
 * caret; in the text itself otherwise (while previewing).
 */
export function additionEditor(textarea: HTMLTextAreaElement | null, text: string, setText: (text: string) => void): AdditionEditor {
  return {
    add(addition) {
      const { value, caret } = withAddition(text, addition, textarea?.selectionStart ?? text.length);
      if (textarea) replaceText(textarea, value, caret);
      else setText(value);
    },
    remove(addition) {
      const value = withoutAddition(text, addition);
      if (textarea) replaceText(textarea, value, Math.min(textarea.selectionStart, value.length));
      else setText(value);
    },
  };
}

/**
 * Which additions are in the commit, read from the text however they got there: in, as a chip whose × takes it out of
 * the text; out, as a dashed chip that puts it back at the caret. Each tells why it is proposed.
 */
export function Additions({ additions, text, editor }: { additions: Addition[]; text: string; editor: AdditionEditor }) {
  if (additions.length === 0) return null;

  return (
    <div data-additions class="text-xs">
      <p class="m-0 mb-1 font-medium text-fg-muted">In your commit</p>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        {additions.map((addition) => (
          <li key={addition.id}>
            {isIn(addition, text) ? (
              <span
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-border bg-canvas-muted py-0.5 pl-2 pr-0.5 font-mono text-fg"
              >
                <Octicon name={ICONS[addition.kind]} class="size-3 text-fg-muted" />
                {addition.label}
                <span class="sr-only">{addition.reason}</span>
                <button
                  type="button"
                  onClick={() => editor.remove(addition)}
                  aria-label={`Remove ${addition.label} from your commit`}
                  class="flex size-4 items-center justify-center rounded-full text-fg-muted hover:bg-button-hover hover:text-fg"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => editor.add(addition)}
                aria-label={`Add ${addition.label} to your commit`}
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-fg-muted hover:border-fg-accent hover:text-fg-accent"
              >
                <Octicon name={ICONS[addition.kind]} class="size-3" />+ {addition.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
