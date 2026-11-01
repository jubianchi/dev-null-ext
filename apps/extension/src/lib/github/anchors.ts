/**
 * Where the extension attaches to GitHub's pages. Each anchor lists selectors from the most to the least specific;
 * the first match wins. When GitHub changes its markup, this is the file to update (and the nightly E2E run is what
 * tells).
 */

/**
 * The first selector that matches. Anchors are selectors, not elements: WXT's autoMount refuses an anchor that
 * resolves to an Element, and a selector lets it remount when GitHub replaces the anchor.
 */
function first(selectors: string[]): string | undefined {
  return selectors.find((selector) => document.querySelector(selector) !== null);
}

const ORGANIZATION_NAV = 'nav[aria-label="Organization"]';

/** The tab list of an organization's page: in its own header when logged out, in GitHub's global header when logged in. */
export function organizationTabs(): string | undefined {
  return first([`${ORGANIZATION_NAV} ul.UnderlineNav-body`, `${ORGANIZATION_NAV} ul`]);
}

/**
 * The content the /dev/null tab replaces while it is open: below the organization's header (`header.orghead`) when
 * logged out, the whole main content when logged in, since the tabs then sit in the global header.
 */
export function organizationContent(): HTMLElement | null {
  const next = document.querySelector(ORGANIZATION_NAV)?.closest('header.orghead')?.nextElementSibling;
  const content = next ?? document.querySelector('.application-main');

  return content instanceof HTMLElement ? content : null;
}

/** The classes of an existing tab, so the /dev/null tab looks like its neighbours whichever markup GitHub serves. */
export function organizationTabStyle(): { item: string; link: string } | null {
  const link = document.querySelector(`${ORGANIZATION_NAV} ul > li > a[href]:not([data-devnull-tab])`);
  const item = link?.parentElement;
  if (!link || !item) return null;

  const classes = (element: Element) => [...element.classList].filter((name) => name !== 'selected').join(' ');
  return { item: classes(item), link: classes(link) };
}

/** The tabs GitHub marks as the current one, which the /dev/null tab takes over while it is open. */
export function selectedOrganizationTabs(): Element[] {
  return [...document.querySelectorAll(`${ORGANIZATION_NAV} ul > li > a[aria-current="page"], ${ORGANIZATION_NAV} .UnderlineNav-item.selected`)].filter(
    (tab) => !tab.hasAttribute('data-devnull-tab'),
  );
}

/**
 * Where each release of a releases page is shared from: the box of its Compare button, and its tag. On a list, the tag
 * comes from the release's card (`section[aria-labelledby]`) link; on a release's own page, from the URL.
 */
export function releaseShareAnchors(location: URL): Array<{ box: Element; tag: string }> {
  const ownTag = /\/releases\/tag\/(.+)$/.exec(location.pathname)?.[1];

  return [...document.querySelectorAll('.Box-body select-panel')].flatMap((panel) => {
    const button = panel.querySelector('button');
    const box = panel.parentElement;
    if (!box || !button?.textContent?.trim().startsWith('Compare')) return [];

    const link = panel.closest('section[aria-labelledby]')?.querySelector('a[href*="/releases/tag/"]')?.getAttribute('href') ?? '';
    const tag = /\/releases\/tag\/(.+)$/.exec(link)?.[1] ?? ownTag;
    return tag ? [{ box, tag: decodeURIComponent(tag) }] : [];
  });
}

/**
 * Where each member of an organization's people gets a /dev/null Follow button: the box of GitHub's own Follow
 * (`.user-following-container`), with the member's login from their hovercard link. GitHub offers no Follow for the
 * signed-in user, nor when signed out: those are left out.
 */
export function peopleFollowAnchors(): Array<{ box: Element; login: string }> {
  return [...document.querySelectorAll('li.member-list-item')].flatMap((member) => {
    const box = member.querySelector('.user-following-container')?.parentElement;
    const login = member.querySelector('a[data-hovercard-type="user"]')?.getAttribute('href')?.split('/')[1];
    return box && login ? [{ box, login }] : [];
  });
}

/**
 * GitHub's Follow on a user's profile, under their name, which the /dev/null Follow goes under. There is none on the
 * user's own profile (Edit profile instead), nor when signed out of GitHub.
 */
export function profileFollowAnchor(): string | undefined {
  return first(['.js-user-profile-follow-button ~ .user-following-container']);
}

/** The right sidebar of an organization's discussions list ("Most helpful"), not its categories on the left. */
export function discussionsSidebar(): string {
  return '.Layout--sidebarPosition-end > .Layout-sidebar';
}

export interface ShareButtonAnchor {
  /** The container of GitHub's own buttons, which the share button goes first in. */
  selector: string;
  /** The size of GitHub's buttons there: medium (32px) in an issue's or a pull request's header, small (28px) in a repository's. */
  size: 'medium' | 'small';
  /** Whether the container is a list, so the button goes in a list item. */
  item: boolean;
  /** First in the container of GitHub's buttons, or right after the element when a header has none. */
  position: 'first' | 'after';
}

/** The containers of GitHub's own header buttons, from the most to the least specific page. */
const SHARE_BUTTON_ANCHORS: ShareButtonAnchor[] = [
  // An issue: with New issue and Copy link, in the title's actions. GitHub renders them twice, the other copy in the
  // ContextArea, which only shows on narrow screens.
  { selector: '[data-component="PH_Actions"] [class*="menuActionsContainer"]', size: 'medium', item: false, position: 'first' },
  // A pull request: with Edit and Code.
  { selector: '[data-component="PH_Actions"]', size: 'medium', item: false, position: 'first' },
  // A discussion (classic markup): with its actions for those who may edit it; at the end of the title's row, which
  // the title fills, for the others. Before the repository's buttons, which a repository's discussion may show too.
  { selector: '.gh-header-show .gh-header-actions', size: 'medium', item: false, position: 'first' },
  { selector: '.gh-header-show h1.gh-header-title', size: 'medium', item: false, position: 'after' },
  // A repository: with Watch, Fork and Star.
  { selector: 'ul[class*="RepoHeaderActions"]', size: 'small', item: true, position: 'first' },
  { selector: 'ul.pagehead-actions', size: 'small', item: true, position: 'first' },
  // The classic markup of issues and pull requests.
  { selector: '.gh-header-actions', size: 'small', item: false, position: 'first' },
];

/** Where the share button goes: first among GitHub's own buttons of the page's header, at their size. */
export function shareButtonAnchor(): ShareButtonAnchor | null {
  return SHARE_BUTTON_ANCHORS.find(({ selector }) => document.querySelector(selector) !== null) ?? null;
}
