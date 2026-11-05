import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_COMMIT_LENGTH } from '../lib/share.ts';
import type { useCommitDraft } from '../lib/use-commit-draft.ts';
import { AttachedImages, filesOf, ImagePicker } from './AttachedImages.tsx';
import { CommitError } from './CommitError.tsx';
import { useMentionSuggestions } from './MentionSuggestions.tsx';
import { Octicon } from './Octicon.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';
import { StashLabel } from './StashLabel.tsx';

const TOOL =
  'rounded-md border-0 bg-transparent p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

/**
 * The form of a commit written about another one, a reply or a quote, as dev-null.sh's: the text, its images, its
 * preview, then Cancel and the action. `children` come under the text, such as the quoted commit.
 */
export function DraftForm({
  draft,
  label,
  placeholder = label,
  action,
  sending,
  previewTitle,
  reply = null,
  onCancel,
  children,
}: {
  draft: ReturnType<typeof useCommitDraft>;
  label: string;
  placeholder?: string;
  action: string;
  sending: string;
  previewTitle: string;
  /** In a reply, the commit replied to, whose thread's people are suggested first. */
  reply?: string | null;
  onCancel: () => void;
  children?: ComponentChildren;
}) {
  const { state, text, setText, body, length, canCommit, submit } = draft;
  const [previewing, setPreviewing] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mentions = useMentionSuggestions(textarea, text, [], reply);

  useEffect(() => {
    if (state.step === 'writing' && !previewing) textarea.current?.focus();
  }, [state.step, previewing]);

  return (
    <>
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
            placeholder={placeholder}
            disabled={state.step === 'sending'}
            class="block max-h-64 min-h-9 w-full resize-none rounded-md border-0 bg-transparent px-2 py-1.5 text-sm text-fg [field-sizing:content] placeholder:text-fg-muted focus:outline-none"
          />
        )}
        {!previewing && mentions.list}
        {!previewing && <AttachedImages images={draft.images} errors={draft.imageErrors} onDescribe={draft.describe} onRemove={draft.detach} />}
        {children}

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
            title={previewing ? 'Back to writing' : previewTitle}
            class={`${TOOL} aria-pressed:text-fg-accent`}
          >
            <Octicon name="eye" />
          </button>
          <span class="ml-auto mr-2 flex items-center gap-3">
            <StashLabel restored={draft.restored} onDrop={draft.drop} />
            <span class={`text-xs ${length > MAX_COMMIT_LENGTH ? 'text-fg-danger' : 'text-fg-muted'}`}>
              {length} / {MAX_COMMIT_LENGTH}
            </span>
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
            {state.step === 'sending' ? sending : action}
          </button>
        </div>
      </form>
      {state.step === 'failed' && <CommitError error={state.error} />}
    </>
  );
}
