import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { BackgroundError, ask } from './messages.ts';
import { MAX_COMMIT_LENGTH, type SharedPage, commitLength, shareBody } from './share.ts';

export type Target = { page: SharedPage; organization: string | null } | { page: null; organization: string };

export type DraftState =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; user: CurrentUser; commit: Commit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * A commit being written, whichever composer shows it: the session, the text, the organization mention, the body
 * /dev/null receives and its length. The link and the @mention are added below what the user writes, so what they
 * type is only their own words.
 */
export function useCommitDraft(target: Target, onCommitted?: (commit: Commit) => void) {
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const [text, setText] = useState('');
  const [mention, setMention] = useState(target.organization !== null);

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  const organization = mention ? target.organization : null;
  const body = target.page
    ? shareBody(text, target.page, organization)
    : [text.trim(), organization ? `@${organization}` : null].filter(Boolean).join('\n\n');
  const length = commitLength(body);
  const canCommit =
    text.trim() !== '' && length <= MAX_COMMIT_LENGTH && (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');

  async function submit() {
    if (!canCommit || !('user' in state)) return;
    const { user } = state;
    setState({ step: 'sending', user });
    try {
      const commit = await ask({ type: 'commit', body });
      setState({ step: 'sent', user, commit });
      setText('');
      onCommitted?.(commit);
    } catch (error) {
      setState({ step: 'failed', user, error: error instanceof BackgroundError ? error : new BackgroundError({ message: String(error) }) });
    }
  }

  return { state, text, setText, mention, setMention, body, length, canCommit, submit };
}
