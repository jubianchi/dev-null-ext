import type { Commit } from '@dev-null-ext/client';
import { useRef, useState } from 'preact/hooks';
import { additionCandidates } from '../lib/mentions.ts';
import { MAX_COMMIT_LENGTH } from '../lib/share.ts';
import { useCommitDraft } from '../lib/use-commit-draft.ts';
import { AdditionTools, AdditionWarnings } from './Additions.tsx';
import { AttachedImages, filesOf, ImagePicker } from './AttachedImages.tsx';
import { CommitError } from './CommitError.tsx';
import { useMentionSuggestions } from './MentionSuggestions.tsx';
import { Octicon } from './Octicon.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';

type Tab = 'write' | 'preview';

/**
 * The composer inline above an organization's log, drawn as GitHub's comment box (Write and Preview tabs, a footer
 * under the text, the button below the box) and speaking /dev/null: a commit, its character count against /dev/null's
 * limit. It stays open after a commit, for the next one.
 */
export function InlineComposer({
  organization,
  onCommitted,
  disabled,
}: {
  organization: string;
  onCommitted?: (commit: Commit) => void;
  /** The additions the user turned off in the extension's settings. */
  disabled?: ReadonlySet<string>;
}) {
  const draft = useCommitDraft({ page: null, organization, disabled }, onCommitted);
  const { state, text, setText, additions, inCommit, insert, warnings, body, length, canCommit, submit } = draft;
  const [tab, setTab] = useState<Tab>('write');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mentions = useMentionSuggestions(textarea, text, additionCandidates(additions));

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
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const files = filesOf(event.dataTransfer);
        if (files.length === 0) return;
        event.preventDefault();
        draft.attach(files);
      }}
    >
      <ImagePicker picker={picker} onFiles={draft.attach} />
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
          <div role="toolbar" aria-label="Commit tools" class="ml-auto flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={!draft.canAttach}
              aria-label="Attach images"
              title="Attach images: up to 3, JPEG, PNG or WebP"
              class="rounded-md p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-fg-muted"
            >
              <Octicon name="image" />
            </button>
            <AdditionTools additions={additions} inCommit={inCommit} onInsert={(addition) => insert(addition, textarea.current)} />
          </div>
        </div>

        <div role="tabpanel" class="p-2">
          {tab === 'write' ? (
            <textarea
              ref={textarea}
              value={text}
              {...mentions.textareaProps}
              onInput={(event) => {
                setText(event.currentTarget.value);
                mentions.track(event.currentTarget);
              }}
              onPaste={(event) => {
                const files = filesOf(event.clipboardData);
                if (files.length === 0) return;
                event.preventDefault();
                draft.attach(files);
              }}
              rows={4}
              aria-label="Commit message"
              placeholder="What did you ship?"
              disabled={state.step === 'sending'}
              class="block min-h-24 w-full resize-y rounded-md border border-border bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-2 focus:outline-fg-accent"
            />
          ) : (
            <div class="min-h-24 px-3 py-2 text-sm">
              <PreviewPanel body={body} images={draft.images} />
            </div>
          )}
          {tab === 'write' && mentions.list}
          {tab === 'write' && <AttachedImages images={draft.images} errors={draft.imageErrors} onDescribe={draft.describe} onRemove={draft.detach} />}
        </div>

        {warnings.length > 0 && (
          <div class="px-3 pb-2">
            <AdditionWarnings warnings={warnings} onInsert={(addition) => insert(addition, textarea.current)} />
          </div>
        )}

        <div class="flex flex-wrap items-center gap-3 border-t border-border-muted px-3 py-2 text-xs text-fg-muted">
          <span>Links, @mentions, :emoji: and `code` are supported</span>
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={!draft.canAttach}
            class="flex cursor-pointer items-center gap-1 border-0 border-l border-solid border-border-muted bg-transparent pl-3 text-xs font-medium text-fg-muted hover:text-fg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-fg-muted"
          >
            <Octicon name="image" />
            Paste, drop, or click to add files
          </button>
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
