/**
 * GitHub links as GitHub writes them, ported from dev-null.sh (resources/js/components/linkified-text.tsx,
 * dev-null-sh/dev-null.sh#619 and #1016): a profile or an organization, a repository, or an issue, a pull request, a
 * discussion, a commit, a comparison, a release, a file or a folder in it, nothing after them but a comment's or some
 * lines' anchor. Anything else stays a URL.
 */

/** What a link points at inside a repository: how GitHub writes it after the name, and how a screen reader reads it. */
export interface GitHubLinkItem {
  suffix: string;
  description: string;
}

export interface GitHubLinkTarget {
  owner: string;
  repository: string | null;
  item: GitHubLinkItem | null;
}

const HOST = /^(?:www\.)?github\.com$/i;
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPOSITORY = /^[A-Za-z0-9._-]{1,100}$/;
const NUMBER = /^[1-9][0-9]{0,9}$/;
const SHA = /^[0-9a-f]{7,40}$/i;
/** Two refs compared, "base...head" or "base..head", each a branch, a tag or a commit. */
const COMPARISON = /^([A-Za-z0-9_][A-Za-z0-9._/-]*?)(\.{2,3})([A-Za-z0-9_][A-Za-z0-9._/-]*)$/;
const TAG = /^[A-Za-z0-9_][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/;
const LINES = /^#L([1-9][0-9]*)(?:-L([1-9][0-9]*))?$/;

/** First path segments that are GitHub's own pages rather than an owner, like "github.com/features/actions". */
const RESERVED = new Set(
  [
    'about account apps blog codespaces collections contact copilot customer-stories dashboard education enterprise',
    'enterprises events explore features git-guides home issues join login logout marketplace mobile models new',
    'notifications orgs organizations partners premium-support pricing pulls readme resources search security',
    'settings signup site solutions sponsors stars team topics trending users watching',
  ]
    .join(' ')
    .split(' '),
);

const THREADS: Record<string, string> = { issues: 'issue', pull: 'pull request', discussions: 'discussion' };

/** The anchors GitHub gives a comment or a review in an issue, a pull request or a discussion. */
const THREAD_ANCHORS: Record<string, Array<[RegExp, string]>> = {
  issues: [[/^#issuecomment-[1-9][0-9]*$/, 'comment']],
  pull: [
    [/^#(?:issuecomment-|discussion_r)[1-9][0-9]*$/, 'comment'],
    [/^#pullrequestreview-[1-9][0-9]*$/, 'review'],
  ],
  discussions: [[/^#discussioncomment-[1-9][0-9]*$/, 'comment']],
};

/** A commit as GitHub shortens it; any other ref as it is. */
function shortRef(ref: string): string {
  return SHA.test(ref) ? ref.slice(0, 7) : ref;
}

/** An issue, a pull request or a discussion, or one of their comments or reviews: "#42", or "#42 (comment)". */
function thread(kind: string, rest: string[], hash: string): GitHubLinkItem | null {
  const name = THREADS[kind];
  const [number] = rest;
  if (name === undefined || rest.length !== 1 || number === undefined || !NUMBER.test(number)) return null;

  const reference = `${name} #${number}`;
  if (hash === '') return { suffix: `#${number}`, description: reference };

  const anchor = THREAD_ANCHORS[kind]?.find(([pattern]) => pattern.test(hash))?.[1];
  return anchor ? { suffix: `#${number} (${anchor})`, description: `${anchor} on ${reference}` } : null;
}

/**
 * A file, maybe some of its lines, or a folder, by its last name only so it stays short: "TheAlgorithm.php",
 * "TheAlgorithm.php:10-20" or "Services/". The branch or commit it was read at only stays in the URL.
 */
function file(kind: 'blob' | 'tree', path: string[], hash: string): GitHubLinkItem | null {
  let names: string[];
  try {
    names = path.map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }

  const name = names[names.length - 1];
  const full = names.join('/');

  if (kind === 'tree') return hash === '' ? { suffix: `:${name}/`, description: `folder ${full}` } : null;
  if (hash === '') return { suffix: `:${name}`, description: `file ${full}` };

  const lines = LINES.exec(hash);
  if (!lines) return null;

  const [, first, last = first] = lines;
  return last === first
    ? { suffix: `:${name}:${first}`, description: `file ${full}, line ${first}` }
    : { suffix: `:${name}:${first}-${last}`, description: `file ${full}, lines ${first} to ${last}` };
}

function item(path: string[], hash: string): GitHubLinkItem | null {
  const [first = '', ...rest] = path;
  const kind = first.toLowerCase();

  // Own keys only: a path segment like "constructor" names no thread.
  if (Object.hasOwn(THREADS, kind)) return thread(kind, rest, hash);

  // After the branch or commit, the path, every segment named.
  if ((kind === 'blob' || kind === 'tree') && rest.length >= 2 && rest.every((segment) => segment !== '')) {
    return file(kind, rest.slice(1), hash);
  }

  if (hash !== '') return null;

  const [ref = ''] = rest;
  if (kind === 'commit' && rest.length === 1 && SHA.test(ref)) {
    const commit = shortRef(ref);
    return { suffix: `@${commit}`, description: `commit ${commit}` };
  }

  const tag = rest.slice(1).join('/');
  if (kind === 'releases' && ref === 'tag' && TAG.test(tag)) return { suffix: `@${tag}`, description: `release ${tag}` };

  const comparison = kind === 'compare' ? COMPARISON.exec(rest.join('/')) : null;
  if (comparison && !(comparison[3] ?? '').includes('..')) {
    const refs = `${shortRef(comparison[1] ?? '')}${comparison[2]}${shortRef(comparison[3] ?? '')}`;
    return { suffix: `@${refs}`, description: `comparison ${refs}` };
  }

  return null;
}

export function gitHubLinkTo(href: string): GitHubLinkTarget | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (!HOST.test(url.hostname) || url.username !== '' || url.password !== '' || url.port !== '' || url.search !== '') return null;

  const segments = url.pathname.slice(1).split('/');
  // An organization's own page names it like its profile does.
  const [owner = '', repository, ...path] = segments.length === 2 && segments[0]?.toLowerCase() === 'orgs' ? segments.slice(1) : segments;

  if (!OWNER.test(owner) || RESERVED.has(owner.toLowerCase())) return null;

  if (repository === undefined) return url.hash === '' ? { owner, repository: null, item: null } : null;
  if (!REPOSITORY.test(repository)) return null;
  if (path.length === 0) return url.hash === '' ? { owner, repository, item: null } : null;

  const target = item(path, url.hash);
  return target ? { owner, repository, item: target } : null;
}
