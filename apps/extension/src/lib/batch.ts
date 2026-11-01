/**
 * A lookup that gathers the keys asked for in the same turn of the event loop into one fetch, so a page mounting a
 * button per person asks the background once. A null answer answers null for every key.
 */
export function batched<V>(fetch: (keys: string[]) => Promise<Record<string, V> | null>): (key: string) => Promise<V | null> {
  let pending: Promise<Record<string, V> | null> | null = null;
  let keys: string[] = [];

  return async (key) => {
    if (!keys.includes(key)) keys.push(key);
    pending ??= new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
      const asked = keys;
      keys = [];
      pending = null;
      return fetch(asked);
    });

    return (await pending)?.[key] ?? null;
  };
}
