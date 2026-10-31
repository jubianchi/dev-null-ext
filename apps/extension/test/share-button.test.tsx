// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {},
}));

const { ShareButton } = await import('../src/components/ShareButton.tsx');

const user = { id: '1', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };
const page = { kind: 'issue' as const, owner: 'laravel', repository: 'framework', number: 1, title: 'Bug', url: 'https://github.com/laravel/framework/issues/1' };

let root: HTMLElement;

beforeEach(() => {
  ask.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function mount(session: typeof user | null) {
  ask.mockImplementation(async (request: { type: string }) => (request.type === 'session' ? session : 'Organization'));
  await act(async () => {
    render(<ShareButton page={page} />, root);
  });
}

describe('ShareButton', () => {
  it('shows the Commit button when signed in', async () => {
    await mount(user);

    expect(root.querySelector('button')?.textContent).toContain('Commit');
  });

  it('shows nothing when signed out', async () => {
    await mount(null);

    expect(root.innerHTML).toBe('');
  });
});
