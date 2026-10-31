// @vitest-environment happy-dom
import type { BodyMention, BodySegment } from '@devnull-github/client';
import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommitBody } from '../src/components/CommitBody.tsx';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

function show(segments: BodySegment[], mentions: BodyMention[] = []) {
  render(<CommitBody segments={segments} mentions={mentions} />, root);
}

describe('CommitBody', () => {
  it('keeps the line breaks of prose and makes its links clickable', () => {
    show([{ type: 'text', text: 'Shipped\nsee https://www.example.com/changelog' }]);

    const link = root.querySelector('a');
    expect(root.querySelector('[data-commit-body]')?.className).toContain('whitespace-pre-wrap');
    expect(link?.getAttribute('href')).toBe('https://www.example.com/changelog');
    expect(link?.textContent).toBe('example.com/changelog');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('leaves the punctuation that ends a sentence out of a link, but not the brackets the URL opened', () => {
    show([{ type: 'text', text: 'see https://example.com/a. Or (https://example.com/b), https://en.wikipedia.org/wiki/Foo_(bar)!' }]);

    expect([...root.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      'https://example.com/a',
      'https://example.com/b',
      'https://en.wikipedia.org/wiki/Foo_(bar)',
    ]);
    expect(root.textContent).toBe('see example.com/a. Or (example.com/b), en.wikipedia.org/wiki/Foo_(bar)!');
  });

  it('shows a GitHub link as GitHub writes it, keeping the whole URL in the text to copy', () => {
    const url = 'https://github.com/dev-null-sh/dev-null.sh/pull/585';
    show([{ type: 'text', text: `see ${url}.` }]);

    const link = root.querySelector('a')!;
    const label = link.querySelector('[aria-hidden="true"]');
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('title')).toBe(url);
    expect(link.getAttribute('aria-label')).toBe('dev-null-sh/dev-null.sh pull request #585 on GitHub');
    expect(label?.textContent).toBe('dev-null-sh/dev-null.sh#585');
    expect(label?.querySelector('svg.octicon-mark-github')).not.toBeNull();
    expect(link.textContent).toBe(`${url}dev-null-sh/dev-null.sh#585`);
    expect(root.textContent).toBe(`see ${url}dev-null-sh/dev-null.sh#585.`);
  });

  it('draws a GitHub link without making it clickable inside a link', () => {
    render(
      <CommitBody segments={[{ type: 'text', text: 'https://github.com/laravel/framework' }]} mentions={[]} interactive={false} />,
      root,
    );

    expect(root.querySelector('a')).toBeNull();
    expect(root.querySelector('[title="https://github.com/laravel/framework"]')?.textContent).toContain('laravel/framework');
  });

  it('links the mentions /dev/null found to their profile', () => {
    show([{ type: 'text', text: 'Thanks @Laravel and @nobody@example' }], [{ handle: 'Laravel', offset: 7, length: 8, kind: 'organization' }]);

    const links = [...root.querySelectorAll('a')];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([['@Laravel', 'https://dev-null.sh/@Laravel']]);
  });

  it('draws /dev/null as its wordmark, the second slash hollow', () => {
    show([{ type: 'text', text: '/dev/null rocks (/dev/null), "/dev/null"!' }]);

    const wordmarks = [...root.querySelectorAll('[title="/dev/null"]')];
    expect(wordmarks).toHaveLength(3);
    expect(wordmarks[0]?.textContent).toBe('/dev/null');
    expect(wordmarks[0]?.className).toContain('font-semibold');
    expect(wordmarks[0]?.querySelector('.text-transparent')?.textContent).toBe('/');
    expect(root.textContent).toBe('/dev/null rocks (/dev/null), "/dev/null"!');
  });

  it('leaves /dev/null alone inside other words, paths, mentions, links and code', () => {
    show([
      { type: 'text', text: 'x/dev/null ./dev/null //dev/null /dev/nullify /dev/null2 /dev/null/x /dev/null-x /DEV/NULL https://example.com/dev/null ' },
      { type: 'code', code: '/dev/null' },
    ]);

    expect(root.querySelector('[title="/dev/null"]')).toBeNull();
  });

  it('shows inline code as code', () => {
    show([
      { type: 'text', text: 'Run ' },
      { type: 'code', code: 'npm i https://example.com' },
    ]);

    expect(root.querySelector('code')?.textContent).toBe('npm i https://example.com');
    expect(root.querySelector('a')).toBeNull();
  });

  it('shows code blocks with their name and highlighting, and nothing else from the HTML', () => {
    show([
      {
        type: 'block',
        language: 'php',
        filename: null,
        html: '<span class="hl-keyword">echo</span> 1;<script>alert(1)</script><img src=x onerror=alert(1)><span class="evil" onclick="x()">2</span>',
      },
    ]);

    const pre = root.querySelector('pre');
    expect(root.textContent).toContain('php');
    expect(pre?.querySelector('.hl-keyword')?.textContent).toBe('echo');
    expect(pre?.querySelector('script, img, [onclick], .evil')).toBeNull();
    expect(pre?.textContent).toBe('echo 1;2');
  });

  it('turns lines starting with > into a quote', () => {
    show([{ type: 'text', text: '> Ship it\n> today\nDone' }]);

    expect(root.querySelector('blockquote')?.textContent).toBe('Ship it\ntoday');
    expect(root.textContent).toContain('Done');
  });
});
