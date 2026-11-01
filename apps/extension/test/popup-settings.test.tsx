// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupSettings } from '../src/components/PopupSettings.tsx';
import { FEATURES, readSettings } from '../src/lib/settings.ts';

let root: HTMLElement;
const onChange = vi.fn();
const onBack = vi.fn();

beforeEach(async () => {
  onChange.mockReset();
  onBack.mockReset();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<PopupSettings settings={readSettings({ 'issue-button': false })} onChange={onChange} onBack={onBack} />, root);
  });
});

afterEach(() => {
  render(null, root);
  root.remove();
});

const toggle = (label: string) =>
  [...root.querySelectorAll<HTMLInputElement>('input[role="switch"]')].find((input) => input.closest('label')?.textContent?.includes(label))!;

describe('PopupSettings', () => {
  it('lists every feature as a switch, by group', () => {
    expect(root.querySelectorAll('input[role="switch"]')).toHaveLength(FEATURES.length);
    expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'Organizations',
      'Repositories',
      'Issues and pull requests',
      'Discussions',
      'People',
      'Composer',
    ]);
  });

  it('shows which features are on', () => {
    expect(toggle('Commit button on issues').checked).toBe(false);
    expect(toggle('Commit button on pull requests').checked).toBe(true);
  });

  it('tells assistive technologies whether each switch is on', () => {
    expect(toggle('Commit button on issues').getAttribute('aria-checked')).toBe('false');
    expect(toggle('Commit button on pull requests').getAttribute('aria-checked')).toBe('true');
  });

  it('turns a feature off and on', async () => {
    await act(async () => toggle('Commit button on pull requests').click());
    expect(onChange).toHaveBeenLastCalledWith('pull-button', false);

    await act(async () => toggle('Commit button on issues').click());
    expect(onChange).toHaveBeenLastCalledWith('issue-button', true);
  });

  it('goes back to the popup', async () => {
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click());

    expect(onBack).toHaveBeenCalled();
  });
});
