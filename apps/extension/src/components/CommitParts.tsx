import type { BodyMention, BodySegment, Commit } from '@dev-null-ext/client';
import { useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import { CommitBody } from './CommitBody.tsx';
import { Octicon } from './Octicon.tsx';

/** The pieces a commit and a reply in the log share. */

/**
 * The author's lane as a CSS colour, when the API says (signed requests): one of the six lanes, or a custom colour.
 * A style rather than a class, for the rail and the reply's dashed line alike.
 */
export function laneColor(user: { lane?: number | string }, fallback = 'var(--color-border)'): string {
  const value = user.lane;
  if (typeof value === 'number') return `var(--color-lane-${value % 6})`;
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return fallback;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export const ACTION = 'inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-fg-muted hover:bg-canvas-muted hover:text-fg-accent';

/**
 * The body as dev-null.sh shows it in a list (FoldedCommitBody): its excerpt when it has one, and Show more to unfold
 * it in place, for good.
 */
export function FoldedBody({ segments, excerpt, mentions }: { segments: BodySegment[]; excerpt: BodySegment[] | null; mentions: BodyMention[] }) {
  const [unfolded, setUnfolded] = useState(false);
  const folded = excerpt !== null && !unfolded;

  return (
    <>
      <CommitBody segments={folded ? excerpt : segments} mentions={mentions} />
      {folded && (
        <button type="button" onClick={() => setUnfolded(true)} class="mt-0.5 text-sm font-medium text-fg-accent hover:underline">
          Show more
        </button>
      )}
    </>
  );
}

/** The star counter, which stars and unstars the commit: at once, and back as it was if /dev/null refuses. */
export function Star({ commit, count }: { commit: Commit; count: number }) {
  const [state, setState] = useState({ starred: commit.starred ?? false, count });

  function toggle() {
    const previous = state;
    const starred = !previous.starred;
    setState({ starred, count: previous.count + (starred ? 1 : -1) });
    ask({ type: 'star', commitId: commit.id, starred }).catch(() => setState(previous));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.starred}
      aria-label={plural(state.count, 'star', 'stars')}
      title={state.starred ? 'Unstar' : 'Star'}
      class={`${ACTION} cursor-pointer border-0 bg-transparent font-[inherit]`}
    >
      <Octicon name={state.starred ? 'star-fill' : 'star'} class={state.starred ? 'text-fg-attention' : ''} />
      {state.count}
    </button>
  );
}
