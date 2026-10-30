/**
 * Where the extension attaches to GitHub's pages. Each anchor lists selectors from the most to the least specific;
 * the first match wins. When GitHub changes its markup, this is the file to update (and the nightly E2E run is what
 * tells).
 */

function first(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

/** The tab list of an organization's page. */
export function organizationTabs(): Element | null {
  return first(['nav[aria-label="Organization"] ul.UnderlineNav-body', 'nav[aria-label="Organization"] ul']);
}

/** The content below an organization's header (`header.orghead` + `div.container-xl`), which the /dev/null tab replaces while it is open. */
export function organizationContent(): HTMLElement | null {
  const header = document.querySelector('nav[aria-label="Organization"]')?.closest('header');
  const next = header?.nextElementSibling;

  return next instanceof HTMLElement ? next : null;
}

/** Where the share button goes, and how: next to an issue's or pull request's header actions, or the repository title. */
export function shareButtonAnchor(): { anchor: Element; append: 'first' | 'after' } | null {
  const headerActions = first(['.gh-header-actions', '[data-component="PH_Actions"]', '[data-testid="issue-header"] [data-component="PH_Actions"]']);
  if (headerActions) return { anchor: headerActions, append: 'first' };

  const repositoryTitle = first(['#repo-title-component', '[data-testid="repository-title"]']);
  if (repositoryTitle) return { anchor: repositoryTitle, append: 'after' };

  return null;
}
