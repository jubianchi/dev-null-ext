import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BackgroundError, ask } from '../lib/messages.ts';
import { MAX_COMMIT_LENGTH, type SharedPage, commitLength, shareBody, shareLabel } from '../lib/share.ts';

export type Target = { page: SharedPage; organization: string | null } | { page: null; organization: string };

type State =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; commit: Commit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * Writes a commit about a GitHub page or an organization, laid out like dev-null.sh's composer: the author's avatar
 * beside the text, the tools below it. The link and the @mention are added below what the user writes, so what they
 * type is only their own words.
 */
export function Composer({ target, autoFocus = true }: { target: Target; autoFocus?: boolean }) {
  const [state, setState] = useState<State>({ step: 'loading' });
  const [text, setText] = useState('');
  const [mention, setMention] = useState(target.organization !== null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ask({ type: 'session' }).then(
      (user) => setState(user ? { step: 'writing', user } : { step: 'signed-out' }),
      () => setState({ step: 'signed-out' }),
    );
  }, []);

  useEffect(() => {
    if (autoFocus && state.step === 'writing') textarea.current?.focus();
  }, [state.step]);

  const organization = mention ? target.organization : null;
  const body = target.page ? shareBody(text, target.page, organization) : [text.trim(), `@${target.organization}`].filter(Boolean).join('\n\n');
  const length = commitLength(body);
  const empty = text.trim() === '';

  async function submit() {
    if (state.step !== 'writing' && state.step !== 'failed') return;
    const { user } = state;
    setState({ step: 'sending', user });
    try {
      setState({ step: 'sent', commit: await ask({ type: 'commit', body }) });
    } catch (error) {
      setState({ step: 'failed', user, error: error instanceof BackgroundError ? error : new BackgroundError({ message: String(error) }) });
    }
  }

  return (
    <div
      class="p-4"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit();
      }}
    >
      {state.step === 'loading' && <p class="m-0 text-fg-muted">Checking your /dev/null session…</p>}

      {state.step === 'signed-out' && (
        <p class="m-0 text-fg-muted">
          Connect your /dev/null account from the extension's button in the browser toolbar, then come back here.
        </p>
      )}

      {state.step === 'sent' && (
        <div class="space-y-2">
          <p class="m-0">
            {state.commit.status === 'pending' ? 'Committed. It shows publicly once it passes review.' : 'Committed.'}
          </p>
          <a href={state.commit.html_url} target="_blank" rel="noopener" class="text-fg-accent hover:underline">
            View on /dev/null
          </a>
        </div>
      )}

      {(state.step === 'writing' || state.step === 'sending' || state.step === 'failed') && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          class="flex gap-3"
        >
          <Avatar user={state.user} />

          <div class="min-w-0 flex-1">
            <textarea
              ref={textarea}
              value={text}
              onInput={(event) => setText(event.currentTarget.value)}
              rows={2}
              placeholder={target.page ? `What about ${shareLabel(target.page)}?` : `What about @${target.organization}?`}
              class="block max-h-[50vh] min-h-12 w-full resize-none border-0 bg-transparent px-0 py-2 text-base text-fg [field-sizing:content] placeholder:text-fg-muted focus:outline-none"
              disabled={state.step === 'sending'}
            />

            {target.page && (
              <p class="m-0 mt-1 text-xs text-fg-muted">
                Links <span class="font-mono text-fg">{shareLabel(target.page)}</span>
              </p>
            )}

            {state.step === 'failed' && (
              <p class="m-0 mt-2 text-fg-danger">
                {state.error.code === 'commit_rules_required' ? (
                  <>
                    Your first commit has to come from{' '}
                    <a href="https://dev-null.sh" target="_blank" rel="noopener" class="underline">
                      dev-null.sh
                    </a>
                    , to accept the commit rules. Then commit from here.
                  </>
                ) : (
                  state.error.message
                )}
              </p>
            )}

            <div class="mt-3 flex items-center gap-1">
              <div role="toolbar" aria-label="Commit tools" class="flex items-center gap-1">
                {target.organization && target.page && (
                  <button
                    type="button"
                    aria-pressed={mention}
                    onClick={() => setMention(!mention)}
                    title={`Mention @${target.organization}, so it shows on the organization's /dev/null page`}
                    class="rounded-md px-2 py-1 font-mono text-xs text-fg-muted hover:bg-button-hover hover:text-fg aria-pressed:bg-button aria-pressed:text-fg-accent"
                  >
                    @{target.organization}
                  </button>
                )}
              </div>

              <span class={`ml-auto text-xs ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : 'text-fg-muted'}`}>
                {length} / {MAX_COMMIT_LENGTH}
              </span>
              <button
                type="submit"
                disabled={empty || length > MAX_COMMIT_LENGTH || state.step === 'sending'}
                class="ml-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.step === 'sending' ? 'Committing…' : 'Commit'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function Avatar({ user }: { user: CurrentUser }) {
  if (!user.avatar_url) {
    return (
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas-muted font-semibold text-fg-muted">
        {user.handle.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return <img src={user.avatar_url} alt={`@${user.handle}`} class="size-10 shrink-0 rounded-full" />;
}
