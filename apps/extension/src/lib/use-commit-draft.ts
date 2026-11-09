import type { Commit, CurrentUser, ScheduledCommit } from '@dev-null-ext/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Addition, additionsFor, type ComposerContext, isIn, webPageLink, withAddition } from './additions.ts';
import { imageProblem, MAX_IMAGES, toTransfer } from './images.ts';
import { ask, BackgroundError } from './messages.ts';
import { type DraftPoll, newPoll, pollReady } from './polls.ts';
import { schedulable } from './schedule.ts';
import { commitLength, MAX_COMMIT_LENGTH } from './share.ts';
import { debounced, stashName } from './stash.ts';
import type { StashImageInput } from './stash-store.ts';
import { replaceText } from './textarea.ts';
import { MIN_OWN_LENGTH, ownLength, quoteOf, type WebPage } from './web-page.ts';

/** As dev-null.sh waits before writing a stash. */
const STASH_DELAY = 300;

/**
 * The composer's stash: restored once the session is known (guests never stash), saved as the user types, and once
 * more when the composer or the page goes away, so that Escape, Cancel or a reload loses nothing.
 */
function useStash(name: string, text: string, images: AttachedImage[], scheduledAt: string | undefined) {
  const [restored, setRestored] = useState(false);
  const active = useRef(false);
  const latest = useRef({ text, images, scheduledAt });
  latest.current = { text, images, scheduledAt };
  /** The images whose bytes the background already has. */
  const stored = useRef(new Set<string>());

  const save = useMemo(
    () =>
      debounced(() => {
        const { text, images, scheduledAt } = latest.current;
        void (async () => {
          const sent = await Promise.all(
            images.map(async ({ id, file, description }): Promise<StashImageInput> => {
              const image = { id, type: file.type, name: file.name, description };
              if (stored.current.has(id)) return image;
              stored.current.add(id);
              return { ...image, data: (await toTransfer(file, '')).data };
            }),
          );
          await ask({ type: 'stash:put', name, text, images: sent, ...(scheduledAt ? { scheduledAt } : {}) }).catch(() => undefined);
        })();
      }, STASH_DELAY),
    [name],
  );

  useEffect(() => {
    if (active.current) save();
  }, [text, images, scheduledAt]);

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
    async restore(): Promise<{ text: string; images: AttachedImage[]; scheduledAt?: string } | null> {
      try {
        const stash = await ask({ type: 'stash:get', name });
        if (!stash) return null;

        const images = stash.images.map(({ id, type, name: file, description, data }) => {
          stored.current.add(id);
          const blob = new File([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], file, { type });
          return { id, file: blob, url: URL.createObjectURL(blob), description };
        });
        setRestored(true);
        return { text: stash.text, images, ...(stash.scheduledAt ? { scheduledAt: stash.scheduledAt } : {}) };
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

/** The page in the current tab, whatever the site: its link comes first, and the user's own words are required. */
export interface WebTarget {
  web: WebPage;
}

export type AnyTarget = Target | ReplyTarget | QuoteTarget | WebTarget;

function additionsOf(target: AnyTarget, viewer: string | null): Addition[] {
  if ('web' in target) return [webPageLink(target.web)];
  if ('parentId' in target || 'quotedCommitId' in target) return [];
  return additionsFor({ ...target, viewer });
}

/** An image attached to the draft: the file, a URL to show it, and its description (alt text). */
export interface AttachedImage {
  id: string;
  file: File;
  url: string;
  description: string;
}

/** Whether the commit is to be scheduled, its panel open, and for when once the user picks it. */
export interface DraftSchedule {
  open: boolean;
  at: Date | null;
}

const NOT_SCHEDULED: DraftSchedule = { open: false, at: null };

export type DraftState =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; user: CurrentUser; commit: Commit }
  | { step: 'scheduled'; user: CurrentUser; scheduled: ScheduledCommit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * A commit being written, whichever composer shows it: the session, the text (the only truth about what is sent), the
 * additions the user can insert, and what leaving one out would mean.
 */
export function useCommitDraft(target: AnyTarget, onCommitted?: (commit: Commit) => void) {
  const [state, setState] = useState<DraftState>({ step: 'loading' });
  const parentId = 'parentId' in target ? target.parentId : null;
  const quotedCommitId = 'quotedCommitId' in target ? target.quotedCommitId : null;
  const web = 'web' in target ? target.web : null;
  const additions = additionsOf(target, 'user' in state ? state.user.handle : null);
  const [text, setText] = useState('');
  const [caret, setCaret] = useState<number | null>(null);
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<DraftSchedule>(NOT_SCHEDULED);

  // The page's link alone is what the share view opens with, not something the user wrote: nothing to stash.
  const stash = useStash(stashName(target), web && text.trim() === web.url ? '' : text, images, schedule.at?.toISOString());

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
        if (restored.scheduledAt) {
          const at = new Date(restored.scheduledAt);
          setSchedule({ open: true, at: schedulable(at, new Date()) ? at : null });
        }
      } else if (web) {
        const quote = web.selection ? quoteOf(web.selection) : '';
        setText(`${quote}\n\n${web.url}`);
        setCaret(quote.length);
      }
    })();
  }, []);

  const [poll, setPoll] = useState<DraftPoll | null>(null);

  const body = text.trim();
  const length = commitLength(body);
  /** How many more characters of their own words a shared page still needs. */
  const remaining = web ? Math.max(0, MIN_OWN_LENGTH - ownLength(text, web.url)) : 0;
  // With images, the text may be empty, as /dev/null allows; a poll still needs it, its question.
  const canCommit =
    (body !== '' || (images.length > 0 && !poll)) &&
    (!poll || pollReady(poll)) &&
    length <= MAX_COMMIT_LENGTH &&
    remaining === 0 &&
    (!schedule.open || schedule.at !== null) &&
    (state.step === 'writing' || state.step === 'sent' || state.step === 'scheduled' || state.step === 'failed');

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

  /** Empties the composer once what it held is committed or scheduled. */
  function clear() {
    stash.drop();
    setText('');
    setPoll(null);
    setSchedule(NOT_SCHEDULED);
    for (const image of images) URL.revokeObjectURL(image.url);
    setImages([]);
    setImageErrors([]);
  }

  async function submit() {
    if (!canCommit || !('user' in state)) return;
    const { user } = state;
    if (schedule.at && !schedulable(schedule.at, new Date())) {
      setSchedule({ open: true, at: null });
      setState({ step: 'failed', user, error: new BackgroundError({ message: 'This time has passed: pick another.' }) });
      return;
    }
    setState({ step: 'sending', user });
    try {
      const transferred = await Promise.all(images.map((image) => toTransfer(image.file, image.description)));
      const content = {
        body,
        ...(transferred.length > 0 ? { images: transferred } : {}),
        ...(poll ? { poll: { ...poll, options: poll.options.map((option) => option.trim()) } } : {}),
      };
      if (schedule.at) {
        const scheduled = await ask({ type: 'schedule', ...content, scheduledAt: schedule.at.toISOString() });
        setState({ step: 'scheduled', user, scheduled });
        clear();
        return;
      }
      const commit = await ask({ type: 'commit', ...content, ...(parentId ? { parentId } : {}), ...(quotedCommitId ? { quotedCommitId } : {}) });
      setState({ step: 'sent', user, commit });
      clear();
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
    schedule,
    /** /dev/null schedules neither replies nor quotes. */
    canSchedule: !parentId && !quotedCommitId,
    /** Opens the schedule panel, or closes it and commits right away again. */
    toggleSchedule: () => setSchedule(schedule.open ? NOT_SCHEDULED : { open: true, at: null }),
    /** A new date answers what went wrong with the last: its error goes. */
    scheduleAt: (at: Date) => {
      setSchedule({ open: true, at });
      if (state.step === 'failed') setState({ step: 'writing', user: state.user });
    },
    attach,
    detach,
    describe,
    body,
    length,
    canCommit,
    remaining,
    /**
     * Where the caret goes in what the composer opened with: after the quoted selection, before the page's link; null
     * when it opened with nothing, or with a stash.
     */
    caret,
    submit,
    /** The composer opened with its stash, until it is dropped or sent. */
    restored: stash.restored,
    /** Discards the stash and empties the composer. */
    drop: clear,
    /** Back to writing, for the next commit, once one is sent. */
    writeAnother: () => {
      if ('user' in state) setState({ step: 'writing', user: state.user });
    },
  };
}
