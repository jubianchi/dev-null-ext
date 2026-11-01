import { describe, expect, it } from 'vitest';
import { dayKey, dayLabel } from '../src/lib/time.ts';

const now = new Date('2026-11-01T10:00:00Z');

describe('dayKey', () => {
  it('reads the calendar day in the reader time zone', () => {
    expect(dayKey('2026-10-31T23:30:00Z', 'UTC')).toBe('2026-10-31');
    expect(dayKey('2026-10-31T23:30:00Z', 'Europe/Paris')).toBe('2026-11-01');
  });
});

describe('dayLabel', () => {
  it('says Today and Yesterday, by calendar day', () => {
    expect(dayLabel('2026-11-01T00:05:00Z', now, 'UTC')).toBe('Today');
    expect(dayLabel('2026-10-31T23:55:00Z', now, 'UTC')).toBe('Yesterday');
    expect(dayLabel('2026-10-31T23:55:00Z', now, 'Europe/Paris')).toBe('Today');
  });

  it('writes older days in English, with the year only when it differs', () => {
    expect(dayLabel('2026-10-29T12:00:00Z', now, 'UTC')).toBe('Thu, Oct 29');
    expect(dayLabel('2025-12-29T12:00:00Z', now, 'UTC')).toBe('Mon, Dec 29, 2025');
  });
});
