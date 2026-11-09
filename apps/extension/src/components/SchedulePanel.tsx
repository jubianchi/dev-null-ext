import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { menuPosition } from '../lib/menu-position.ts';
import {
  calendar,
  type Day,
  dateOf,
  dayOf,
  hours,
  minutes,
  monthLabel,
  SCHEDULE_DAYS,
  SCHEDULED_COMMITS_URL,
  schedulable,
  scheduleLabel,
  selectable,
  TIME_ZONE,
} from '../lib/schedule.ts';
import type { DraftSchedule } from '../lib/use-commit-draft.ts';
import { Lucide } from './Lucide.tsx';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const SELECT =
  'h-8 w-full appearance-none rounded-md border border-solid border-border bg-canvas pr-7 pl-2 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-50';
const ARROW =
  'cursor-pointer rounded-md border-0 bg-transparent p-1.5 text-fg-muted hover:bg-button-hover hover:text-fg aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg-muted';

/** A composer's submit button, as dev-null.sh's: "Schedule commit" once scheduling. */
export function submitLabel(sending: boolean, scheduling: boolean): string {
  if (scheduling) return sending ? 'Scheduling…' : 'Schedule commit';
  return sending ? 'Committing…' : 'Commit';
}

/** The composer toolbar's clock, as dev-null.sh's: it opens the schedule panel, and closes it to commit right away. */
export function ScheduleTool({
  draft,
  disabled = false,
  class: className,
}: {
  draft: { canSchedule: boolean; schedule: DraftSchedule; toggleSchedule: () => void };
  /** While the commit is being sent: turning scheduling off then would say Committing… of a commit being scheduled. */
  disabled?: boolean;
  class: string;
}) {
  if (!draft.canSchedule) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={draft.toggleSchedule}
      aria-label="Schedule"
      aria-pressed={draft.schedule.open}
      title={draft.schedule.open ? "Don't schedule" : 'Schedule for later'}
      class={`${className} aria-pressed:bg-button aria-pressed:text-fg-accent`}
    >
      <Lucide name="clock-3" />
    </button>
  );
}

/**
 * When to submit a scheduled commit, as dev-null.sh's panel: the date and time, picked in the reader's time zone, what
 * happens then, and the way to the commits already scheduled, which dev-null.sh lists and cancels.
 */
export function SchedulePanel({
  at,
  onChange,
  now = () => new Date(),
  disabled = false,
}: {
  at: Date | null;
  onChange: (at: Date) => void;
  now?: () => Date;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const triggerId = useId();

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div data-schedule class="mt-2 flex flex-col gap-2 rounded-lg border border-solid border-border p-3">
      <span id={labelId} class="text-sm font-semibold text-fg">
        Submit at
      </span>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Escape and focus leaving close the picker, from its button as from inside it. */}
      <div
        ref={wrapper}
        onKeyDown={(event) => {
          if (!open || event.key !== 'Escape') return;
          // The picker only: the modal composer's dialog, the share frame and the popup would close on Escape too.
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
        onFocusOut={(event) => {
          const next = event.relatedTarget;
          if (open && next instanceof Node && !wrapper.current?.contains(next)) setOpen(false);
        }}
      >
        <button
          ref={trigger}
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${labelId} ${triggerId}`}
          onClick={() => setOpen(!open)}
          class={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border border-solid border-border bg-canvas px-2.5 text-left text-sm hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50 ${at ? 'text-fg' : 'text-fg-muted'}`}
        >
          <Lucide name="calendar-clock" />
          {at ? scheduleLabel(at) : 'Pick a date and time'}
        </button>
        {open && (
          <SchedulePicker
            at={at}
            now={now()}
            anchor={trigger}
            wrapper={wrapper}
            onDone={(picked) => {
              onChange(picked);
              close();
            }}
            onClose={close}
            onDismiss={() => setOpen(false)}
          />
        )}
      </div>
      <p class="m-0 text-xs text-fg-muted">
        {TIME_ZONE}. Within {SCHEDULE_DAYS} days. Private until submitted; then submitted for review, not published automatically.
      </p>
      <a href={SCHEDULED_COMMITS_URL} target="_blank" rel="noopener" class="self-start text-xs text-fg-accent hover:underline">
        Scheduled commits →
      </a>
    </div>
  );
}

/** A calendar from today to 30 days ahead, then the hour and the minute, by 5, as dev-null.sh's picker. */
function SchedulePicker({
  at,
  now,
  anchor,
  wrapper,
  onDone,
  onClose,
  onDismiss,
}: {
  at: Date | null;
  now: Date;
  anchor: { current: HTMLElement | null };
  wrapper: { current: HTMLElement | null };
  onDone: (at: Date) => void;
  /** Closes it, the focus back on its button. */
  onClose: () => void;
  /** Closes it where the user is elsewhere: the focus is left where it is, and moving it could scroll. */
  onDismiss: () => void;
}) {
  // A date chosen that has passed since is no choice any more: the picker opens empty, on this month.
  const chosen = at && schedulable(at, now) ? at : null;
  const start = chosen ?? now;
  const [month, setMonth] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [day, setDay] = useState<Day | null>(chosen ? dayOf(chosen) : null);
  const [hour, setHour] = useState<number | null>(chosen ? chosen.getHours() : null);
  const [minute, setMinute] = useState<number | null>(chosen ? chosen.getMinutes() : null);
  const popover = useRef<HTMLDivElement>(null);

  const last = new Date(now.getTime() + SCHEDULE_DAYS * 86_400_000);
  const hourChoices = day ? hours(day, now) : [];
  const minuteChoices = day && hour !== null ? minutes(day, hour, now) : [];
  const ready = day !== null && hour !== null && minute !== null && minuteChoices.includes(minute);

  // In the top layer, as a popover, so the modal composer's dialog doesn't clip it; placed before it is painted.
  useLayoutEffect(() => {
    const element = popover.current;
    const button = anchor.current;
    if (!element || !button) return;

    if (typeof element.showPopover === 'function') element.showPopover();
    const { top, left } = menuPosition(
      button.getBoundingClientRect(),
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      'below',
    );
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    (
      element.querySelector<HTMLButtonElement>(`[data-day="${day}"]:not(:disabled)`) ?? element.querySelector<HTMLButtonElement>('[data-day]:not(:disabled)')
    )?.focus();
  }, []);

  useEffect(() => {
    const outside = (event: Event) => {
      if (wrapper.current && !event.composedPath().includes(wrapper.current)) onClose();
    };
    // Placed once, in the viewport: rather than float away from its button, it goes once a scroll moves the button.
    // Scroll events don't leave a shadow root, hence the listener on the button's root too.
    const placed = anchor.current?.getBoundingClientRect();
    const scrolled = () => {
      const moved = anchor.current?.getBoundingClientRect();
      if (placed && moved && (Math.abs(moved.top - placed.top) > 1 || Math.abs(moved.left - placed.left) > 1)) onDismiss();
    };
    const root = anchor.current?.getRootNode();
    const targets: EventTarget[] = root && root !== document ? [window, root] : [window];
    window.addEventListener('pointerdown', outside);
    // A click around the share frame or out of the popup is out of the pointerdown's sight: the window loses the focus.
    window.addEventListener('blur', onDismiss);
    for (const target of targets) target.addEventListener('scroll', scrolled, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('blur', onDismiss);
      for (const target of targets) target.removeEventListener('scroll', scrolled, { capture: true });
    };
  }, []);

  function pickDay(picked: Day) {
    setDay(picked);
    if (hour === null) return;
    if (!hours(picked, now).includes(hour)) {
      setHour(null);
      setMinute(null);
    } else if (minute !== null && !minutes(picked, hour, now).includes(minute)) {
      setMinute(null);
    }
  }

  function pickHour(picked: number | null) {
    setHour(picked);
    if (day && picked !== null && minute !== null && !minutes(day, picked, now).includes(minute)) setMinute(null);
  }

  const index = month.year * 12 + month.month;
  const firstMonth = index <= now.getFullYear() * 12 + now.getMonth();
  const lastMonth = index >= last.getFullYear() * 12 + last.getMonth();
  function shift(by: number) {
    if ((by < 0 && firstMonth) || (by > 0 && lastMonth)) return;
    const next = index + by;
    setMonth({ year: Math.floor(next / 12), month: next % 12 });
  }

  return (
    <div
      ref={popover}
      role="dialog"
      aria-label="Pick a date and time"
      popover="manual"
      class="fixed inset-auto m-0 w-64 rounded-xl border border-solid border-border bg-canvas-overlay p-0 font-sans text-sm text-fg shadow-overlay"
    >
      <div class="flex items-center justify-between px-3 pt-3">
        {/* aria-disabled rather than disabled: a button disabled under the focus drops it to the body, out of the picker's reach of Escape. */}
        <button type="button" aria-label="Previous month" aria-disabled={firstMonth} onClick={() => shift(-1)} class={ARROW}>
          <Lucide name="chevron-left" />
        </button>
        <span class="font-semibold">{monthLabel(month.year, month.month)}</span>
        <button type="button" aria-label="Next month" aria-disabled={lastMonth} onClick={() => shift(1)} class={ARROW}>
          <Lucide name="chevron-right" />
        </button>
      </div>

      <div class="grid grid-cols-7 gap-0.5 px-3 py-2 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} class="py-1 text-xs text-fg-muted">
            {weekday}
          </span>
        ))}
        {calendar(month.year, month.month)
          .flat()
          .map((candidate) => {
            const inMonth = Number(candidate.slice(5, 7)) - 1 === month.month;
            const chosen = candidate === day;
            return (
              <button
                key={candidate}
                type="button"
                data-day={candidate}
                disabled={!selectable(candidate, now)}
                aria-pressed={chosen}
                aria-label={dateOf(candidate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                onClick={() => pickDay(candidate)}
                class={`size-8 cursor-pointer rounded-md border-2 border-solid bg-transparent p-0 text-sm hover:bg-button-hover focus-visible:outline-2 focus-visible:outline-fg-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${chosen ? 'border-fg-accent' : 'border-transparent'} ${inMonth ? 'text-fg' : 'text-fg-muted'}`}
              >
                {Number(candidate.slice(8))}
              </button>
            );
          })}
      </div>

      <div class="flex items-center gap-2 border-0 border-t border-solid border-border p-3">
        <span class="relative flex-1">
          <select
            aria-label="Hour"
            disabled={day === null}
            onChange={(event) => pickHour(event.currentTarget.value === '' ? null : Number(event.currentTarget.value))}
            class={SELECT}
          >
            <option value="" selected={hour === null} disabled>
              Hour
            </option>
            {hourChoices.map((choice) => (
              <option key={choice} value={choice} selected={choice === hour}>
                {String(choice).padStart(2, '0')}
              </option>
            ))}
          </select>
          <Lucide name="chevron-down" class="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-fg-muted" />
        </span>
        <span class="text-fg-muted">:</span>
        <span class="relative flex-1">
          <select
            aria-label="Minute"
            disabled={hour === null}
            onChange={(event) => setMinute(event.currentTarget.value === '' ? null : Number(event.currentTarget.value))}
            class={SELECT}
          >
            <option value="" selected={minute === null} disabled>
              Min
            </option>
            {minuteChoices.map((choice) => (
              <option key={choice} value={choice} selected={choice === minute}>
                {String(choice).padStart(2, '0')}
              </option>
            ))}
          </select>
          <Lucide name="chevron-down" class="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-fg-muted" />
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (ready) onDone(dateOf(day, hour, minute));
          }}
          class="h-8 cursor-pointer rounded-md border-0 bg-primary px-3 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
        >
          Done
        </button>
      </div>
    </div>
  );
}
