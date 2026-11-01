// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PollEditor } from '../src/components/PollEditor.tsx';
import { type DraftPoll, newPoll, pollReady } from '../src/lib/polls.ts';

let root: HTMLElement;
const onChange = vi.fn();
const onRemove = vi.fn();

beforeEach(() => {
  onChange.mockReset();
  onRemove.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(poll: DraftPoll) {
  await act(async () => {
    render(<PollEditor poll={poll} onChange={onChange} onRemove={onRemove} />, root);
  });
}

const fields = () => [...root.querySelectorAll<HTMLTextAreaElement>('textarea')];
const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => candidate.textContent?.includes(label));

function type(field: HTMLTextAreaElement | undefined, value: string) {
  if (!field) throw new Error('No such field');
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('newPoll and pollReady', () => {
  it('starts with two empty options for a day, as dev-null.sh does, and is ready once every option is filled', () => {
    expect(newPoll()).toEqual({ options: ['', ''], duration: 1440 });
    expect(pollReady(newPoll())).toBe(false);
    expect(pollReady({ options: ['Tabs', ' '], duration: 60 })).toBe(false);
    expect(pollReady({ options: ['Tabs', 'Spaces'], duration: 60 })).toBe(true);
  });
});

describe('PollEditor', () => {
  it('edits its options, 50 characters at most, on one line', async () => {
    await show(newPoll());

    expect(fields().map((field) => field.placeholder)).toEqual(['Option 1', 'Option 2']);
    expect(fields()[0]?.maxLength).toBe(50);

    type(fields()[1], 'Spa\nces');
    expect(onChange).toHaveBeenCalledWith({ options: ['', 'Spa ces'], duration: 1440 });
  });

  it('adds options up to 4, and removes only the third and fourth', async () => {
    await show(newPoll());
    expect(root.querySelector('[aria-label^="Remove option"]')).toBeNull();

    button('Add option')?.click();
    expect(onChange).toHaveBeenCalledWith({ options: ['', '', ''], duration: 1440 });

    await show({ options: ['a', 'b', 'c', 'd'], duration: 1440 });
    expect(button('Add option')).toBeUndefined();
    expect([...root.querySelectorAll('[aria-label^="Remove option"]')].map((remove) => remove.getAttribute('aria-label'))).toEqual([
      'Remove option 3',
      'Remove option 4',
    ]);

    root.querySelector<HTMLButtonElement>('[aria-label="Remove option 3"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({ options: ['a', 'b', 'd'], duration: 1440 });
  });

  it('lasts 1 hour, 1, 3 or 7 days', async () => {
    await show(newPoll());
    const select = root.querySelector('select');

    expect([...(select?.options ?? [])].map((option) => option.textContent)).toEqual(['1 hour', '1 day', '3 days', '7 days']);
    expect(select?.value).toBe('1440');

    if (select) select.value = '10080';
    select?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ options: ['', ''], duration: 10080 });
  });

  it('removes the poll', async () => {
    await show(newPoll());

    button('Remove poll')?.click();
    expect(onRemove).toHaveBeenCalled();
  });
});
