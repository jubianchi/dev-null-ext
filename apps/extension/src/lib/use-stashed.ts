import { useEffect, useState } from 'preact/hooks';
import { batched } from './batch.ts';
import { ask } from './messages.ts';

/** Whether a stash waits under a name; a log mounting a commit per row asks the background once. */
const stashed = batched((names) => ask({ type: 'stash:which', names }));

/** The names that have a stash, asked again whenever one of `deps` changes, e.g. when a composer closes. */
export function useStashed(names: readonly string[], deps: readonly unknown[]): ReadonlySet<string> {
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (names.length === 0) return;
    let current = true;
    void Promise.all(names.map(async (name) => ((await stashed(name).catch(() => null)) ? name : null))).then((hits) => {
      if (current) setFound(new Set(hits.filter((name) => name !== null)));
    });
    return () => {
      current = false;
    };
  }, [names.join('\n'), ...deps]);

  return found;
}
