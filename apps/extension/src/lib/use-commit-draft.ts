import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { BackgroundError, ask } from './messages.ts';
import { type ComposerContext, additionsFor, prefill } from './additions.ts';
import { MAX_COMMIT_LENGTH, commitLength } from './share.ts';

export type Target = ComposerContext;

export type DraftState =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; user: CurrentUser; commit: Commit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * A commit being written, whichever composer shows it: the session, the text (prefilled with the additions, and the
 * only truth about what is sent), the body /dev/null receives and its length.
 */
export function useCommitDraft(target: Target, onCommitted?: (commit: Commit) => void) {
  const additions = additionsFor(target);
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const [text, setText] = useState(() => prefill(additions));

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  const body = text.trim();
  const length = commitLength(body);
  const canCommit =
    body !== '' && length <= MAX_COMMIT_LENGTH && (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');

  async function submit() {
    if (!canCommit || !('user' in state)) return;
    const { user } = state;
    setState({ step: 'sending', user });
    try {
      const commit = await ask({ type: 'commit', body });
      setState({ step: 'sent', user, commit });
      setText(prefill(additions));
      onCommitted?.(commit);
    } catch (error) {
      setState({ step: 'failed', user, error: error instanceof BackgroundError ? error : new BackgroundError({ message: String(error) }) });
    }
  }

  return { state, text, setText, additions, body, length, canCommit, submit };
}
