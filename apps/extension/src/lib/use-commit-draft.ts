import type { Commit, CurrentUser } from '@dev-null-ext/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Addition, additionsFor, type ComposerContext, isIn, withAddition } from './additions.ts';
import { imageProblem, MAX_IMAGES, toTransfer } from './images.ts';
import { ask, BackgroundError } from './messages.ts';
import { type DraftPoll, newPoll, pollReady } from './polls.ts';
import { commitLength, MAX_COMMIT_LENGTH } from './share.ts';
import { debounced, stashName } from './stash.ts';
import type { StashImageInput } from './stash-store.ts';
import { replaceText } from './textarea.ts';

/** As dev-null.sh waits before writing a stash. */
const STASH_DELAY = 300;

/**
 * The composer's stash: restored once the session is known (guests never stash), saved as the user types, and once
 * more when the composer or the page goes away, so that Escape, Cancel or a reload loses nothing.
 */
function useStash(name: string, text: string, images: AttachedImage[]) {
  const [restored, setRestored] = useState(false);
  const active = useRef(false);
  const latest = useRef({ text, images });
  latest.current = { text, images };
  /** The images whose bytes the background already has. */
  const stored = useRef(new Set<string>());

  const save = useMemo(
    () =>
      debounced(() => {
        const { text, images } = latest.current;
        void (async () => {
          const sent = await Promise.all(
            images.map(async ({ id, file, description }): Promise<StashImageInput> => {
              const image = { id, type: file.type, name: file.name, description };
              if (stored.current.has(id)) return image;
              stored.current.add(id);
              return { ...image, data: (await toTransfer(file, '')).data };
            }),
          );
          await ask({ type: 'stash:put', name, text, images: sent }).catch(() => undefined);
        })();
      }, STASH_DELAY),
    [name],
  );

  useEffect(() => {
    if (active.current) save();
  }, [text, images]);

  useEffect(() => {
    const flush = () => save.flush();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [save]);

  return {
    restored,
    async restore(): Promise<{ text: string; images: AttachedImage[] } | null> {
      try {
        const stash = await ask({ type: 'stash:get', name });
        if (!stash) return null;

        const images = stash.images.map(({ id, type, name: file, description, data }) => {
          stored.current.add(id);
          const blob = new File([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], file, { type });
          return { id, file: blob, url: URL.createObjectURL(blob), description };
        });
        setRestored(true);
        return { text: stash.text, images };
      } catch {
        return null;
      } finally {
        active.current = true;
      }
    },
    drop() {
      save.cancel();
      stored.current.clear();
      setRestored(false);
      void ask({ type: 'stash:drop', name }).catch(() => undefined);
    },
  };
}

export type Target = ComposerContext;

/** As dev-null.sh says why its image and poll buttons turn each other off. */
export const IMAGES_OR_POLL = 'A commit can have images or a poll, not both';

/** A reply to a commit: it shares no page, so it offers no additions, and /dev/null notifies the parent's author. */
export interface ReplyTarget {
  parentId: string;
}

/** A quote of a commit: like a reply, it shares no page; /dev/null takes no poll on it. */
export interface QuoteTarget {
  quotedCommitId: string;
}

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
export function useCommitDraft(target: Target | ReplyTarget | QuoteTarget, onCommitted?: (commit: Commit) => void) {
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const parentId = 'parentId' in target ? target.parentId : null;
  const quotedCommitId = 'quotedCommitId' in target ? target.quotedCommitId : null;
  const additions = 'parentId' in target || 'quotedCommitId' in target ? [] : additionsFor({ ...target, viewer: 'user' in state ? state.user.handle : null });
  const [text, setText] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const stash = useStash(stashName(target), text, images);

  useEffect(() => {
    void (async () => {
      let user: CurrentUser | null = null;
      try {
        user = await ask({ type: 'session' });
      } catch {
        // Unreachable background: as signed out.
      }
      setState(user ? { step: 'writing', user } : { step: 'signed-out' });
      if (!user) return;

      const restored = await stash.restore();
      if (restored) {
        setText(restored.text);
        setImages(restored.images);
      }
    })();
  }, []);

  const [poll, setPoll] = useState<DraftPoll | null>(null);

  const body = text.trim();
  const length = commitLength(body);
  // With images, the text may be empty, as /dev/null allows; a poll still needs it, its question.
  const canCommit =
    (body !== '' || (images.length > 0 && !poll)) &&
    (!poll || pollReady(poll)) &&
    length <= MAX_COMMIT_LENGTH &&
    (state.step === 'writing' || state.step === 'sent' || state.step === 'failed');

  /** Attaches the images /dev/null would take, in order, and says why it leaves out the others. */
  function attach(files: Iterable<File>) {
    if (poll) {
      setImageErrors([IMAGES_OR_POLL]);
      return;
    }
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
      const commit = await ask({
        type: 'commit',
        body,
        ...(transferred.length > 0 ? { images: transferred } : {}),
        ...(parentId ? { parentId } : {}),
        ...(quotedCommitId ? { quotedCommitId } : {}),
        ...(poll ? { poll: { ...poll, options: poll.options.map((option) => option.trim()) } } : {}),
      });
      setState({ step: 'sent', user, commit });
      stash.drop();
      setText('');
      setPoll(null);
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
    canAttach: images.length < MAX_IMAGES && !poll,
    poll,
    /** A poll goes on a commit that is neither a reply nor a quote, without images. */
    canPoll: !parentId && !quotedCommitId && images.length === 0 && !poll,
    startPoll: () => setPoll(newPoll()),
    setPoll,
    removePoll: () => setPoll(null),
    attach,
    detach,
    describe,
    body,
    length,
    canCommit,
    submit,
    /** The composer opened with its stash, until it is dropped or sent. */
    restored: stash.restored,
    /** Discards the stash and empties the composer. */
    drop: () => {
      stash.drop();
      for (const image of images) URL.revokeObjectURL(image.url);
      setImages([]);
      setImageErrors([]);
      setPoll(null);
      setText('');
    },
    /** Back to writing, for the next commit, once one is sent. */
    writeAnother: () => {
      if ('user' in state) setState({ step: 'writing', user: state.user });
    },
  };
}
