import type { Commit } from '@devnull-github/client';
import { useState } from 'preact/hooks';
import { MAX_COMMIT_LENGTH } from '../lib/share.ts';
import { useCommitDraft } from '../lib/use-commit-draft.ts';
import { CommitError } from './CommitError.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';

type Tab = 'write' | 'preview';

/**
 * The composer inline above an organization's log, drawn as GitHub's comment box (Write and Preview tabs, a footer
 * under the text, the button below the box) and speaking /dev/null: a commit, its character count against /dev/null's
 * limit. It stays open after a commit, for the next one.
 */
export function InlineComposer({ organization, onCommitted }: { organization: string; onCommitted?: (commit: Commit) => void }) {
  const { state, text, setText, body, length, canCommit, submit } = useCommitDraft({ page: null, organization }, onCommitted);
  const [tab, setTab] = useState<Tab>('write');

  if (state.step === 'loading') return null;

  if (state.step === 'signed-out') {
    return (
      <p class="m-0 rounded-md border border-border p-4 text-sm text-fg-muted">
        Connect your /dev/null account from the extension's button in the browser toolbar to commit from here.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (tab === 'preview') setTab('write');
        void submit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit();
      }}
    >
      <div class="rounded-md border border-border bg-canvas">
        <div role="tablist" aria-label="Commit" class="flex rounded-t-md border-b border-border bg-canvas-muted px-2 pt-2">
          {(['write', 'preview'] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              class="-mb-px rounded-t-md border border-transparent px-4 py-2 text-sm text-fg-muted hover:text-fg aria-selected:border-border aria-selected:border-b-canvas aria-selected:bg-canvas aria-selected:text-fg"
            >
              {name === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>

        <div role="tabpanel" class="p-2">
          {tab === 'write' ? (
            <textarea
              value={text}
              onInput={(event) => setText(event.currentTarget.value)}
              rows={4}
              aria-label="Commit message"
              placeholder="What did you ship?"
              disabled={state.step === 'sending'}
              class="block min-h-24 w-full resize-y rounded-md border border-border bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-2 focus:outline-fg-accent"
            />
          ) : (
            <div class="min-h-24 px-3 py-2 text-sm">
              <PreviewPanel text={text} body={body} />
            </div>
          )}
        </div>

        <div class="flex items-center gap-3 px-3 pb-2 text-xs text-fg-muted">
          <span>Links, @mentions, :emoji: and `code` are supported</span>
          <span class={`ml-auto ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : ''}`}>
            {length} / {MAX_COMMIT_LENGTH}
          </span>
        </div>
      </div>

      {state.step === 'failed' && <CommitError error={state.error} />}

      <div class="mt-2 flex items-center justify-end gap-3">
        {state.step === 'sent' && (
          <span class="text-sm text-fg-muted">
            {state.commit.status === 'pending' ? 'Committed. It shows publicly once it passes review.' : 'Committed.'}{' '}
            <a href={state.commit.html_url} target="_blank" rel="noopener" class="text-fg-accent hover:underline">
              View on /dev/null
            </a>
          </span>
        )}
        <button
          type="submit"
          disabled={!canCommit}
          class="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.step === 'sending' ? 'Committing…' : 'Commit'}
        </button>
      </div>
    </form>
  );
}
