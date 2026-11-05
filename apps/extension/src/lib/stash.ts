import type { QuoteTarget, ReplyTarget, Target } from './use-commit-draft.ts';

/**
 * An unsent commit, kept as the user types so that closing its composer or reloading the page loses nothing, as
 * dev-null.sh's stashes do. One per context: the commit replied to or quoted, the page shared, the organization's log.
 * The poll isn't kept, as on dev-null.sh.
 */
export interface Stash {
  text: string;
  images: StashedImage[];
}

/** An image of a stash as the background lists it; its bytes stay in the background until restored. */
export interface StashedImage {
  id: string;
  type: string;
  name: string;
  description: string;
}

export function stashName(target: Target | ReplyTarget | QuoteTarget): string {
  if ('parentId' in target) return `reply-${target.parentId}`;
  if ('quotedCommitId' in target) return `quote-${target.quotedCommitId}`;
  return target.page ? `page:${target.page.url}` : `organization:${target.organization}`;
}

/** Nothing worth keeping: an empty stash is dropped rather than stored. */
export function isEmptyStash(stash: Stash): boolean {
  return stash.text.trim() === '' && stash.images.length === 0;
}

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Makes the pending call now, if any. */
  flush(): void;
  cancel(): void;
}

/** Calls once the calls have stopped for `delay` ms, with the last arguments. */
export function debounced<A extends unknown[]>(call: (...args: A) => void, delay: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  const flush = () => {
    const args = pending;
    cancel();
    if (args) call(...args);
  };

  return Object.assign(
    (...args: A) => {
      if (timer !== null) clearTimeout(timer);
      pending = args;
      timer = setTimeout(flush, delay);
    },
    { flush, cancel },
  );
}
