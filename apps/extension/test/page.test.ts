import { describe, expect, it } from 'vitest';
import { readPage } from '../src/lib/github/page.ts';

function documentWith(subject: string | null, title = ''): Document {
  return {
    title,
    querySelector: (selector: string) =>
      selector === 'meta[name="hovercard-subject-tag"]' && subject ? { content: subject } : null,
  } as unknown as Document;
}

describe('readPage', () => {
  it('knows an organization page from its hovercard subject', () => {
    expect(readPage(new URL('https://github.com/laravel'), documentWith('organization:958072'))).toEqual({
      kind: 'organization',
      organization: 'laravel',
    });
    expect(readPage(new URL('https://github.com/jubianchi'), documentWith('user:327237'))).toEqual({ kind: 'other' });
  });

  it('reads repositories, pull requests and issues from the URL', () => {
    expect(readPage(new URL('https://github.com/laravel/framework/tree/12.x'), documentWith('repository:1'))).toEqual({
      kind: 'repository',
      owner: 'laravel',
      repository: 'framework',
      url: 'https://github.com/laravel/framework',
    });

    expect(
      readPage(
        new URL('https://github.com/laravel/framework/pull/58112/files'),
        documentWith(null, 'Fix the queue · Pull Request #58112 · laravel/framework · GitHub'),
      ),
    ).toEqual({
      kind: 'pull-request',
      owner: 'laravel',
      repository: 'framework',
      number: 58112,
      title: 'Fix the queue',
      url: 'https://github.com/laravel/framework/pull/58112',
    });

    expect(readPage(new URL('https://github.com/dev-null-sh/dev-null.sh/issues/938'), documentWith(null, '[RFC] Orgs · Issue #938 · dev-null-sh/dev-null.sh · GitHub'))).toMatchObject({
      kind: 'issue',
      number: 938,
      title: '[RFC] Orgs',
    });
  });

  it("knows an organization's other tabs from their /orgs URL", () => {
    for (const tab of ['repositories', 'projects', 'packages', 'people', 'sponsoring', 'discussions']) {
      expect(readPage(new URL(`https://github.com/orgs/dev-null-sh/${tab}`), documentWith(null))).toEqual({
        kind: 'organization',
        organization: 'dev-null-sh',
      });
    }
    expect(readPage(new URL('https://github.com/orgs/NativePHP/discussions?discussions_q=is%3Aopen'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'NativePHP',
    });
  });

  it("leaves GitHub's own pages alone", () => {
    expect(readPage(new URL('https://github.com/settings/profile'), documentWith(null))).toEqual({ kind: 'other' });
    expect(readPage(new URL('https://github.com/orgs'), documentWith(null))).toEqual({ kind: 'other' });
  });
});
