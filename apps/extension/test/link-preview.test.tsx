// @vitest-environment happy-dom
import type { LinkPreview as Preview } from '@dev-null-ext/client';
import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LinkPreview } from '../src/components/LinkPreview.tsx';

const preview: Preview = {
  url: 'https://github.com/laravel/framework/pull/1',
  title: 'Fix the queue',
  description: 'A pull request',
  image_url: 'https://opengraph.githubassets.com/abc/laravel/framework/pull/1',
  site_name: 'GitHub',
  is_pending: false,
};

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

describe('LinkPreview', () => {
  it('draws a card linking to the page, with its site, title and description', () => {
    render(<LinkPreview preview={preview} interactive />, root);

    const card = root.querySelector('a');
    expect(card?.getAttribute('href')).toBe(preview.url);
    expect(card?.getAttribute('rel')).toContain('noopener');
    expect(card?.textContent).toContain('GitHub');
    expect(card?.textContent).toContain('Fix the queue');
    expect(card?.textContent).toContain('A pull request');
  });

  it("shows the image only from a host github.com's CSP allows, the hostname when there is no site name", () => {
    render(<LinkPreview preview={preview} interactive />, root);
    expect(root.querySelector('img')?.getAttribute('src')).toBe(preview.image_url);

    render(
      <LinkPreview preview={{ ...preview, image_url: 'https://example.com/og.png', site_name: null, url: 'https://www.example.com/x' }} interactive />,
      root,
    );
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('example.com');
  });

  it('draws nothing without a title or while pending', () => {
    render(<LinkPreview preview={{ ...preview, title: null }} interactive />, root);
    expect(root.innerHTML).toBe('');

    render(<LinkPreview preview={{ ...preview, is_pending: true }} interactive />, root);
    expect(root.innerHTML).toBe('');
  });

  it('is a plain card inside a link', () => {
    render(<LinkPreview preview={preview} interactive={false} />, root);

    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).toContain('Fix the queue');
  });
});
