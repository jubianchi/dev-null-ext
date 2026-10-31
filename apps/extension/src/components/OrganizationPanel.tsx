import type { Commit } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { BackgroundError, ask } from '../lib/messages.ts';
import { CommitItem } from './CommitItem.tsx';
import { ComposerDialog } from './ComposerDialog.tsx';
import { Glyph } from './Glyph.tsx';

type State =
  | { step: 'loading' }
  | { step: 'loaded'; commits: Commit[]; cursor: string | null; more: boolean }
  | { step: 'failed'; message: string };

/** The organization's Mentions on /dev/null, in place of the organization's overview while the tab is open. */
export function OrganizationPanel({ organization }: { organization: string }) {
  const [state, setState] = useState<State>({ step: 'loading' });
  const [writing, setWriting] = useState(false);

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
    setState({ step: 'loading' });
    void load(null, []);
  }, [organization]);

  const profile = `https://dev-null.sh/@${organization}`;

  return (
    <section class="mx-auto my-6 max-w-[1012px] px-4 font-sans text-fg">
      <header class="mb-4 flex flex-wrap items-center gap-3">
        <Glyph class="size-5" />
        <h2 class="m-0 text-xl font-semibold">Commits mentioning @{organization}</h2>
        <div class="ml-auto flex items-center gap-2">
          <a href={profile} target="_blank" rel="noopener" class="text-sm text-fg-accent hover:underline">
            Open on /dev/null
          </a>
          <button
            type="button"
            onClick={() => setWriting(true)}
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            Commit
          </button>
        </div>
      </header>

      {writing && <ComposerDialog target={{ page: null, organization }} onClose={() => setWriting(false)} />}

      <div class="overflow-hidden rounded-md border border-border bg-canvas">
        {state.step === 'loading' && <p class="m-0 p-4 text-sm text-fg-muted">Reading the log…</p>}

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
              <CommitItem key={commit.id} commit={commit} />
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
    </section>
  );
}
