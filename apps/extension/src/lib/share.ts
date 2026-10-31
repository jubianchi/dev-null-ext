import type { GitHubPage } from './github/page.ts';

export const MAX_COMMIT_LENGTH = 4000;

/** /dev/null counts each link in prose as at most 23 characters (Urls). */
const LINK_LENGTH = 23;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>]+/g;
const CODE_PATTERN = /```[\s\S]*?```|`[^`\n]*`/g;

/**
 * The length /dev/null measures (CommitBodies::normalize, then Urls): line breaks normalized, and in prose only, blank
 * lines collapsed and links shortened; counted in code points.
 */
export function commitLength(body: string): number {
  const normalized = body.replace(/\r\n?/g, '\n');
  const prose = (text: string) => text.replace(/\n{3,}/g, '\n\n').replace(URL_PATTERN, (url) => 'x'.repeat(Math.min(url.length, LINK_LENGTH)));

  let measured = '';
  let last = 0;
  for (const code of normalized.matchAll(CODE_PATTERN)) {
    measured += prose(normalized.slice(last, code.index)) + code[0];
    last = code.index + code[0].length;
  }
  measured += prose(normalized.slice(last));

  return Array.from(measured.trim()).length;
}

export type SharedPage = Extract<GitHubPage, { url: string }>;

export function shareLabel(page: SharedPage): string {
  switch (page.kind) {
    case 'pull-request':
    case 'issue':
    case 'discussion':
      return `${page.owner}/${page.repository}#${page.number}`;
    case 'release':
      return `${page.owner}/${page.repository}@${page.tag}`;
    default:
      return `${page.owner}/${page.repository}`;
  }
}
