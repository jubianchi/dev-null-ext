/**
 * Sharing the page in the current tab, whatever the site. /dev/null is not a bookmark feed: a commit sharing a page
 * says something about it, so the extension asks for this many characters of the user's own words. /dev/null itself
 * takes a bare link: this is a nudge, not a rule of the server.
 */
export const MIN_OWN_LENGTH = 50;

/** A page the user can share: its URL and its title, as the browser knows them. */
export interface WebPage {
  url: string;
  title: string;
}

/**
 * Where the current tab is: on the web, on github.com (whose pages the extension shares with buttons of their own),
 * or somewhere that isn't the web (the browser's own pages, files, extensions).
 */
export type PageKind = 'web' | 'github' | 'off-web';

export function pageKind(url: string | undefined): PageKind {
  if (!url || !URL.canParse(url)) return 'off-web';
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'http:' && protocol !== 'https:') return 'off-web';
  return hostname === 'github.com' ? 'github' : 'web';
}

/** The length of what the user wrote: the text less the page's link and the quoted lines, in code points. */
export function ownLength(text: string, link: string): number {
  const own = text
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n')
    .split(link)
    .join('');

  return Array.from(own.trim()).length;
}
