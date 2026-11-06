import type { PageMeta } from './page-meta.ts';

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
  /** Its card, once read from the page; a page that can't be read has none. */
  meta?: PageMeta;
  /** The text the user selected on it, quoted when the composer opens. */
  selection?: string;
}

/** The selection as a Markdown quote, each line of it quoted, followed by the blank line that ends the quote. */
export function quoteOf(selection: string): string {
  const lines = selection
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line.trim()}`.trimEnd());

  return `${lines.join('\n')}\n\n`;
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

const TRACKING = new Set(['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'mc_eid', 'mc_cid', 'igshid', 'yclid', 'twclid', '_hsenc', '_hsmi']);

const isTracking = (name: string) => name.startsWith('utm_') || TRACKING.has(name);

const parameterName = (pair: string) => {
  const name = pair.split('=')[0] ?? '';
  try {
    return decodeURIComponent(name).toLowerCase();
  } catch {
    return name.toLowerCase();
  }
};

/**
 * The URL without its tracking parameters (`utm_*`, `fbclid`, `gclid`…), the others kept as written and in their
 * order, and the fragment kept: it often points at the section that matters.
 */
export function cleanUrl(url: string): string {
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  const queryAt = beforeHash.indexOf('?');
  if (queryAt === -1) return url;

  const pairs = beforeHash.slice(queryAt + 1).split('&');
  const kept = pairs.filter((pair) => pair !== '' && !isTracking(parameterName(pair)));
  if (kept.length === pairs.length) return url;

  return `${beforeHash.slice(0, queryAt)}${kept.length > 0 ? `?${kept.join('&')}` : ''}${hash}`;
}

const SECRETS = new Set(['token', 'auth', 'key', 'apikey', 'code', 'secret', 'password', 'passwd', 'session', 'sig', 'signature']);

const isSecret = (name: string) => SECRETS.has(name) || /_(token|key|secret|password)$/.test(name);

function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]') return true;
  if (/\.(local|internal|lan|localhost|home\.arpa)$/.test(host)) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) {
    const [first, second] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || (first === 169 && second === 254)
    );
  }

  // A single label, as an intranet's: no public host is reached that way.
  return !host.includes('.') && !host.startsWith('[');
}

/**
 * Why sharing the page may be a mistake, or null: a host others may not reach, or a link that may hold a secret. A
 * warning only: the user decides.
 */
export function privacyWarning(url: string): string | null {
  if (!URL.canParse(url)) return null;
  const { hostname, search } = new URL(url);
  if (isPrivateHost(hostname)) return `This page looks private (${hostname}): others may not be able to open it.`;

  const secret = search.slice(1).split('&').map(parameterName).find(isSecret);
  return secret ? `This link may hold a secret (${secret}): check it before you share it.` : null;
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
