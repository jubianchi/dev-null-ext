import type { Commit } from '@dev-null-ext/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { composerMode } from '../lib/composer-mode.ts';
import { ask, BackgroundError } from '../lib/messages.ts';
import { SERVER } from '../lib/server.ts';
import { useSession } from '../lib/use-session.ts';
import { CommitItem } from './CommitItem.tsx';
import { ComposerDialog } from './ComposerDialog.tsx';
import { Glyph } from './Glyph.tsx';
import { InlineComposer } from './InlineComposer.tsx';
import { Loader } from './Loader.tsx';

type State = { step: 'loading' } | { step: 'loaded'; commits: Commit[]; cursor: string | null; more: boolean } | { step: 'failed'; message: string };

/**
 * The organization's Mentions on /dev/null, in place of the organization's overview while the tab is open. Only when
 * connected to /dev/null; otherwise it says how to connect.
 */
export function OrganizationPanel({ organization, disabled }: { organization: string; disabled?: ReadonlySet<string> }) {
  const user = useSession();
  const [state, setState] = useState<State>({ step: 'loading' });
  const [writing, setWriting] = useState(false);
  const [topInView, setTopInView] = useState(true);
  const inline = useRef<HTMLDivElement>(null);

  async function load(cursor: string | null, previous: Commit[]) {
    try {
      const page = await ask({ type: 'mentions', organization, cursor });
      setState({ step: 'loaded', commits: [...previous, ...page.data], cursor: page.meta.next_cursor, more: false });
    } catch (error) {
      const notFound = error instanceof BackgroundError && error.status === 404;
      setState(
        notFound
          ? { step: 'loaded', commits: [], cursor: null, more: false }
          : { step: 'failed', message: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  useEffect(() => {
    if (!user) return;
    setState({ step: 'loading' });
    void load(null, []);
  }, [organization, user]);

  useEffect(() => {
    const element = inline.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setTopInView(entry?.isIntersecting ?? false));
    observer.observe(element);
    return () => observer.disconnect();
  }, [user]);

  function committed(commit: Commit) {
    if (commit.status === 'pending') return;
    setState((current) => (current.step === 'loaded' ? { ...current, commits: [commit, ...current.commits] } : current));
  }

  /** The inline composer is the way to commit while it is in view; once scrolled away, the header offers the modal. */
  const headerCommits = user && composerMode({ log: true, topInView }) === 'modal';
  const profile = `${SERVER}/@${organization}`;

  return (
    <section class="mx-auto my-6 max-w-[1012px] px-4 font-sans text-fg">
      <header class="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-3 bg-canvas px-4 py-2">
        <Glyph class="size-5" />
        <h2 class="m-0 text-xl font-semibold">Commits mentioning @{organization}</h2>
        {/* The link comes last, so the Commit button showing up or going away never moves it. */}
        <div class="ml-auto flex items-center gap-1">
          {headerCommits && (
            <button
              type="button"
              onClick={() => setWriting(true)}
              class="h-8 cursor-pointer rounded-md border border-solid border-transparent bg-primary px-3 text-sm font-medium leading-[21px] text-primary-fg hover:bg-primary-hover"
            >
              Commit
            </button>
          )}
          <a
            href={profile}
            target="_blank"
            rel="noopener"
            aria-label={`Open @${organization} on /dev/null`}
            title={`Open @${organization} on /dev/null`}
            class="flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-button-hover hover:text-fg"
          >
            <Glyph class="size-4" muted />
          </a>
        </div>
      </header>

      {user === undefined && <Loader label="Checking your /dev/null session…" class="p-4" />}

      {user === null && (
        <div class="rounded-md border border-border bg-canvas p-8 text-center text-sm">
          <Glyph class="mx-auto mb-3 size-8" />
          <p class="m-0 mb-1 font-semibold">You're not connected to /dev/null.</p>
          <p class="m-0 text-fg-muted">
            Connect your /dev/null account from the extension's button in the browser toolbar to read and write the commits mentioning @{organization}.
          </p>
        </div>
      )}

      {user && (
        <>
          <div ref={inline} class="mb-4">
            <InlineComposer organization={organization} onCommitted={committed} disabled={disabled} />
          </div>

          {writing && <ComposerDialog target={{ page: null, organization, disabled }} onClose={() => setWriting(false)} />}

          <div class="overflow-hidden rounded-md border border-border bg-canvas">
            {state.step === 'loading' && <Loader label="Reading the log…" class="p-4" />}

            {state.step === 'failed' && <p class="m-0 p-4 text-sm text-fg-danger">Couldn't read /dev/null: {state.message}</p>}

            {state.step === 'loaded' && state.commits.length === 0 && (
              <div class="p-8 text-center text-sm">
                <p class="m-0 mb-1 font-semibold">No commits mention @{organization} yet.</p>
                <p class="m-0 text-fg-muted">Write the first one: it shows here and on the organization's /dev/null page.</p>
              </div>
            )}

            {state.step === 'loaded' && state.commits.length > 0 && (
              <ul class="m-0 list-none p-0">
                {state.commits.map((commit) => (
                  <CommitItem key={commit.id} commit={commit} canReply={Boolean(user)} />
                ))}
              </ul>
            )}
          </div>

          {state.step === 'loaded' && state.cursor && (
            <button
              type="button"
              disabled={state.more}
              onClick={() => {
                setState({ ...state, more: true });
                void load(state.cursor, state.commits);
              }}
              class="mt-3 w-full rounded-md border border-button-border bg-button py-1.5 text-sm text-fg hover:bg-button-hover disabled:opacity-50"
            >
              {state.more ? 'Loading…' : 'Load older commits'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
