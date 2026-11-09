import { afterEach, describe, expect, it } from 'vitest';
import { calendar, dateOf, dayOf, hours, minutes, monthLabel, scheduleLabel, selectable, skipped } from '../src/lib/schedule.ts';

// Monday, November 9, 2026, 14:22, in the reader's time zone.
const now = new Date(2026, 10, 9, 14, 22);

describe('days', () => {
  it('names a day as YYYY-MM-DD in the reader’s time zone, and back', () => {
    expect(dayOf(now)).toBe('2026-11-09');
    expect(dateOf('2026-11-09', 15, 5)).toEqual(new Date(2026, 10, 9, 15, 5));
  });

  it('lays a month out in weeks from Sunday, with the days around it', () => {
    const weeks = calendar(2026, 10);

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
    expect(weeks[4]).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05']);
    expect(calendar(2026, 11)[0]?.[0]).toBe('2026-11-29');
  });

  it('labels a month as dev-null.sh does', () => {
    expect(monthLabel(2026, 10)).toBe('November 2026');
  });
});

describe('what can be picked: after now, within 30 days', () => {
  it('offers today to 30 days ahead', () => {
    expect(selectable('2026-11-08', now)).toBe(false);
    expect(selectable('2026-11-09', now)).toBe(true);
    expect(selectable('2026-12-09', now)).toBe(true);
    expect(selectable('2026-12-10', now)).toBe(false);
  });

  it('offers today’s hours and minutes still ahead, by 5 minutes', () => {
    expect(hours('2026-11-09', now)[0]).toBe(14);
    expect(minutes('2026-11-09', 14, now)).toEqual([25, 30, 35, 40, 45, 50, 55]);
    expect(minutes('2026-11-09', 15, now)).toHaveLength(12);
  });

  it('offers every hour of a day in between', () => {
    expect(hours('2026-11-20', now)).toHaveLength(24);
  });

  it('stops 30 days from now', () => {
    expect(hours('2026-12-09', now).at(-1)).toBe(14);
    expect(minutes('2026-12-09', 14, now)).toEqual([0, 5, 10, 15, 20]);
  });

  it('leaves today out once its last slot has passed', () => {
    expect(selectable('2026-11-09', new Date(2026, 10, 9, 23, 56))).toBe(false);
  });
});

describe('skipped times', () => {
  const zone = process.env.TZ;
  afterEach(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('tells a time the clocks skip when they move forward', () => {
    process.env.TZ = 'America/New_York';

    expect(skipped('2027-03-14', 2, 30)).toBe(true);
    expect(skipped('2027-03-14', 3, 30)).toBe(false);
  });
});

describe('scheduleLabel', () => {
  it('says when, as dev-null.sh’s picker does', () => {
    expect(scheduleLabel(new Date(2026, 10, 9, 15, 0))).toBe('Mon, Nov 9, 3:00 PM');
  });
});
