import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { additionCandidates } from '../lib/mentions.ts';
import { MAX_COMMIT_LENGTH } from '../lib/share.ts';
import { IMAGES_OR_POLL, useCommitDraft } from '../lib/use-commit-draft.ts';
import { privacyWarning, type WebPage } from '../lib/web-page.ts';
import { AdditionTools, AdditionWarnings } from './Additions.tsx';
import { AttachedImages, filesOf, ImagePicker } from './AttachedImages.tsx';
import { CommitError } from './CommitError.tsx';
import { Loader } from './Loader.tsx';
import { useMentionSuggestions } from './MentionSuggestions.tsx';
import { Octicon } from './Octicon.tsx';
import { ComposerPoll, PollTool } from './PollEditor.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';
import { StashLabel } from './StashLabel.tsx';

type Tab = 'write' | 'preview';

// As the additions' buttons, so the toolbar lines up.
const TOOL =
  'rounded-md p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-fg-muted';

/**
 * The composer of the popup's share view, laid out for its 360 pixels as the popup's design: the page shared on top,
 * Write and Preview, the text across the whole width, the stash and the count under it, and a footer with the tools
 * on the left and Commit on the right.
 */
/** The page's image, decorative beside its title; gone if it doesn't load, rather than a broken image. */
function CardImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return <img src={src} alt="" onError={() => setFailed(true)} class="size-14 shrink-0 rounded-md bg-zinc-100 object-cover" />;
}

/** How long the confirmation stays before the popup closes. */
const CLOSE_DELAY = 2000;

export function PopupComposer({ page, onDone }: { page: WebPage /** Once committed and said so: the popup closes. */; onDone?: () => void }) {
  const draft = useCommitDraft({ web: page });
  const { state, text, setText, additions, inCommit, insert, warnings, body, length, canCommit, submit, remaining } = draft;
  const [tab, setTab] = useState<Tab>('write');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mentions = useMentionSuggestions(textarea, text, additionCandidates(additions));
  const privacy = privacyWarning(page.url);

  useEffect(() => {
    if (state.step === 'writing' && tab === 'write') textarea.current?.focus();
  }, [state.step, tab]);

  useEffect(() => {
    if (state.step !== 'sent' || !onDone) return;
    const timer = setTimeout(onDone, CLOSE_DELAY);
    return () => clearTimeout(timer);
  }, [state.step]);

  // The page's link was inserted for the user to write before it; before the paint, so the caret doesn't jump.
  useLayoutEffect(() => {
    if (draft.prefilled) textarea.current?.setSelectionRange(0, 0);
  }, [draft.prefilled]);

  if (state.step === 'loading') return <Loader label="Checking your /dev/null session…" />;
  if (state.step === 'signed-out') return <p class="m-0 p-4 text-zinc-600">Connect your /dev/null account first.</p>;
  if (state.step === 'sent') {
    const pending = state.commit.status === 'pending';
    return (
      <div role="status" class="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span class={`flex size-12 items-center justify-center rounded-full ${pending ? 'bg-amber-50 text-amber-800' : 'bg-cyan-50 text-cyan-700'}`}>
          <Octicon name="check-circle-fill" class="size-6" />
        </span>
        <p class="m-0 text-[17px] font-bold">{pending ? 'Committed, awaiting review' : 'Committed'}</p>
        {pending && <p class="m-0 text-[13px] text-zinc-600">It shows publicly once it passes review.</p>}
        <a href={state.commit.html_url} target="_blank" rel="noopener" class="text-[13px] font-semibold text-blue-600 hover:underline">
          View the commit
        </a>
        <p class="m-0 mt-2 text-[11px] text-zinc-600">Closing…</p>
      </div>
    );
  }

  return (
    <form
      class="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
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

      <div class="flex flex-col gap-2 px-3 py-2.5">
        <div data-page-card class="flex gap-2.5 rounded-lg border border-solid border-zinc-200 p-2">
          {page.meta?.image && <CardImage src={page.meta.image} />}
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate font-mono text-[11px] text-zinc-600">{page.meta?.siteName ?? new URL(page.url).hostname}</span>
            <span class="truncate text-[13px] font-semibold">{page.meta?.title ?? page.title}</span>
            {page.meta?.description && <span class="line-clamp-2 text-[11px] text-zinc-600">{page.meta.description}</span>}
            <span class="text-[11px] text-zinc-500">Unfurls into a link card after you commit.</span>
          </div>
        </div>

        {privacy && (
          <p data-privacy class="m-0 rounded-md border border-solid border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            {privacy}
          </p>
        )}

        <div role="tablist" aria-label="Commit" class="flex gap-1">
          {(['write', 'preview'] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              class="h-7 cursor-pointer rounded-md border border-solid border-transparent bg-transparent px-2.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 aria-selected:border-zinc-300 aria-selected:bg-white aria-selected:font-semibold aria-selected:text-zinc-900"
            >
              {name === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>

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
            rows={6}
            aria-label="Commit message"
            placeholder={draft.poll ? 'Ask a question' : 'What do you think of it?'}
            disabled={state.step === 'sending'}
            class="box-border block w-full resize-none rounded-md border border-solid border-zinc-300 bg-white px-2.5 py-2 font-sans text-[13px] leading-normal text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        ) : (
          <div class="box-border min-h-[134px] rounded-md border border-solid border-zinc-200 px-2.5 py-2 text-[13px]">
            <PreviewPanel body={body} images={draft.images} />
          </div>
        )}
        {tab === 'write' && mentions.list}
        {tab === 'write' && <AttachedImages images={draft.images} errors={draft.imageErrors} onDescribe={draft.describe} onRemove={draft.detach} />}
        {draft.poll && (
          <ComposerPoll
            poll={draft.poll}
            previewing={tab === 'preview'}
            onChange={draft.setPoll}
            onRemove={draft.removePoll}
            disabled={state.step === 'sending'}
          />
        )}

        <AdditionWarnings warnings={warnings} onInsert={(addition) => insert(addition, textarea.current)} />
        {state.step === 'failed' && <CommitError error={state.error} />}

        <div class="flex items-center gap-2">
          <StashLabel restored={draft.restored} onDrop={draft.drop} />
          <span data-counter class={`ml-auto font-mono text-[11px] ${length > MAX_COMMIT_LENGTH ? 'text-red-700' : 'text-zinc-600'}`}>
            {length} / {MAX_COMMIT_LENGTH}
          </span>
        </div>
        {remaining > 0 && (
          <p data-remaining class="m-0 text-right text-[11px] text-amber-800">
            {remaining} more {remaining === 1 ? 'character' : 'characters'} to say what you think of it
          </p>
        )}
      </div>

      <footer class="flex items-center gap-0.5 border-0 border-t border-solid border-zinc-200 px-3 py-2">
        <div role="toolbar" aria-label="Commit tools" class="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={!draft.canAttach}
            aria-label="Attach images"
            title={draft.poll ? IMAGES_OR_POLL : 'Attach images: up to 3, JPEG, PNG or WebP'}
            class={TOOL}
          >
            <Octicon name="image" />
          </button>
          <PollTool draft={draft} class={TOOL} />
          <AdditionTools additions={additions} inCommit={inCommit} onInsert={(addition) => insert(addition, textarea.current)} />
        </div>
        <button
          type="submit"
          disabled={!canCommit}
          class="ml-auto h-8 cursor-pointer rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {state.step === 'sending' ? 'Committing…' : 'Commit'}
        </button>
      </footer>
    </form>
  );
}
