const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, 'minute');
}

const READER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The calendar day of a date in the reader's time zone, e.g. `2026-10-31`. */
export function dayKey(iso: string | Date, timeZone: string = READER_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date(iso));
}

/** As dev-null.sh labels a day in its logs: Today, Yesterday, then "Thu, Oct 29", with the year when it differs. */
export function dayLabel(iso: string, now: Date = new Date(), timeZone: string = READER_TIME_ZONE): string {
  const day = dayKey(iso, timeZone);
  const today = dayKey(now, timeZone);
  const daysAgo = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
    timeZone,
  });
}
