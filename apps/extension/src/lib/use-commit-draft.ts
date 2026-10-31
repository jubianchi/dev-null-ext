import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { type Addition, type ComposerContext, additionsFor, isIn, withAddition, withPending, withoutAddition } from './additions.ts';
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
 * A commit being written, whichever composer shows it: the session, the text and the additions.
 *
 * The composer opens empty, its placeholder showing, with the additions pending: they count, preview and commit as
 * part of the commit, and go into the text with the user's first keystroke. From then on the text is the only truth,
 * and an addition is in the commit when it is found in the text, however it got there.
 */
export function useCommitDraft(target: Target, onCommitted?: (commit: Commit) => void) {
  const additions = additionsFor(target);
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Addition[]>(additions);

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  const committed = withPending(text, pending);
  const body = committed.trim();
  const length = commitLength(body);
  const canCommit = body !== '' && length <= MAX_COMMIT_LENGTH && (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');

  /** What the user types; the first keystroke takes the pending additions into the text, below it. */
  function input(textarea: HTMLTextAreaElement) {
    const value = textarea.value;
    if (text !== '' || pending.length === 0 || value === '') return setText(value);

    const caret = textarea.selectionStart;
    const full = withPending(value, pending);
    textarea.value = full;
    textarea.setSelectionRange(caret, caret);
    setPending([]);
    setText(full);
  }

  /** Puts an addition back: at the caret in the text, or among the pending ones while the user has written nothing. */
  function add(addition: Addition, textarea: HTMLTextAreaElement | null) {
    if (text === '') {
      return setPending(additions.filter((candidate) => candidate.id === addition.id || pending.some((kept) => kept.id === candidate.id)));
    }

    const { value, caret } = withAddition(text, addition, textarea?.selectionStart ?? text.length);
    if (textarea) replaceText(textarea, value, caret);
    else setText(value);
  }

  /** Takes an addition out: of the text, or of the pending ones while the user has written nothing. */
  function remove(addition: Addition, textarea: HTMLTextAreaElement | null) {
    if (text === '') return setPending(pending.filter((candidate) => candidate.id !== addition.id));

    const value = withoutAddition(text, addition);
    if (textarea) replaceText(textarea, value, Math.min(textarea.selectionStart, value.length));
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
      setPending(additions);
      onCommitted?.(commit);
    } catch (error) {
      setState({ step: 'failed', user, error: error instanceof BackgroundError ? error : new BackgroundError({ message: String(error) }) });
    }
  }

  return {
    state,
    text,
    input,
    additions,
    inCommit: (addition: Addition) => isIn(addition, committed),
    add,
    remove,
    body,
    length,
    canCommit,
    submit,
  };
}
