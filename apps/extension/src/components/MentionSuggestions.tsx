import type { RefObject } from 'preact';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { caretRect } from '../lib/caret.ts';
import { type MentionCandidate, matching, mentionAt, suggestedCandidates, withMention } from '../lib/mentions.ts';
import { ask } from '../lib/messages.ts';
import { replaceText } from '../lib/textarea.ts';
import { laneColor } from './CommitParts.tsx';

/** As many as dev-null.sh's composer shows, and its pause before asking (ms). */
const LIMIT = 6;
const DEBOUNCE = 120;
const GAP = 4;
const MARGIN = 8;

/**
 * Suggestions while typing a mention, as dev-null.sh's composer offers them: from `@`, the candidates matching what
 * follows it, under the caret. Arrows move through them, Enter or Tab completes the mention, a click too; Escape closes
 * them, and only them, until the next mention. The textarea keeps the focus, as a combobox.
 */
export function useMentionSuggestions(textarea: RefObject<HTMLTextAreaElement>, text: string, candidates: MentionCandidate[]) {
  const id = useId();
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [focused, setFocused] = useState(true);
  const [suggested, setSuggested] = useState<MentionCandidate[]>([]);

  const mention = caret === null ? null : mentionAt(text, caret);
  const query = mention?.query ?? null;

  // /dev/null's suggestions, as its composer asks: at once for a bare @, once the user pauses typing otherwise.
  useEffect(() => {
    if (query === null) return;

    let current = true;
    const suggest = () => {
      ask({ type: 'mention-suggestions', query }).then(
        (suggestions) => current && setSuggested(suggestedCandidates(suggestions)),
        () => undefined,
      );
    };
    if (query === '') suggest();
    const timer = query === '' ? undefined : setTimeout(suggest, DEBOUNCE);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const options = mention && focused && dismissed !== mention.start ? matching([...candidates, ...suggested], mention.query).slice(0, LIMIT) : [];
  const open = options.length > 0;
  const current = Math.min(active, options.length - 1);

  function track(element: HTMLTextAreaElement) {
    setCaret(element.selectionStart === element.selectionEnd ? element.selectionStart : null);
    setActive(0);
  }

  function complete(candidate: MentionCandidate) {
    const element = textarea.current;
    if (!element || !mention) return;

    const { value, caret: next } = withMention(text, mention, candidate.handle);
    replaceText(element, value, next);
    setCaret(next);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!open) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if ((event.key === 'Enter' && !event.metaKey && !event.ctrlKey) || event.key === 'Tab') {
      const candidate = options[current];
      if (!candidate) return;
      event.preventDefault();
      complete(candidate);
    } else if (event.key === 'Escape') {
      // The suggestions only: the modal composer's dialog would close on Escape too.
      event.preventDefault();
      event.stopPropagation();
      setDismissed(mention?.start ?? null);
    }
  }

  const textareaProps = {
    'aria-autocomplete': 'list' as const,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    'aria-activedescendant': open ? `${id}-${current}` : undefined,
    onKeyDown,
    onKeyUp: (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) track(event.currentTarget as HTMLTextAreaElement);
    },
    onClick: (event: MouseEvent) => track(event.currentTarget as HTMLTextAreaElement),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  const list = open && mention && (
    <MentionList id={id} textarea={textarea} at={mention.start} options={options} active={current} onHover={setActive} onChoose={complete} />
  );

  return { track, textareaProps, list };
}

function MentionList({
  id,
  textarea,
  at,
  options,
  active,
  onHover,
  onChoose,
}: {
  id: string;
  textarea: RefObject<HTMLTextAreaElement>;
  at: number;
  options: MentionCandidate[];
  active: number;
  onHover: (index: number) => void;
  onChoose: (candidate: MentionCandidate) => void;
}) {
  const list = useRef<HTMLDivElement>(null);

  // In the top layer, as a popover, so the modal composer's dialog doesn't clip it: under the mention's line, or above
  // it when there is no room below.
  useLayoutEffect(() => {
    const element = list.current;
    const field = textarea.current;
    if (!element || !field) return;

    if (typeof element.showPopover === 'function' && !('shown' in element.dataset)) {
      element.showPopover();
      element.dataset.shown = '';
    }
    const caret = caretRect(field, at);
    const below = caret.bottom + GAP;
    const top = below + element.offsetHeight + MARGIN <= window.innerHeight ? below : Math.max(MARGIN, caret.top - GAP - element.offsetHeight);
    element.style.top = `${top}px`;
    element.style.left = `${Math.min(Math.max(caret.left, MARGIN), window.innerWidth - MARGIN - element.offsetWidth)}px`;
  });

  return (
    <div
      ref={list}
      id={id}
      role="listbox"
      aria-label="Mention suggestions"
      popover="manual"
      class="fixed inset-auto m-0 w-72 rounded-xl border border-border bg-canvas-overlay p-1 font-sans text-fg shadow-overlay"
    >
      {options.map((candidate, index) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard stays in the textarea, which handles arrows, Enter and Tab.
        <div
          key={candidate.handle}
          id={`${id}-${index}`}
          role="option"
          tabIndex={-1}
          aria-selected={index === active}
          data-handle={candidate.handle}
          onPointerDown={(event) => event.preventDefault()}
          onPointerMove={() => onHover(index)}
          onClick={() => onChoose(candidate)}
          class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 aria-selected:bg-button-hover"
        >
          {candidate.avatarUrl ? (
            <img src={candidate.avatarUrl} alt="" width={32} height={32} class="size-8 shrink-0 rounded-full" />
          ) : (
            <span class="size-8 shrink-0 rounded-full bg-canvas-muted" />
          )}
          <span class="min-w-0 flex-1">
            {candidate.name && <span class="block truncate text-sm font-semibold">{candidate.name}</span>}
            <span class={`flex items-center gap-1.5 truncate font-mono ${candidate.name ? 'text-xs text-fg-muted' : 'text-sm font-semibold'}`}>
              {candidate.lane !== null && (
                <span aria-hidden="true" class="size-1.5 shrink-0 rounded-full" style={{ background: laneColor({ lane: candidate.lane }) }} />
              )}
              @{candidate.handle}
            </span>
            {candidate.reason && <span class="block text-xs text-fg-muted">{candidate.reason}</span>}
          </span>
          {index === active && (
            <span aria-hidden="true" class="text-xs text-fg-muted">
              ↵
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
