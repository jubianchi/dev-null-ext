import type { Addition } from '../lib/additions.ts';
import { Octicon, type OcticonName } from './Octicon.tsx';

const ICONS: Record<Addition['kind'], OcticonName> = { link: 'link', mention: 'mention' };

/**
 * The additions as toolbar buttons, as GitHub's editor inserts a link or a mention: each inserts its text at the caret.
 * A discreet check says it is already in the text, typed by hand too.
 */
export function AdditionTools({
  additions,
  inCommit,
  onInsert,
}: {
  additions: Addition[];
  inCommit: (addition: Addition) => boolean;
  onInsert: (addition: Addition) => void;
}) {
  return (
    <>
      {additions.map((addition) => {
        const present = inCommit(addition);

        return (
          <button
            key={addition.id}
            type="button"
            onClick={() => onInsert(addition)}
            aria-label={`Insert ${addition.label}${present ? ' (already in your commit)' : ''}`}
            title={`Insert ${addition.label}: ${addition.reason}`}
            data-in-commit={present || undefined}
            class="relative rounded-md p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg"
          >
            <Octicon name={ICONS[addition.kind]} />
            {present && <span class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-fg-success" aria-hidden="true" />}
          </button>
        );
      })}
    </>
  );
}

/** What leaving an addition out would mean, with a way to insert it. */
export function AdditionWarnings({ warnings, onInsert }: { warnings: Addition[]; onInsert: (addition: Addition) => void }) {
  return (
    <>
      {warnings.map((addition) => (
        <p key={addition.id} role="status" class="m-0 flex flex-wrap items-center gap-1 text-xs text-fg-attention">
          {addition.missing}
          <button type="button" onClick={() => onInsert(addition)} class="font-medium text-fg-accent hover:underline">
            Insert {addition.label}
          </button>
        </p>
      ))}
    </>
  );
}
