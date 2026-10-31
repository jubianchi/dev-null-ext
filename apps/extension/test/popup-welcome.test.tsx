// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupWelcome } from '../src/components/PopupWelcome.tsx';

let root: HTMLElement;
const onJoin = vi.fn();

beforeEach(() => {
  onJoin.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(developers: number | null) {
  await act(async () => {
    render(<PopupWelcome developers={developers} onJoin={onJoin} />, root);
  });
}

describe('PopupWelcome', () => {
  it('tells how many developers are on /dev/null, as dev-null.sh tells its guests', async () => {
    await show(12000);

    expect(root.querySelector('h1')?.textContent).toBe('Join 12,000+ developers.');
    expect(root.textContent).toContain('12,000+ developers are already here.');
  });

  it('says only developers post there, without a count', async () => {
    await show(null);

    expect(root.querySelector('h1')?.textContent).toBe('Only developers post here.');
    expect(root.textContent).not.toContain('+ developers');
  });

  it('says what the extension does on GitHub', async () => {
    await show(null);

    expect(root.querySelectorAll('li')).toHaveLength(3);
  });

  it('joins with GitHub, which connects an existing account too', async () => {
    await show(null);
    const join = [...root.querySelectorAll('button')].find((button) => button.textContent?.includes('Join with GitHub'));
    await act(async () => join!.click());

    expect(onJoin).toHaveBeenCalled();
    expect(root.textContent).toContain('Already on /dev/null? The same button connects this browser');
  });
});
