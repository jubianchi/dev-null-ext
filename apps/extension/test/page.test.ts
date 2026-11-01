import { describe, expect, it } from 'vitest';
import { readAuthor, readPage } from '../src/lib/github/page.ts';

function documentWith(subject: string | null, title = '', repository: string | null = null, username: string | null = null): Document {
  return {
    title,
    querySelector: (selector: string) => {
      if (selector === 'meta[name="hovercard-subject-tag"]' && subject) return { content: subject };
      if (selector === 'meta[property="profile:username"]' && username) return { content: username };
      if (selector === 'meta[name="octolytics-dimension-repository_nwo"]' && repository) return { content: repository };
      return null;
    },
  } as unknown as Document;
}

describe('readAuthor', () => {
  const pull = { kind: 'pull-request' as const, owner: 'dev-null-sh', repository: 'dev-null.sh', number: 1016, title: null, url: '' };

  it("reads a pull request's author from the document title", () => {
    expect(readAuthor(pull, documentWith(null, 'feat: links by jubianchi · Pull Request #1016 · dev-null-sh/dev-null.sh · GitHub'))).toBe('jubianchi');
    expect(readAuthor(pull, documentWith(null, 'Bump deps by dependabot[bot] · Pull Request #1 · a/b · GitHub'))).toBe('dependabot[bot]');
  });

  it("reads an issue's author from its body's header", () => {
    const issue = { ...pull, kind: 'issue' as const };
    const document = {
      title: 'Idea · Issue #1335 · dev-null-sh/dev-null.sh · GitHub',
      querySelector: (selector: string) => (selector === '[data-testid="issue-body-header-author"]' ? { textContent: ' tomasnorre ' } : null),
    } as unknown as Document;

    expect(readAuthor(issue, document)).toBe('tomasnorre');
  });

  it('reads no author it cannot find', () => {
    expect(readAuthor(pull, documentWith(null, 'Fix · Pull Request #1 · a/b · GitHub'))).toBeNull();
  });
});

describe('readPage, releases', () => {
  it("reads a repository's releases, a list or one, where each release is shared on its own", () => {
    for (const path of ['releases', 'releases/tag/v5.32.0', 'releases?page=2']) {
      expect(readPage(new URL(`https://github.com/laravel/installer/${path}`), documentWith('repository:1'))).toEqual({
        kind: 'releases',
        owner: 'laravel',
        repository: 'installer',
      });
    }
  });
});

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

  it("keeps an organization's people an organization page, saying it lists its people", () => {
    expect(readPage(new URL('https://github.com/orgs/laravel/people'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'laravel',
      people: true,
    });
  });

  it("keeps an organization's discussions list an organization page, saying it is its discussions", () => {
    expect(readPage(new URL('https://github.com/orgs/NativePHP/discussions'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'NativePHP',
      discussions: true,
    });
    expect(readPage(new URL('https://github.com/orgs/NativePHP/discussions/categories/ideas'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'NativePHP',
      discussions: true,
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

  it("knows a user's profile from its profile:username, with their login as GitHub writes it", () => {
    expect(readPage(new URL('https://github.com/a5hleyrich'), documentWith(null, '', null, 'A5hleyRich'))).toEqual({
      kind: 'profile',
      login: 'A5hleyRich',
    });
    expect(readPage(new URL('https://github.com/A5hleyRich?tab=repositories'), documentWith(null, '', null, 'A5hleyRich'))).toEqual({
      kind: 'profile',
      login: 'A5hleyRich',
    });
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

    expect(
      readPage(
        new URL('https://github.com/dev-null-sh/dev-null.sh/issues/938'),
        documentWith(null, '[RFC] Orgs · Issue #938 · dev-null-sh/dev-null.sh · GitHub'),
      ),
    ).toMatchObject({
      kind: 'issue',
      number: 938,
      title: '[RFC] Orgs',
    });
  });

  it("reads a pull request's title without its author, which the document title adds", () => {
    expect(
      readPage(
        new URL('https://github.com/dev-null-sh/dev-null.sh/pull/1016'),
        documentWith(null, 'feat: show links by GitHub by jubianchi · Pull Request #1016 · dev-null-sh/dev-null.sh · GitHub'),
      ),
    ).toMatchObject({ kind: 'pull-request', title: 'feat: show links by GitHub' });
  });

  it("knows an organization's other tabs from their /orgs URL", () => {
    for (const tab of ['repositories', 'projects', 'packages', 'sponsoring']) {
      expect(readPage(new URL(`https://github.com/orgs/dev-null-sh/${tab}`), documentWith(null))).toEqual({
        kind: 'organization',
        organization: 'dev-null-sh',
      });
    }
    expect(readPage(new URL('https://github.com/orgs/NativePHP/discussions?discussions_q=is%3Aopen'), documentWith(null))).toEqual({
      kind: 'organization',
      organization: 'NativePHP',
      discussions: true,
    });
  });

  it("leaves GitHub's own pages alone", () => {
    expect(readPage(new URL('https://github.com/settings/profile'), documentWith(null))).toEqual({ kind: 'other' });
    expect(readPage(new URL('https://github.com/orgs'), documentWith(null))).toEqual({ kind: 'other' });
  });
});
