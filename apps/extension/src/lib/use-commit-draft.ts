import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { type Addition, type ComposerContext, additionsFor, isIn, withAddition } from './additions.ts';
import { BackgroundError, ask } from './messages.ts';
import { MAX_COMMIT_LENGTH, commitLength } from './share.ts';
import { replaceText } from './textarea.ts';

export type Target = ComposerContext;

export type DraftState =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; user: CurrentUser; commit: Commit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * A commit being written, whichever composer shows it: the session, the text (the only truth about what is sent), the
 * additions the user can insert, and what leaving one out would mean.
 */
export function useCommitDraft(target: Target, onCommitted?: (commit: Commit) => void) {
  const additions = additionsFor(target);
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const [text, setText] = useState('');

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  const body = text.trim();
  const length = commitLength(body);
  const canCommit = body !== '' && length <= MAX_COMMIT_LENGTH && (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');
  /** Once the user writes, the additions whose absence has a consequence they should know of. */
  const warnings = body === '' ? [] : additions.filter((addition) => addition.missing && !isIn(addition, text));

  /** Inserts an addition at the caret, as an edit the user can undo; at the end of the text without a textarea. */
  function insert(addition: Addition, textarea: HTMLTextAreaElement | null) {
    const { value, caret } = withAddition(text, addition, textarea?.selectionStart ?? text.length);
    if (textarea) replaceText(textarea, value, caret);
    else setText(value);
  }

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

  return {
    state,
    text,
    setText,
    additions,
    inCommit: (addition: Addition) => isIn(addition, text),
    insert,
    warnings,
    body,
    length,
    canCommit,
    submit,
  };
}
