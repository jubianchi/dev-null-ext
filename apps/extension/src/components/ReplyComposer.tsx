import type { Commit } from '@dev-null-ext/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_COMMIT_LENGTH } from '../lib/share.ts';
import { useCommitDraft } from '../lib/use-commit-draft.ts';
import { AttachedImages, filesOf, ImagePicker } from './AttachedImages.tsx';
import { CommitError } from './CommitError.tsx';
import { useMentionSuggestions } from './MentionSuggestions.tsx';
import { Octicon } from './Octicon.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';

const TOOL =
  'rounded-md border-0 bg-transparent p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

/**
 * A reply to a commit of the log, under it, as dev-null.sh's ReplyComposer: the commit replied to is the one above, so
 * it isn't repeated; /dev/null notifies its author, so nothing is prefilled. Images, preview and mentions as in the
 * other composers, the thread's people suggested first.
 */
export function ReplyComposer({ parent, onReplied, onCancel }: { parent: Commit; onReplied: (reply: Commit) => void; onCancel: () => void }) {
  const draft = useCommitDraft({ parentId: parent.id }, onReplied);
  const { state, text, setText, body, length, canCommit, submit } = draft;
  const [previewing, setPreviewing] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mentions = useMentionSuggestions(textarea, text, [], parent.id);
  const label = `Reply to @${parent.author.handle}`;

  useEffect(() => {
    if (state.step === 'writing' && !previewing) textarea.current?.focus();
  }, [state.step, previewing]);

  if (state.step === 'loading' || state.step === 'signed-out' || state.step === 'sent') return null;

  return (
    <div data-reply-composer class="mt-2 rounded-md border border-border bg-canvas p-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPreviewing(false);
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
        {previewing ? (
          <div class="min-h-9 px-2 py-1.5 text-sm">
            <PreviewPanel body={body} images={draft.images} />
          </div>
        ) : (
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
            rows={1}
            aria-label={label}
            placeholder={label}
            disabled={state.step === 'sending'}
            class="block max-h-64 min-h-9 w-full resize-none rounded-md border-0 bg-transparent px-2 py-1.5 text-sm text-fg [field-sizing:content] placeholder:text-fg-muted focus:outline-none"
          />
        )}
        {!previewing && mentions.list}
        {!previewing && <AttachedImages images={draft.images} errors={draft.imageErrors} onDescribe={draft.describe} onRemove={draft.detach} />}

        <div class="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={!draft.canAttach}
            aria-label="Attach images"
            title="Attach images: up to 3, JPEG, PNG or WebP"
            class={TOOL}
          >
            <Octicon name="image" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewing(!previewing)}
            aria-label="Preview"
            aria-pressed={previewing}
            title={previewing ? 'Back to writing' : 'Preview the reply as /dev/null will publish it'}
            class={`${TOOL} aria-pressed:text-fg-accent`}
          >
            <Octicon name="eye" />
          </button>
          <span class={`ml-auto mr-2 text-xs ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : 'text-fg-muted'}`}>
            {length} / {MAX_COMMIT_LENGTH}
          </span>
          <button
            type="button"
            onClick={onCancel}
            class="h-7 cursor-pointer rounded-md border border-solid border-button-border bg-button px-3 text-xs font-medium text-fg hover:bg-button-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCommit}
            class="h-7 rounded-md border-0 bg-primary px-3 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.step === 'sending' ? 'Replying…' : 'Reply'}
          </button>
        </div>
      </form>
      {state.step === 'failed' && <CommitError error={state.error} />}
    </div>
  );
}
