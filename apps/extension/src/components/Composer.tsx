import type { Commit, CurrentUser } from '@devnull-github/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BackgroundError, ask } from '../lib/messages.ts';
import { MAX_COMMIT_LENGTH, type SharedPage, commitLength, shareBody, shareLabel } from '../lib/share.ts';
import { Glyph } from './Glyph.tsx';

type Target = { page: SharedPage; organization: string | null } | { page: null; organization: string };

type State =
  | { step: 'loading' }
  | { step: 'signed-out' }
  | { step: 'writing'; user: CurrentUser }
  | { step: 'sending'; user: CurrentUser }
  | { step: 'sent'; commit: Commit }
  | { step: 'failed'; user: CurrentUser; error: BackgroundError };

/**
 * Writes a commit about a GitHub page or an organization. The link and the @mention are added below what the user
 * writes, so what they type is only their own words.
 */
export function Composer({ target, onClose }: { target: Target; onClose: () => void }) {
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
    if (state.step === 'writing') textarea.current?.focus();
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
      role="dialog"
      aria-label="Commit to /dev/null"
      class="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-canvas-overlay p-4 font-sans text-sm text-fg shadow-overlay"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit();
      }}
    >
      <div class="mb-3 flex items-center gap-2">
        <Glyph />
        <span class="font-semibold">Commit to /dev/null</span>
        <button type="button" onClick={onClose} class="ml-auto rounded-md px-1.5 text-fg-muted hover:bg-button-hover hover:text-fg" aria-label="Close">
          ✕
        </button>
      </div>

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
        >
          <textarea
            ref={textarea}
            value={text}
            onInput={(event) => setText(event.currentTarget.value)}
            rows={4}
            placeholder={target.page ? `What about ${shareLabel(target.page)}?` : `What about @${target.organization}?`}
            class="block w-full resize-y rounded-md border border-border bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-2 focus:outline-fg-accent"
            disabled={state.step === 'sending'}
          />

          <div class="mt-2 space-y-1 text-xs text-fg-muted">
            {target.page && (
              <p class="m-0">
                Links <span class="font-mono text-fg">{shareLabel(target.page)}</span>
              </p>
            )}
            {target.organization && target.page && (
              <label class="flex items-center gap-1.5">
                <input type="checkbox" checked={mention} onChange={(event) => setMention(event.currentTarget.checked)} />
                Mention <span class="font-mono text-fg">@{target.organization}</span>, so it shows on the organization's /dev/null page
              </label>
            )}
          </div>

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

          <div class="mt-3 flex items-center gap-3">
            <span class={`text-xs ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : 'text-fg-muted'}`}>
              {length} / {MAX_COMMIT_LENGTH}
            </span>
            <button
              type="submit"
              disabled={empty || length > MAX_COMMIT_LENGTH || state.step === 'sending'}
              class="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.step === 'sending' ? 'Committing…' : 'Commit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
