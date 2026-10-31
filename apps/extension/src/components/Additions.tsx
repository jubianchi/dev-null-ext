import type { Addition } from '../lib/additions.ts';
import { Octicon } from './Octicon.tsx';

/**
 * Which additions are in the commit: in, as a chip whose × takes it out; out, as a dashed chip that puts it back. Each
 * tells why it is proposed. A link gets an icon; a mention's @ says enough.
 */
export function Additions({
  additions,
  inCommit,
  onAdd,
  onRemove,
}: {
  additions: Addition[];
  inCommit: (addition: Addition) => boolean;
  onAdd: (addition: Addition) => void;
  onRemove: (addition: Addition) => void;
}) {
  if (additions.length === 0) return null;

  return (
    <div data-additions class="text-xs">
      <p class="m-0 mb-1 font-medium text-fg-muted">In your commit</p>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        {additions.map((addition) => (
          <li key={addition.id}>
            {inCommit(addition) ? (
              <span
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-border bg-canvas-muted py-0.5 pl-2 pr-0.5 font-mono text-fg"
              >
                {addition.kind === 'link' && <Octicon name="link" class="size-3 text-fg-muted" />}
                {addition.label}
                <span class="sr-only">{addition.reason}</span>
                <button
                  type="button"
                  onClick={() => onRemove(addition)}
                  aria-label={`Remove ${addition.label} from your commit`}
                  class="flex size-4 items-center justify-center rounded-full text-fg-muted hover:bg-button-hover hover:text-fg"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAdd(addition)}
                aria-label={`Add ${addition.label} to your commit`}
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-fg-muted hover:border-fg-accent hover:text-fg-accent"
              >
                {addition.kind === 'link' && <Octicon name="link" class="size-3" />}+ {addition.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
