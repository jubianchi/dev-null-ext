import type { CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { ask } from './messages.ts';

/** The /dev/null user the extension is connected as: undefined while it asks, null when it is not connected. */
export function useSession(): CurrentUser | null | undefined {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    ask({ type: 'session' }).then(setUser, () => setUser(null));
  }, []);

  return user;
}
