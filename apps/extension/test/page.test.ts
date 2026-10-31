import { describe, expect, it } from 'vitest';
import { readPage } from '../src/lib/github/page.ts';

function documentWith(subject: string | null, title = '', repository: string | null = null): Document {
  return {
    title,
    querySelector: (selector: string) => {
      if (selector === 'meta[name="hovercard-subject-tag"]' && subject) return { content: subject };
      if (selector === 'meta[name="octolytics-dimension-repository_nwo"]' && repository) return { content: repository };
      return null;
    },
  } as unknown as Document;
}

describe('readPage, discussions', () => {
  it("reads an organization's discussion, linked in the form of the repository it lives in", () => {
    expect(
      readPage(
        new URL('https://github.com/orgs/NativePHP/discussions/280'),
        documentWith('discussion:11071506', 'Proposal: Public Tab · NativePHP · Discussion #280', 'NativePHP/discussions'),
      ),
    ).toEqual({
      kind: 'discussion',
      owner: 'NativePHP',
      repository: 'discussions',
      number: 280,
      title: 'Proposal: Public Tab',
      url: 'https://github.com/NativePHP/discussions/discussions/280',
    });
  });

  it("reads a repository's discussion", () => {
    expect(
      readPage(
        new URL('https://github.com/laravel/framework/discussions/42#discussioncomment-1'),
        documentWith('discussion:1', 'Queues · laravel/framework · Discussion #42'),
      ),
    ).toEqual({
      kind: 'discussion',
      owner: 'laravel',
      repository: 'framework',
      number: 42,
      title: 'Queues',
      url: 'https://github.com/laravel/framework/discussions/42',
    });
  });

  it("keeps an organization's discussions list an organization page", () => {
    expect(readPage(new URL('https://github.com/orgs/NativePHP/discussions'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'NativePHP',
    });
  });
});

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
