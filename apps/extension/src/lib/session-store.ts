import type { CurrentUser } from '@dev-null-ext/client';
import { storage } from 'wxt/utils/storage';

type Session = Pick<CurrentUser, 'handle'> | null | undefined;

/** A sign-in, a sign-out or another account; not the background refreshing the same user's profile. */
export function sessionChanged(previous: Session, next: Session): boolean {
  return (previous?.handle ?? null) !== (next?.handle ?? null);
}

/** Calls back when the user signs in or out, from the popup or another tab; returns how to stop. */
export function watchSession(callback: () => void): () => void {
  // The user the background keeps once signed in (background.ts), which it rewrites on every refresh of the profile.
  const item = storage.defineItem<CurrentUser | null>('local:user', { fallback: null });
  return item.watch((next, previous) => {
    if (sessionChanged(previous, next)) callback();
  });
}
