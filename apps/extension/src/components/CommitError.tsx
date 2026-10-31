import type { BackgroundError } from '../lib/messages.ts';

/** Why a commit failed, with the one case that needs dev-null.sh itself: accepting the commit rules. */
export function CommitError({ error }: { error: BackgroundError }) {
  return (
    <p class="m-0 mt-2 text-fg-danger">
      {error.code === 'commit_rules_required' ? (
        <>
          Your first commit has to come from{' '}
          <a href="https://dev-null.sh" target="_blank" rel="noopener" class="underline">
            dev-null.sh
          </a>
          , to accept the commit rules. Then commit from here.
        </>
      ) : (
        error.message
      )}
    </p>
  );
}
