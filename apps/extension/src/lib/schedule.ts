import { SERVER } from './server.ts';

/** The way to the commits already scheduled: dev-null.sh lists them, commits them now or cancels them. */
export const SCHEDULED_COMMITS_URL = `${SERVER}/scheduled-commits`;

/** How far ahead /dev/null lets a commit be scheduled. */
export const SCHEDULE_DAYS = 30;
/** As dev-null.sh's picker steps its minutes. */
export const MINUTE_STEP = 5;

const DAY_MS = 86_400_000;

/** The reader's time zone, which the picker's days and hours are in. */
export const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A calendar day in the reader's time zone, as `YYYY-MM-DD`. */
export type Day = string;

const pad = (value: number) => String(value).padStart(2, '0');

export function dayOf(date: Date): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day's time in the reader's time zone; a time the clocks skip comes out shifted (see `skipped`). */
export function dateOf(day: Day, hour = 0, minute = 0): Date {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date, hour, minute);
}

/** The weeks, from Sunday, that a month (0 for January) spans, with the neighbouring months' days that fill them. */
export function calendar(year: number, month: number): Day[][] {
  const lead = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => dayOf(new Date(year, month, 1 - lead + week * 7 + day))),
  );
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Whether a time can be scheduled: after now, and within 30 days as /dev/null counts them, in UTC. */
function allowed(date: Date, now: Date): boolean {
  return date > now && date.getTime() <= now.getTime() + SCHEDULE_DAYS * DAY_MS;
}

const STEPS = Array.from({ length: 60 / MINUTE_STEP }, (_, step) => step * MINUTE_STEP);

/**
 * A day's minutes, by 5, that can be scheduled at an hour; none in the hour the clocks skip. In the hour they repeat,
 * the first one.
 */
export function minutes(day: Day, hour: number, now: Date): number[] {
  return STEPS.filter((minute) => offered(day, hour, minute, now));
}

function offered(day: Day, hour: number, minute: number, now: Date): boolean {
  return !skipped(day, hour, minute) && allowed(dateOf(day, hour, minute), now);
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** A day's hours that have at least one minute that can be scheduled. */
export function hours(day: Day, now: Date): number[] {
  return HOURS.filter((hour) => STEPS.some((minute) => offered(day, hour, minute, now)));
}

/** Whether a day has a time that can be scheduled: only today and the 30th day may have none left. */
export function selectable(day: Day, now: Date): boolean {
  const first = dayOf(now);
  const last = dayOf(new Date(now.getTime() + SCHEDULE_DAYS * DAY_MS));
  if (day < first || day > last) return false;
  if (day > first && day < last) return true;
  return HOURS.some((hour) => STEPS.some((minute) => offered(day, hour, minute, now)));
}

/** Whether the clocks skip this time when they move forward, so that it never happens. */
export function skipped(day: Day, hour: number, minute: number): boolean {
  const date = dateOf(day, hour, minute);
  return date.getHours() !== hour || date.getMinutes() !== minute;
}

/** As dev-null.sh's picker says when: "Mon, Nov 9, 3:00 PM". */
export function scheduleLabel(date: Date): string {
  return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
