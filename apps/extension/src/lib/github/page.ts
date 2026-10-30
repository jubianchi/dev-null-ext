/**
 * What GitHub page this is, from its URL first and its metadata second. Everything that depends on GitHub's markup
 * lives here and in anchors.ts, so a GitHub redesign is fixed in one place.
 */

export type GitHubPage =
  | { kind: 'organization'; organization: string }
  | { kind: 'repository'; owner: string; repository: string; url: string }
  | { kind: 'pull-request' | 'issue'; owner: string; repository: string; number: number; title: string | null; url: string }
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

  if (!owner || RESERVED.has(owner.toLowerCase())) return { kind: 'other' };

  if (segments.length === 1) {
    const subject = document.querySelector<HTMLMetaElement>('meta[name="hovercard-subject-tag"]')?.content ?? '';
    return subject.startsWith('organization:') ? { kind: 'organization', organization: owner } : { kind: 'other' };
  }

  if (!repository) return { kind: 'other' };

  const base = `https://github.com/${owner}/${repository}`;

  if ((section === 'pull' || section === 'issues') && number && /^\d+$/.test(number)) {
    const kind = section === 'pull' ? 'pull-request' : 'issue';
    return { kind, owner, repository, number: Number(number), title: readTitle(document), url: `${base}/${section}/${number}` };
  }

  return { kind: 'repository', owner, repository, url: base };
}

/**
 * The issue or pull request title from the document title, "<title> · Pull Request #12 · owner/repo · GitHub", which
 * has been stable for years where the page markup has not.
 */
function readTitle(document: Document): string | null {
  const match = /^(.*) · (?:Pull Request|Issue) #\d+ · /.exec(document.title);
  return match?.[1]?.trim() || null;
}

export function samePage(a: GitHubPage, b: GitHubPage): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
