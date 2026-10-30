import type { GitHubPage } from './github/page.ts';

export const MAX_COMMIT_LENGTH = 4000;

/** /dev/null counts each link as at most 23 characters, as it measures commits (CommitBodies). */
const LINK_LENGTH = 23;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>]+/g;

export function commitLength(body: string): number {
  const collapsed = body.replace(/\n{3,}/g, '\n\n').trim();
  return collapsed.replace(URL_PATTERN, (url) => 'x'.repeat(Math.min(url.length, LINK_LENGTH))).length;
}

export type SharedPage = Extract<GitHubPage, { url: string }>;

/**
 * The body of a commit sharing a GitHub page: what the user wrote, the link (which /dev/null shows as owner/repo#123
 * with a card), and the organization as a bare @mention, which is what files the commit under the organization's
 * page on /dev/null. `@org/repo` is not a mention there, on purpose.
 */
export function shareBody(text: string, page: SharedPage, organization: string | null): string {
  return [text.trim(), [page.url, organization ? `@${organization}` : null].filter(Boolean).join('\n')]
    .filter(Boolean)
    .join('\n\n');
}

export function shareLabel(page: SharedPage): string {
  switch (page.kind) {
    case 'pull-request':
      return `${page.owner}/${page.repository}#${page.number}`;
    case 'issue':
      return `${page.owner}/${page.repository}#${page.number}`;
    default:
      return `${page.owner}/${page.repository}`;
  }
}
