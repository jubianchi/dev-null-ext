// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Avatar, initials } from '../src/components/Avatar.tsx';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

async function show(person: { handle: string; name?: string | null; avatar_url?: string | null }) {
  await act(async () => {
    render(<Avatar person={person} size={32} />, root);
  });
}

describe('initials', () => {
  it("takes the first letters of the name's first two words, as dev-null.sh does", () => {
    expect(initials({ handle: 'local-dev', name: 'Local Developer' })).toBe('LD');
    expect(initials({ handle: 'darwin37', name: 'Dr. Lisette Halvorson' })).toBe('DL');
    expect(initials({ handle: 'taylorotwell', name: 'taylor' })).toBe('T');
  });

  it('falls back on the handle without a name', () => {
    expect(initials({ handle: 'jubianchi', name: null })).toBe('J');
    expect(initials({ handle: 'jubianchi', name: '  ' })).toBe('J');
    expect(initials({ handle: 'jubianchi' })).toBe('J');
  });
});

describe('Avatar', () => {
  it('shows the picture when there is one', async () => {
    await show({ handle: 'jubianchi', avatar_url: 'https://avatars.githubusercontent.com/u/1' });

    const image = root.querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://avatars.githubusercontent.com/u/1');
    expect(image?.getAttribute('width')).toBe('32');
  });

  it('shows the initials without a picture, rather than a broken image', async () => {
    await show({ handle: 'local-dev', name: 'Local Developer', avatar_url: null });

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toBe('LD');
    expect(root.querySelector('[data-avatar]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names the person when nothing beside it does, picture or initials', async () => {
    await act(async () => {
      render(<Avatar person={{ handle: 'jubianchi', avatar_url: 'https://avatars.githubusercontent.com/u/1' }} size={40} alt="@jubianchi" />, root);
    });
    expect(root.querySelector('img')?.getAttribute('alt')).toBe('@jubianchi');

    await act(async () => {
      render(<Avatar person={{ handle: 'jubianchi', avatar_url: null }} size={40} alt="@jubianchi" />, root);
    });
    const initials = root.querySelector('[data-avatar]');
    expect(initials?.getAttribute('role')).toBe('img');
    expect(initials?.getAttribute('aria-label')).toBe('@jubianchi');
    expect(initials?.hasAttribute('aria-hidden')).toBe(false);
  });

  it("shows the initials when the picture doesn't load", async () => {
    await show({ handle: 'jubianchi', avatar_url: 'http://192.168.1.176:8000/avatar.png' });

    await act(async () => {
      root.querySelector('img')!.dispatchEvent(new Event('error'));
    });

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toBe('J');
  });
});
