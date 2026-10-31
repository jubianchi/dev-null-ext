// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { InlineComposer } = await import('../src/components/InlineComposer.tsx');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const committed = { id: 'c1', short_hash: 'abc1234', body: 'Shipped\n\n@laravel', status: 'approved', html_url: 'https://dev-null.sh/c1' };

let root: HTMLElement;
const onCommitted = vi.fn();

beforeEach(async () => {
  ask.mockReset();
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? user : committed));
  onCommitted.mockReset();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<InlineComposer organization="laravel" onCommitted={onCommitted} />, root);
  });
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function type(text: string) {
  const textarea = root.querySelector('textarea')!;
  await act(async () => {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const tab = (name: string) => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((element) => element.textContent === name)!;

describe('InlineComposer', () => {
  it("has GitHub's Write and Preview tabs, Write first", () => {
    expect([...root.querySelectorAll('[role="tab"]')].map((element) => element.textContent)).toEqual(['Write', 'Preview']);
    expect(tab('Write').getAttribute('aria-selected')).toBe('true');
  });

  it('previews the draft in the Preview tab', async () => {
    await type('Shipped');
    await act(async () => tab('Preview').click());

    expect(tab('Preview').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('textarea')).toBeNull();
    expect(root.querySelector('[role="tabpanel"]')?.textContent).toContain('Shipped');
  });

  it("counts the commit's characters against /dev/null's limit", async () => {
    await type('Shipped 🚀');

    expect(root.textContent).toContain('19 / 4000');
  });

  it("says what /dev/null's commits support", () => {
    expect(root.textContent).toContain('Links, @mentions, :emoji: and `code` are supported');
  });

  it('commits, hands the commit to the log and clears the draft for the next one', async () => {
    await type('Shipped');
    await act(async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(ask).toHaveBeenLastCalledWith({ type: 'commit', body: 'Shipped\n\n@laravel' });
    expect(onCommitted).toHaveBeenCalledWith(committed);
    expect(root.querySelector('textarea')?.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toBe('Commit');
  });
});
