import type { Addition } from '../lib/additions.ts';
import { Octicon, type OcticonName } from './Octicon.tsx';

const ICONS: Record<Addition['kind'], OcticonName> = { link: 'link', mention: 'mention' };

/**
 * What the composer adds to the commit, said as such: each addition as a chip with its reason, removable; a removed
 * one stays in place, struck through, to add back. The preview shows the result.
 */
export function Additions({ additions, removed, onToggle }: { additions: Addition[]; removed: ReadonlySet<string>; onToggle: (id: string) => void }) {
  if (additions.length === 0) return null;

  return (
    <div data-additions class="text-xs">
      <p class="m-0 mb-1 font-medium text-fg-muted">Added to your commit</p>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        {additions.map((addition) => (
          <li key={addition.id}>
            {removed.has(addition.id) ? (
              <button
                type="button"
                onClick={() => onToggle(addition.id)}
                aria-label={`Add ${addition.label} back to your commit`}
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-fg-muted line-through hover:border-fg-accent hover:text-fg-accent hover:no-underline"
              >
                + {addition.label}
              </button>
            ) : (
              <span
                title={addition.reason}
                class="inline-flex items-center gap-1 rounded-full border border-border bg-canvas-muted py-0.5 pl-2 pr-0.5 font-mono text-fg"
              >
                <Octicon name={ICONS[addition.kind]} class="size-3 text-fg-muted" />
                {addition.label}
                <span class="sr-only">{addition.reason}</span>
                <button
                  type="button"
                  onClick={() => onToggle(addition.id)}
                  aria-label={`Remove ${addition.label} from your commit`}
                  class="flex size-4 items-center justify-center rounded-full text-fg-muted hover:bg-button-hover hover:text-fg"
                >
                  ×
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
