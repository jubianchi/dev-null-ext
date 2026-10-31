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
  return [...document.querySelectorAll(`${ORGANIZATION_NAV} ul > li > a[aria-current="page"], ${ORGANIZATION_NAV} .UnderlineNav-item.selected`)]
    .filter((tab) => !tab.hasAttribute('data-devnull-tab'));
}

/** Where the share button goes, and how: next to an issue's or pull request's header actions, or the repository title. */
export function shareButtonAnchor(): { selector: string; append: 'first' | 'after' } | null {
  const headerActions = first(['.gh-header-actions', '[data-component="PH_Actions"]', '[data-testid="issue-header"] [data-component="PH_Actions"]']);
  if (headerActions) return { selector: headerActions, append: 'first' };

  const repositoryTitle = first(['#repo-title-component', '[data-testid="repository-title"]']);
  if (repositoryTitle) return { selector: repositoryTitle, append: 'after' };

  return null;
}
