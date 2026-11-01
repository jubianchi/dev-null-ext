// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupSignIn } from '../src/components/PopupSignIn.tsx';
import type { SignInState } from '../src/lib/messages.ts';

type Step = Exclude<SignInState, { status: 'idle' }>;

let root: HTMLElement;
const onCancel = vi.fn();
const onRetry = vi.fn();
const onAllow = vi.fn();

beforeEach(() => {
  for (const callback of [onCancel, onRetry, onAllow]) callback.mockReset();
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(state: Step) {
  await act(async () => {
    render(<PopupSignIn state={state} server="dev-null.sh" onCancel={onCancel} onRetry={onRetry} onAllow={onAllow} />, root);
  });
}

const footerButtons = () => [...root.querySelectorAll('footer a, footer button')].map((element) => element.textContent);

function click(label: string) {
  const button = [...root.querySelectorAll<HTMLButtonElement>('footer button')].find((element) => element.textContent?.includes(label));
  button?.click();
}

describe('PopupSignIn', () => {
  it('shows the code to approve, waiting for the approval, with the page to open again and a way out', async () => {
    await show({ status: 'waiting', flow: 'device-grant', userCode: 'WDJB-MJHT', verificationUri: 'https://dev-null.sh/device' });

    expect(root.querySelector('h1')?.textContent).toBe('Approve this browser');
    expect(root.querySelector('[data-user-code]')?.textContent).toBe('WDJB-MJHT');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Waiting for your approval');
    expect(footerButtons()).toEqual(['Open the page again', 'Cancel']);
    expect(root.querySelector<HTMLAnchorElement>('footer a')?.href).toBe('https://dev-null.sh/device');

    click('Cancel');
    expect(onCancel).toHaveBeenCalled();
  });

  it('waits for the approval without a code when the server redirects', async () => {
    await show({ status: 'waiting', flow: 'loopback' });

    expect(root.querySelector('h1')?.textContent).toBe('Approve this browser');
    expect(root.querySelector('[data-user-code]')).toBeNull();
    expect(root.querySelector('[role="status"]')).not.toBeNull();
    expect(footerButtons()).toEqual(['Cancel']);
  });

  it('asks for the permission the redirect needs, saying why', async () => {
    await show({ status: 'needs-permission' });

    expect(root.querySelector('h1')?.textContent).toBe('One more permission');
    expect(root.textContent).toContain('It only looks for its own redirect.');
    expect(footerButtons()).toEqual(['Allow and continue', 'Cancel']);

    click('Allow and continue');
    expect(onAllow).toHaveBeenCalled();
  });

  it('says why it could not connect, and tries again with GitHub', async () => {
    await show({ status: 'failed', message: 'The code expired.' });

    expect(root.querySelector('h1')?.textContent).toBe("Couldn't connect");
    expect(root.querySelector('.text-red-700')?.textContent).toBe('The code expired.');
    expect(footerButtons()).toEqual(['Try again with GitHub', 'Cancel']);

    click('Try again');
    expect(onRetry).toHaveBeenCalled();
  });
});
