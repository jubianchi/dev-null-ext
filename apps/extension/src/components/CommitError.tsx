import type { BackgroundError } from '../lib/messages.ts';
import { SERVER, serverName } from '../lib/server.ts';

/** Why a commit failed, with the one case that needs dev-null.sh itself: accepting the commit rules. */
export function CommitError({ error }: { error: BackgroundError }) {
  return (
    <p class="m-0 mt-2 text-fg-danger">
      {error.code === 'commit_rules_required' ? (
        <>
          Your first commit has to come from{' '}
          <a href={SERVER} target="_blank" rel="noopener" class="underline">
            {serverName(SERVER)}
          </a>
          , to accept the commit rules. Then commit from here.
        </>
      ) : (
        error.message
      )}
    </p>
  );
}
