import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { type Addition, type ComposerContext, additionsFor, isIn, withAddition } from './additions.ts';
import { MAX_IMAGES, imageProblem, toTransfer } from './images.ts';
import { BackgroundError, ask } from './messages.ts';
import { MAX_COMMIT_LENGTH, commitLength } from './share.ts';
import { replaceText } from './textarea.ts';

export type Target = ComposerContext;

/** An image attached to the draft: the file, a URL to show it, and its description (alt text). */
export interface AttachedImage {
  id: string;
  file: File;
  url: string;
  description: string;
}

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
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const additions = additionsFor({ ...target, viewer: 'user' in state ? state.user.handle : null });
  const [text, setText] = useState('');

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  const [images, setImages] = useState<AttachedImage[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const body = text.trim();
  const length = commitLength(body);
  // With images, the text may be empty, as /dev/null allows.
  const canCommit =
    (body !== '' || images.length > 0) && length <= MAX_COMMIT_LENGTH && (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');

  /** Attaches the images /dev/null would take, in order, and says why it leaves out the others. */
  function attach(files: Iterable<File>) {
    const attached = [...images];
    const errors: string[] = [];
    for (const file of files) {
      const problem = imageProblem(file, attached.length);
      if (problem) errors.push(problem);
      else attached.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), description: '' });
    }
    setImages(attached);
    setImageErrors(errors);
  }

  function detach(id: string) {
    const image = images.find((candidate) => candidate.id === id);
    if (image) URL.revokeObjectURL(image.url);
    setImages(images.filter((candidate) => candidate.id !== id));
    setImageErrors([]);
  }

  function describe(id: string, description: string) {
    setImages(images.map((image) => (image.id === id ? { ...image, description } : image)));
  }
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
      const transferred = await Promise.all(images.map((image) => toTransfer(image.file, image.description)));
      const commit = await ask(transferred.length > 0 ? { type: 'commit', body, images: transferred } : { type: 'commit', body });
      setState({ step: 'sent', user, commit });
      setText('');
      for (const image of images) URL.revokeObjectURL(image.url);
      setImages([]);
      setImageErrors([]);
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
    images,
    imageErrors,
    canAttach: images.length < MAX_IMAGES,
    attach,
    detach,
    describe,
    body,
    length,
    canCommit,
    submit,
  };
}
