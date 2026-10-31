// @vitest-environment happy-dom
import type { CurrentUser } from '@devnull-github/client';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupProfile } from '../src/components/PopupProfile.tsx';

const user: CurrentUser = {
  id: '1',
  handle: 'jubianchi',
  name: 'Julien Bianchi',
  avatar_url: 'https://avatars.githubusercontent.com/u/327237',
  bio: null,
  github_url: 'https://github.com/jubianchi',
  html_url: 'https://dev-null.sh/@jubianchi',
  terms_accepted: true,
};

let root: HTMLElement;
const onDisconnect = vi.fn();

beforeEach(() => {
  onDisconnect.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(props: Partial<Parameters<typeof PopupProfile>[0]> = {}) {
  await act(async () => {
    render(<PopupProfile user={user} onDisconnect={onDisconnect} {...props} />, root);
  });
}

describe('PopupProfile', () => {
  it("shows the user's card, as dev-null.sh's profile card", async () => {
    await show();

    expect(root.querySelector('img')?.getAttribute('src')).toBe(user.avatar_url);
    expect(root.textContent).toContain('Julien Bianchi');
    expect(root.textContent).toContain('@jubianchi');
    expect(root.querySelector<HTMLAnchorElement>('a[href="https://dev-null.sh/@jubianchi"]')?.textContent).toBe('Open my profile');
  });

  it('shows the counts /dev/null sends, and none it does not', async () => {
    await show({ user: { ...user, commits_count: 228, following_count: 27, followers_count: 57 } as CurrentUser });
    expect(root.textContent).toContain('228 commits');
    expect(root.textContent).toContain('57 followers');

    await show();
    expect(root.textContent).not.toContain('commits');
  });

  it("rings the avatar in the user's lane, a palette index or a custom colour", async () => {
    await show({ user: { ...user, lane: 2 } });
    expect(root.querySelector<HTMLElement>('[data-lane-ring]')?.style.borderColor).toBe('var(--color-lane-2)');

    render(null, root);
    await show({ user: { ...user, lane: '#ff00aa' } });
    expect(root.querySelector<HTMLElement>('[data-lane-ring]')?.style.borderColor).toBe('#ff00aa');
  });

  it('disconnects', async () => {
    await show();
    await act(async () => [...root.querySelectorAll('button')].find((button) => button.textContent === 'Disconnect')!.click());

    expect(onDisconnect).toHaveBeenCalled();
  });
});
