/**
 * What GitHub page this is, from its URL first and its metadata second. Everything that depends on GitHub's markup
 * lives here and in anchors.ts, so a GitHub redesign is fixed in one place.
 */

export type GitHubPage =
  /** `discussions` on the organization's discussions list, whose sidebar shows what /dev/null says of the organization. */
  | { kind: 'organization'; organization: string; discussions?: true }
  | { kind: 'repository'; owner: string; repository: string; url: string }
  /** A repository's releases, a list or one: nothing to share as a whole, each release on its own. */
  | { kind: 'releases'; owner: string; repository: string }
  /** One release, shared from its card on a releases page. */
  | { kind: 'release'; owner: string; repository: string; tag: string; url: string }
  | {
      kind: 'pull-request' | 'issue' | 'discussion';
      owner: string;
      repository: string;
      number: number;
      title: string | null;
      url: string;
      /** Who opened it, read once the page is rendered (readAuthor). */
      author?: string | null;
    }
  | { kind: 'other' };

/** First path segments that are GitHub's own pages, never an owner. */
const RESERVED = new Set([
  'about', 'account', 'apps', 'codespaces', 'collections', 'contact', 'copilot', 'dashboard', 'enterprise', 'events',
  'explore', 'features', 'issues', 'login', 'logout', 'marketplace', 'new', 'notifications', 'organizations', 'orgs',
  'pricing', 'pulls', 'search', 'security', 'settings', 'signup', 'site', 'sponsors', 'stars', 'team', 'topics',
  'trending', 'users',
]);

export function readPage(location: Location | URL, document: Document): GitHubPage {
  const segments = location.pathname.split('/').filter(Boolean);
  const [owner, repository, section, number] = segments;

  if (owner === 'orgs' && repository) {
    const discussion = section === 'discussions' && number && /^\d+$/.test(number) ? organizationDiscussion(repository, Number(number), document) : null;
    if (discussion) return discussion;
    return section === 'discussions' ? { kind: 'organization', organization: repository, discussions: true } : { kind: 'organization', organization: repository };
  }
  if (!owner || RESERVED.has(owner.toLowerCase())) return { kind: 'other' };

  if (segments.length === 1) {
    const subject = document.querySelector<HTMLMetaElement>('meta[name="hovercard-subject-tag"]')?.content ?? '';
    return subject.startsWith('organization:') ? { kind: 'organization', organization: owner } : { kind: 'other' };
  }

  if (!repository) return { kind: 'other' };

  const base = `https://github.com/${owner}/${repository}`;

  if (section === 'releases') return { kind: 'releases', owner, repository };

  if ((section === 'pull' || section === 'issues' || section === 'discussions') && number && /^\d+$/.test(number)) {
    const kind = section === 'pull' ? 'pull-request' : section === 'issues' ? 'issue' : 'discussion';
    return { kind, owner, repository, number: Number(number), title: readTitle(document), url: `${base}/${section}/${number}` };
  }

  return { kind: 'repository', owner, repository, url: base };
}

/**
 * An organization's discussion. It lives in one of the organization's repositories, which the page names
 * (octolytics' repository_nwo): it is linked in that repository's form, github.com/owner/repo/discussions/12, which
 * GitHub redirects to the organization's page, and which /dev/null and the extension show as owner/repo#12.
 */
function organizationDiscussion(organization: string, number: number, document: Document): GitHubPage | null {
  const nwo = document.querySelector<HTMLMetaElement>('meta[name="octolytics-dimension-repository_nwo"]')?.content ?? '';
  const [owner, repository] = nwo.split('/');
  if (!owner || !repository || owner.toLowerCase() !== organization.toLowerCase()) return null;

  return {
    kind: 'discussion',
    owner,
    repository,
    number,
    title: readTitle(document),
    url: `https://github.com/${owner}/${repository}/discussions/${number}`,
  };
}

/**
 * The issue, pull request or discussion title from the document title, "<title> · Pull Request #12 · owner/repo ·
 * GitHub" or "<title> · owner · Discussion #12", which has been stable for years where the page markup has not.
 */
function readTitle(document: Document): string | null {
  const pull = PULL_REQUEST_TITLE.exec(document.title);
  if (pull) return pull[1]?.trim() || null;

  const match = /^(.*?) · (?:(?:Pull Request|Issue) #\d+ · |.* · Discussion #\d+)/.exec(document.title);
  return match?.[1]?.trim() || null;
}

/** A GitHub login, a bot's included ("dependabot[bot]"). */
const LOGIN = '[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\[bot\\])?';

/** A pull request's document title names its author: "<title> by <login> · Pull Request #12 · owner/repo · GitHub". */
const PULL_REQUEST_TITLE = new RegExp(`^(.*) by (${LOGIN}) · Pull Request #\\d+ · `);

/**
 * Who opened an issue or a pull request: a pull request's document title names them; an issue's body header links
 * them. Read when it is needed, once GitHub has rendered the page.
 */
export function readAuthor(page: GitHubPage, document: Document): string | null {
  if (page.kind === 'pull-request') return PULL_REQUEST_TITLE.exec(document.title)?.[2] ?? null;
  if (page.kind === 'issue') return document.querySelector('[data-testid="issue-body-header-author"]')?.textContent?.trim() || null;
  return null;
}

export function samePage(a: GitHubPage, b: GitHubPage): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
