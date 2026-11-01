import { describe, expect, it } from 'vitest';
import { sessionChanged } from '../src/lib/session-store.ts';

const user = (handle: string, name: string | null = null) => ({ handle, name });

describe('sessionChanged', () => {
  it('tells a sign-in, a sign-out and another account apart from a refreshed profile', () => {
    expect(sessionChanged(null, user('jubianchi'))).toBe(true);
    expect(sessionChanged(user('jubianchi'), null)).toBe(true);
    expect(sessionChanged(user('jubianchi'), user('someone-else'))).toBe(true);

    expect(sessionChanged(user('jubianchi'), user('jubianchi', 'Julien'))).toBe(false);
    expect(sessionChanged(null, null)).toBe(false);
    expect(sessionChanged(undefined, null)).toBe(false);
  });
});
