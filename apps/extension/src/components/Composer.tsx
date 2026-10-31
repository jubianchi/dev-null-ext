import type { CurrentUser } from '@devnull-github/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_COMMIT_LENGTH, shareLabel } from '../lib/share.ts';
import { type Target, useCommitDraft } from '../lib/use-commit-draft.ts';
import { AdditionTools, AdditionWarnings } from './Additions.tsx';
import { AttachedImages, ImagePicker, filesOf } from './AttachedImages.tsx';
import { CommitError } from './CommitError.tsx';
import { Octicon } from './Octicon.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';

export type { Target } from '../lib/use-commit-draft.ts';

/** The modal composer, laid out like dev-null.sh's: the author's avatar beside the text, the tools below it. */
export function Composer({ target }: { target: Target }) {
  const draft = useCommitDraft(target);
  const { state, text, setText, additions, inCommit, insert, warnings, body, length, canCommit, submit } = draft;
  const [previewing, setPreviewing] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.step === 'writing' && !previewing) textarea.current?.focus();
  }, [state.step, previewing]);

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
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const files = filesOf(event.dataTransfer);
            if (files.length === 0) return;
            event.preventDefault();
            draft.attach(files);
          }}
          class="flex gap-3"
        >
          <ImagePicker picker={picker} onFiles={draft.attach} />
          <Avatar user={state.user} />

          <div class="min-w-0 flex-1">
            <div>
            {previewing ? (
              <div class="max-h-[50vh] min-h-12 overflow-y-auto py-2 text-base">
                <PreviewPanel body={body} images={draft.images} />
              </div>
            ) : (
              <textarea
                ref={textarea}
                value={text}
                onInput={(event) => setText(event.currentTarget.value)}
                onPaste={(event) => {
                  const files = filesOf(event.clipboardData);
                  if (files.length === 0) return;
                  event.preventDefault();
                  draft.attach(files);
                }}
                rows={2}
                placeholder={target.page ? `What about ${shareLabel(target.page)}?` : `What about @${target.organization}?`}
                class="block max-h-[50vh] min-h-12 w-full resize-none border-0 bg-transparent px-0 py-2 text-base text-fg [field-sizing:content] placeholder:text-fg-muted focus:outline-none"
                disabled={state.step === 'sending'}
              />
            )}
            </div>

            {!previewing && (
              <AttachedImages images={draft.images} errors={draft.imageErrors} onDescribe={draft.describe} onRemove={draft.detach} />
            )}

            <AdditionWarnings warnings={warnings} onInsert={(addition) => insert(addition, textarea.current)} />

            {state.step === 'failed' && <CommitError error={state.error} />}

            <div class="mt-3 flex items-center gap-1">
              <div role="toolbar" aria-label="Commit tools" class="flex items-center gap-1">
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
                <button
                  type="button"
                  aria-label="Preview"
                  aria-pressed={previewing}
                  title={previewing ? 'Back to writing' : 'Preview the commit as /dev/null will publish it'}
                  onClick={() => setPreviewing(!previewing)}
                  class="rounded-md p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg aria-pressed:bg-button aria-pressed:text-fg-accent"
                >
                  <Octicon name="eye" />
                </button>
              </div>

              <span class={`ml-auto text-xs ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : 'text-fg-muted'}`}>
                {length} / {MAX_COMMIT_LENGTH}
              </span>
              <button
                type="submit"
                disabled={!canCommit}
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
