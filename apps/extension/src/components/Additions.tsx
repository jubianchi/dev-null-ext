import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Addition } from '../lib/additions.ts';
import { menuPosition } from '../lib/menu-position.ts';
import { Octicon, type OcticonName } from './Octicon.tsx';

const ICONS: Record<Addition['kind'], OcticonName> = { link: 'link', mention: 'mention' };
const MENU_LABELS: Record<Addition['kind'], string> = { link: 'Insert a link', mention: 'Insert a mention' };

const TOOL = 'relative rounded-md p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg';

interface ToolProps {
  inCommit: (addition: Addition) => boolean;
  onInsert: (addition: Addition) => void;
}

/**
 * The additions as toolbar buttons, as GitHub's editor inserts a link or a mention: one button per kind. Alone of its
 * kind, an addition is inserted at once; several of a kind (the author and the organization) are a menu to choose
 * from. A discreet dot says one is already in the text, typed by hand too.
 */
export function AdditionTools({ additions, inCommit, onInsert }: ToolProps & { additions: Addition[] }) {
  const kinds = [...new Set(additions.map((addition) => addition.kind))];

  return (
    <>
      {kinds.map((kind) => {
        const ofKind = additions.filter((addition) => addition.kind === kind);
        const [only] = ofKind;

        return ofKind.length === 1 && only ? (
          <AdditionButton key={kind} addition={only} inCommit={inCommit} onInsert={onInsert} />
        ) : (
          <AdditionMenu key={kind} kind={kind} additions={ofKind} inCommit={inCommit} onInsert={onInsert} />
        );
      })}
    </>
  );
}

function AdditionButton({ addition, inCommit, onInsert }: ToolProps & { addition: Addition }) {
  const present = inCommit(addition);

  return (
    <button
      type="button"
      onClick={() => onInsert(addition)}
      aria-label={`Insert ${addition.label}${present ? ' (already in your commit)' : ''}`}
      title={`Insert ${addition.label}: ${addition.reason}`}
      data-in-commit={present || undefined}
      class={TOOL}
    >
      <Octicon name={ICONS[addition.kind]} />
      {present && <InCommitDot />}
    </button>
  );
}

function InCommitDot() {
  return <span class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-fg-success" aria-hidden="true" />;
}

/**
 * Several additions of a kind, as GitHub's action menus: each with its label and reason, checked when it is in the
 * text. Arrows move through them, Enter inserts one, Escape or a click elsewhere closes the menu, and only the menu.
 */
function AdditionMenu({ kind, additions, inCommit, onInsert }: ToolProps & { kind: Addition['kind']; additions: Addition[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const anyIn = additions.some(inCommit);

  // In the top layer, as a popover, so the modal composer's dialog doesn't clip it; placed before it is painted.
  useLayoutEffect(() => {
    const element = menu.current;
    const button = trigger.current;
    if (!open || !element || !button) return;

    if (typeof element.showPopover === 'function') element.showPopover();
    const { top, left } = menuPosition(
      button.getBoundingClientRect(),
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: Event) => {
      if (wrapper.current && !event.composedPath().includes(wrapper.current)) setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const current = items.indexOf(event.target as HTMLElement);

    if (event.key === 'Escape') {
      // The menu only: the modal composer's dialog would close on Escape too.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <span ref={wrapper} class="relative inline-flex">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={MENU_LABELS[kind]}
        aria-haspopup="menu"
        aria-expanded={open}
        title={MENU_LABELS[kind]}
        class={TOOL}
      >
        <Octicon name={ICONS[kind]} />
        {anyIn && <InCommitDot />}
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          popover="manual"
          aria-label={MENU_LABELS[kind]}
          onKeyDown={onKeyDown}
          class="fixed inset-auto m-0 w-72 rounded-xl border border-border bg-canvas-overlay p-2 font-sans text-fg shadow-overlay"
        >
          {additions.map((addition) => {
            const present = inCommit(addition);

            return (
              <button
                key={addition.id}
                type="button"
                role="menuitem"
                aria-checked={present}
                onClick={() => {
                  close();
                  onInsert(addition);
                }}
                class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-button-hover focus:bg-button-hover focus:outline-none"
              >
                <span class="mt-0.5 size-4 shrink-0 text-fg-muted">{present && <Octicon name="check" />}</span>
                <span class="min-w-0">
                  <span data-label class="block font-medium">
                    {addition.label}
                  </span>
                  <span class="block text-xs text-fg-muted">{addition.reason}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}

/** What leaving an addition out would mean, with a way to insert it. */
export function AdditionWarnings({ warnings, onInsert }: { warnings: Addition[]; onInsert: (addition: Addition) => void }) {
  return (
    <>
      {warnings.map((addition) => (
        <p key={addition.id} role="status" class="m-0 flex flex-wrap items-center gap-1 text-xs text-fg-attention">
          {addition.missing}
          <button type="button" onClick={() => onInsert(addition)} class="font-medium text-fg-accent hover:underline">
            Insert {addition.label}
          </button>
        </p>
      ))}
    </>
  );
}
