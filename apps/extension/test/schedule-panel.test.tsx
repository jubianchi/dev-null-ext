// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulePanel, ScheduleTool } from '../src/components/SchedulePanel.tsx';
import { TIME_ZONE } from '../src/lib/schedule.ts';

// Monday, November 9, 2026, 14:22, in the reader's time zone.
const now = new Date(2026, 10, 9, 14, 22);

let root: HTMLElement;
const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(at: Date | null = null) {
  await act(async () => {
    render(<SchedulePanel at={at} onChange={onChange} now={() => now} />, root);
  });
}

const button = (label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
  );
const day = (iso: string) => root.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`);
const select = (label: string) => root.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);

async function click(element: HTMLElement | null | undefined) {
  await act(async () => element?.click());
}

async function choose(field: HTMLSelectElement | null, value: string) {
  await act(async () => {
    if (!field) throw new Error('No such select');
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('SchedulePanel', () => {
  it('asks when to submit, in the reader’s time zone, and links to the scheduled commits', async () => {
    await show();

    expect(root.textContent).toContain('Submit at');
    expect(button('Pick a date and time')).toBeDefined();
    expect(root.textContent).toContain(`${TIME_ZONE}. Within 30 days. Private until submitted`);
    const link = root.querySelector<HTMLAnchorElement>('a[href="https://dev-null.sh/scheduled-commits"]');
    expect(link?.textContent).toContain('Scheduled commits');
    expect(link?.target).toBe('_blank');
  });

  it('says the date chosen', async () => {
    await show(new Date(2026, 10, 9, 15, 0));

    expect(button('Mon, Nov 9, 3:00 PM')).toBeDefined();
  });

  it('opens a calendar on this month, from today to 30 days ahead', async () => {
    await show();
    await click(button('Pick a date and time'));

    expect(root.textContent).toContain('November 2026');
    expect(day('2026-11-08')?.disabled).toBe(true);
    expect(day('2026-11-09')?.disabled).toBe(false);
    expect(button('Previous month')?.getAttribute('aria-disabled')).toBe('true');
    expect(select('Hour')?.disabled).toBe(true);
    expect(select('Minute')?.disabled).toBe(true);
    expect(button('Done')?.disabled).toBe(true);

    await click(button('Next month'));

    expect(root.textContent).toContain('December 2026');
    expect(day('2026-12-09')?.disabled).toBe(false);
    expect(day('2026-12-10')?.disabled).toBe(true);
    expect(button('Next month')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps the focus on a month arrow that reaches the end, so Escape still reaches the picker', async () => {
    await show();
    await click(button('Pick a date and time'));
    const next = button('Next month');

    await click(next);
    expect(next?.disabled).toBe(false);
    await click(next);

    expect(root.textContent).toContain('December 2026');
  });

  it('forgets a minute the day picked no longer offers', async () => {
    await show();
    await click(button('Pick a date and time'));
    await click(day('2026-11-10'));
    await choose(select('Hour'), '14');
    await choose(select('Minute'), '20');

    await click(day('2026-11-09'));

    expect(select('Hour')?.value).toBe('14');
    expect(select('Minute')?.value).toBe('');
    await choose(select('Minute'), '25');
    expect(button('Done')?.disabled).toBe(false);
  });

  it('opens empty when the date chosen has passed', async () => {
    await show(new Date(2026, 10, 9, 14, 20));
    await click(button('Mon, Nov 9, 2:20 PM'));

    expect(select('Hour')?.value).toBe('');
    expect(select('Minute')?.value).toBe('');
    expect(root.querySelector('[data-day][aria-pressed="true"]')).toBeNull();
  });

  it('closes when the page scrolls, rather than float away from its button', async () => {
    await show();
    await click(button('Pick a date and time'));

    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(day('2026-11-09')).toBeNull();
  });

  it('picks a day, an hour and a minute, by 5, still ahead', async () => {
    await show();
    await click(button('Pick a date and time'));
    await click(day('2026-11-09'));

    expect([...(select('Hour')?.options ?? [])].map((option) => option.value).filter(Boolean)[0]).toBe('14');
    await choose(select('Hour'), '14');
    expect([...(select('Minute')?.options ?? [])].map((option) => option.value).filter(Boolean)).toEqual(['25', '30', '35', '40', '45', '50', '55']);
    await choose(select('Minute'), '30');
    await click(button('Done'));

    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 9, 14, 30));
    expect(day('2026-11-09')).toBeNull();
  });

  it('moves the focus to the day chosen, or the first one that can be, on opening', async () => {
    await show();
    await click(button('Pick a date and time'));
    expect(document.activeElement).toBe(day('2026-11-09'));

    render(null, root);
    await show(new Date(2026, 10, 20, 9, 0));
    await click(button('Fri, Nov 20, 9:00 AM'));
    expect(document.activeElement).toBe(day('2026-11-20'));
  });

  it('closes on Escape, from the button that opened it too, and only the picker', async () => {
    const parent = vi.fn();
    root.addEventListener('keydown', parent);
    await show();
    const trigger = button('Pick a date and time');
    await click(trigger);

    await act(async () => {
      trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });

    expect(day('2026-11-09')).toBeNull();
    expect(parent).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes once the keyboard leaves it', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    await show();
    await click(button('Pick a date and time'));

    await act(async () => {
      button('Done')?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    });

    expect(day('2026-11-09')).toBeNull();
    outside.remove();
  });

  it('names its button after its label, each panel its own', async () => {
    await act(async () => {
      render(
        <>
          <SchedulePanel at={null} onChange={onChange} now={() => now} />
          <SchedulePanel at={null} onChange={onChange} now={() => now} />
        </>,
        root,
      );
    });
    const triggers = [...root.querySelectorAll<HTMLButtonElement>('button[aria-haspopup]')];
    const labels = triggers.map((trigger) => trigger.getAttribute('aria-labelledby')?.split(' ')[0]);

    expect(new Set(labels).size).toBe(2);
    for (const [index, label] of labels.entries()) {
      expect(root.querySelector(`[id="${label}"]`)?.textContent).toBe('Submit at');
      expect(triggers[index]?.getAttribute('aria-labelledby')?.split(' ')[1]).toBe(triggers[index]?.id);
    }
  });

  it('opens on this month when the date chosen has passed, with no way back before it', async () => {
    await show(new Date(2026, 9, 31, 23, 55));
    await click(button('Sat, Oct 31, 11:55 PM'));

    expect(root.textContent).toContain('November 2026');
    expect(button('Previous month')?.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('SchedulePanel, when the clocks move forward', () => {
  const zone = process.env.TZ;
  afterEach(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('offers no time that never happens, rather than schedule it an hour off', async () => {
    process.env.TZ = 'America/New_York';
    await act(async () => {
      render(<SchedulePanel at={null} onChange={onChange} now={() => new Date(2027, 2, 10, 9, 0)} />, root);
    });
    await click(button('Pick a date and time'));
    await click(day('2027-03-14'));

    const offered = [...(select('Hour')?.options ?? [])].map((option) => option.value).filter(Boolean);
    expect(offered).not.toContain('2');
    expect(offered).toContain('3');
  });
});

describe('ScheduleTool', () => {
  async function tool(open: boolean, canSchedule = true) {
    const toggleSchedule = vi.fn();
    await act(async () => {
      render(<ScheduleTool draft={{ canSchedule, schedule: { open, at: null }, toggleSchedule }} class="" />, root);
    });
    return toggleSchedule;
  }

  it('turns scheduling on and off, as dev-null.sh’s clock button', async () => {
    const toggle = await tool(false);
    const clock = button('Schedule');

    expect(clock?.title).toBe('Schedule for later');
    expect(clock?.getAttribute('aria-pressed')).toBe('false');
    await click(clock);
    expect(toggle).toHaveBeenCalled();

    await tool(true);
    expect(button('Schedule')?.title).toBe("Don't schedule");
    expect(button('Schedule')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('waits while the commit is being sent', async () => {
    await act(async () => {
      render(<ScheduleTool draft={{ canSchedule: true, schedule: { open: true, at: null }, toggleSchedule: vi.fn() }} disabled class="" />, root);
    });

    expect(button('Schedule')?.disabled).toBe(true);
  });

  it('is not offered where /dev/null schedules nothing', async () => {
    await tool(false, false);

    expect(button('Schedule')).toBeUndefined();
  });
});
