import { ApiError, type CurrentUser, type DevNullClient } from '@dev-null-ext/client';

/** Where the user stands with someone GitHub lists: `absent` is someone /dev/null answered 404 for. */
export type FollowState = 'following' | 'not-following' | 'absent' | 'self';

/** What is kept between background restarts: who the user follows, as of when, and who isn't on /dev/null. */
export interface FollowCache {
  owner: string;
  loadedAt: number;
  following: string[];
  absent: string[];
}

export type FollowClient = Pick<DevNullClient, 'followingHandles' | 'follow' | 'unfollow'>;

/** How long the following list is trusted: it changes from dev-null.sh too, and loading it costs a request per 30 people. */
const TTL = 10 * 60_000;

/**
 * Who the user follows on /dev/null, for GitHub's lists of people, at the cost of the user's following list once in a
 * while rather than a request per person: /dev/null has no lookup for many users at once. Whether someone is on
 * /dev/null at all is only known once a follow answers 404, and remembered.
 */
export class Follows {
  #loading: Promise<FollowCache> | null = null;

  constructor(
    private readonly deps: {
      client: () => Promise<FollowClient>;
      me: () => Promise<CurrentUser | null>;
      store: { get: () => Promise<FollowCache | null>; set: (cache: FollowCache) => Promise<void> };
      now?: () => number;
    },
  ) {}

  /** Each handle's state, keyed as given; null when the user is signed out. */
  async states(handles: string[]): Promise<Record<string, FollowState> | null> {
    const user = await this.deps.me();
    if (!user) return null;

    const cache = await this.#cache(user.handle.toLowerCase());
    const following = new Set(cache.following);
    const absent = new Set(cache.absent);

    return Object.fromEntries(
      handles.map((handle) => {
        const key = handle.toLowerCase();
        if (key === cache.owner) return [handle, 'self'];
        if (following.has(key)) return [handle, 'following'];
        return [handle, absent.has(key) ? 'absent' : 'not-following'];
      }),
    );
  }

  /** Follows or unfollows someone, and answers their new state: `absent` when they aren't on /dev/null. */
  async set(handle: string, follow: boolean): Promise<FollowState> {
    const user = await this.deps.me();
    if (!user) throw new Error('Sign in to /dev/null to follow people.');
    const key = handle.toLowerCase();
    const client = await this.deps.client();

    try {
      await (follow ? client.follow(handle) : client.unfollow(handle));
    } catch (error) {
      if (!(follow && error instanceof ApiError && error.status === 404)) throw error;
      await this.#update(user.handle.toLowerCase(), (cache) => ({ ...cache, absent: [...new Set([...cache.absent, key])] }));
      return 'absent';
    }

    await this.#update(user.handle.toLowerCase(), (cache) => ({
      ...cache,
      following: follow ? [...new Set([...cache.following, key])] : cache.following.filter((known) => known !== key),
    }));
    return follow ? 'following' : 'not-following';
  }

  async #cache(owner: string): Promise<FollowCache> {
    const stored = await this.deps.store.get();
    if (stored && stored.owner === owner && this.#now() - stored.loadedAt < TTL) return stored;

    this.#loading ??= this.#load(owner, stored?.owner === owner ? stored.absent : []).finally(() => {
      this.#loading = null;
    });
    return this.#loading;
  }

  async #load(owner: string, absent: string[]): Promise<FollowCache> {
    const following = await (await this.deps.client()).followingHandles(owner);
    const cache = { owner, loadedAt: this.#now(), following: [...following], absent };
    await this.deps.store.set(cache);
    return cache;
  }

  async #update(owner: string, change: (cache: FollowCache) => FollowCache): Promise<void> {
    await this.deps.store.set(change(await this.#cache(owner)));
  }

  #now(): number {
    return (this.deps.now ?? Date.now)();
  }
}
