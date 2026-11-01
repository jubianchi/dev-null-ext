// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FollowState } from '../src/lib/follows.ts';

const ask = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/messages.ts', () => ({
  ask,
  BackgroundError: class BackgroundError extends Error {
    constructor(
      message: string,
      readonly status?: number,
    ) {
      super(message);
    }
  },
}));

const { FollowButton } = await import('../src/components/FollowButton.tsx');
const { BackgroundError } = (await import('../src/lib/messages.ts')) as unknown as {
  BackgroundError: new (message: string, status?: number) => Error;
};

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

async function show(state: FollowState) {
  await act(async () => {
    render(<FollowButton handle="A5hleyRich" state={state} size="small" />, root);
  });
}

const button = () => root.querySelector('button');
const click = async () => {
  await act(async () => button()!.click());
  await act(async () => {});
};

describe('FollowButton', () => {
  it("offers to follow on /dev/null, told apart from GitHub's own Follow by its glyph", async () => {
    await show('not-following');

    expect(button()?.textContent).toBe('Follow');
    expect(button()?.getAttribute('aria-label')).toBe('Follow @A5hleyRich on /dev/null');
    expect(button()?.querySelector('svg')).not.toBeNull();
  });

  it("follows, then offers to unfollow, as GitHub's own button does", async () => {
    ask.mockResolvedValueOnce('following');
    await show('not-following');
    await click();

    expect(ask).toHaveBeenCalledWith({ type: 'follow', handle: 'A5hleyRich', follow: true });
    expect(button()?.textContent).toBe('Unfollow');
  });

  it("offers to unfollow someone followed, as GitHub's danger button, and unfollows", async () => {
    ask.mockResolvedValueOnce('not-following');
    await show('following');

    expect(button()?.textContent).toBe('Unfollow');
    expect(button()?.getAttribute('aria-label')).toBe('Unfollow @A5hleyRich on /dev/null');
    expect(button()?.className).toContain('button-danger-fgColor-rest');
    await click();

    expect(ask).toHaveBeenCalledWith({ type: 'follow', handle: 'A5hleyRich', follow: false });
    expect(button()?.textContent).toBe('Follow');
    expect(button()?.className).not.toContain('button-danger');
  });

  it('is disabled while /dev/null answers, so a double click does not follow then unfollow', async () => {
    let answer!: (state: FollowState) => void;
    ask.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    await show('not-following');
    await act(async () => button()!.click());

    expect(button()?.disabled).toBe(true);
    await act(async () => answer('following'));
    expect(button()?.disabled).toBe(false);
  });

  it("says when someone isn't on /dev/null, from the start or once a follow tells", async () => {
    ask.mockResolvedValueOnce('absent');
    await show('not-following');
    await click();

    expect(button()?.textContent).toBe('Not on /dev/null');
    expect(button()?.disabled).toBe(true);

    await show('absent');
    expect(button()?.textContent).toBe('Not on /dev/null');
  });

  it("says when someone can't be followed, from the 403 a block gets", async () => {
    ask.mockRejectedValueOnce(new BackgroundError('This action is unauthorized.', 403));
    await show('not-following');
    await click();

    expect(button()?.textContent).toBe("Can't follow");
    expect(button()?.disabled).toBe(true);
    expect(button()?.title).toBe("You can't follow @A5hleyRich on /dev/null.");
  });

  it('keeps the button, and says why, for any other failure', async () => {
    ask.mockRejectedValueOnce(new BackgroundError('Too many requests.', 429));
    await show('not-following');
    await click();

    expect(button()?.textContent).toBe('Follow');
    expect(button()?.disabled).toBe(false);
    expect(button()?.title).toBe('Too many requests.');
  });

  it("fills its container when asked, as GitHub's Follow on a profile", async () => {
    await act(async () => {
      render(<FollowButton handle="A5hleyRich" state="not-following" size="medium" block />, root);
    });

    expect(button()?.className).toContain('w-full');
    expect(button()?.className).toContain('justify-center');
  });

  it('shows nothing on oneself', async () => {
    await show('self');

    expect(root.innerHTML).toBe('');
  });
});
