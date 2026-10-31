// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  organizationContent,
  organizationTabs,
  organizationTabStyle,
  selectedOrganizationTabs,
  shareButtonAnchor,
} from '../src/lib/github/anchors.ts';

const LOGGED_OUT = `
  <div class="application-main">
    <header class="pagehead orghead">
      <nav aria-label="Organization" class="UnderlineNav">
        <ul class="list-style-none UnderlineNav-body">
          <li class="d-flex js-responsive-underlinenav-item"><a class="UnderlineNav-item selected" aria-current="page" href="/NativePHP">Overview</a></li>
          <li class="d-flex js-responsive-underlinenav-item"><a class="UnderlineNav-item " href="/orgs/NativePHP/repositories">Repositories</a></li>
        </ul>
      </nav>
    </header>
    <div id="logged-out-content" class="container-xl"></div>
  </div>`;

const LOGGED_IN = `
  <div class="position-relative header-wrapper js-header-wrapper">
    <react-partial class="loaded"><div>
      <header class="GlobalNav">
        <nav aria-label="Organization" class="prc-UnderlineNav-UnderlineWrapper-GWONT">
          <ul class="prc-UnderlineNav-ItemsList-oj8gN">
            <li role="presentation" aria-hidden="true" class="prc-UnderlineNav-WrapSpacer--aLgz"></li>
            <li class="prc-UnderlineNav-UnderlineNavItem-syRjR"><a aria-current="page" class="prc-components-UnderlineItem-7fP-n" href="/NativePHP">Overview</a></li>
            <li class="prc-UnderlineNav-UnderlineNavItem-syRjR"><a class="prc-components-UnderlineItem-7fP-n" href="/orgs/NativePHP/repositories">Repositories</a></li>
          </ul>
        </nav>
      </header>
    </div></react-partial>
  </div>
  <div id="logged-in-content" class="application-main"></div>`;

describe('organization anchors, logged out', () => {
  beforeEach(() => {
    document.body.innerHTML = LOGGED_OUT;
  });

  it('finds the tab list and the content below the organization header', () => {
    expect(document.querySelector(organizationTabs() ?? 'none')?.className).toContain('UnderlineNav-body');
    expect(organizationContent()?.id).toBe('logged-out-content');
  });

  it('styles a tab like its neighbours', () => {
    expect(organizationTabStyle()).toEqual({ item: 'd-flex js-responsive-underlinenav-item', link: 'UnderlineNav-item' });
  });

  it('finds the selected tab', () => {
    expect(selectedOrganizationTabs().map((tab) => tab.textContent)).toEqual(['Overview']);
  });
});

describe('organization anchors, logged in', () => {
  beforeEach(() => {
    document.body.innerHTML = LOGGED_IN;
  });

  it('finds the tab list in the global header and the main content', () => {
    expect(document.querySelector(organizationTabs() ?? 'none')?.className).toContain('prc-UnderlineNav-ItemsList');
    expect(organizationContent()?.id).toBe('logged-in-content');
  });

  it('styles a tab like its neighbours', () => {
    expect(organizationTabStyle()).toEqual({
      item: 'prc-UnderlineNav-UnderlineNavItem-syRjR',
      link: 'prc-components-UnderlineItem-7fP-n',
    });
  });

  it('finds the selected tab', () => {
    expect(selectedOrganizationTabs().map((tab) => tab.textContent)).toEqual(['Overview']);
  });
});

describe('share button anchor', () => {
  const at = () => {
    const anchor = shareButtonAnchor();
    return anchor && { ...anchor, element: document.querySelector(anchor.selector)?.id };
  };

  it("goes with an issue's visible buttons, New issue and Copy link, not their copy for narrow screens", () => {
    document.body.innerHTML = `
      <div data-component="PageHeader">
        <div data-component="PageHeader.ContextArea" style="display: none">
          <div data-component="PageHeader.ContextAreaActions">
            <div class="menuActionsContainer__S_GMw3" id="narrow-actions"><div><a>New issue</a></div><button>Copy</button></div>
          </div>
        </div>
        <div data-component="PH_Actions">
          <div class="menuActionsContainer__S_GMw3" id="issue-actions"><div><a>New issue</a></div><button>Copy</button></div>
        </div>
      </div>`;

    expect(at()).toEqual({
      selector: '[data-component="PH_Actions"] [class*="menuActionsContainer"]',
      size: 'medium',
      item: false,
      position: 'first',
      element: 'issue-actions',
    });
  });

  it("goes with a pull request's own buttons, Edit and Code", () => {
    document.body.innerHTML = `<div data-component="PH_Actions" id="pull-actions"><div class="d-flex gap-2"><button>Code</button></div></div>`;

    expect(at()).toEqual({ selector: '[data-component="PH_Actions"]', size: 'medium', item: false, position: 'first', element: 'pull-actions' });
  });

  it("goes with a repository's own buttons, Watch, Fork and Star, at their smaller size, as a list item", () => {
    document.body.innerHTML = `
      <div id="repo-title-component"></div>
      <ul class="list-style-none d-flex gap-2 RepoHeaderActions-module_xyz" id="repository-actions"><li>Watch</li><li>Fork</li><li>Star</li></ul>`;

    expect(at()).toEqual({ selector: 'ul[class*="RepoHeaderActions"]', size: 'small', item: true, position: 'first', element: 'repository-actions' });
  });

  it("goes with the classic markup's header actions", () => {
    document.body.innerHTML = `<div class="gh-header-actions" id="classic-actions"></div>`;

    expect(at()).toEqual({ selector: '.gh-header-actions', size: 'small', item: false, position: 'first', element: 'classic-actions' });
  });

  it("goes with a discussion's header actions, for those who may edit it", () => {
    document.body.innerHTML = `
      <div class="gh-header-show">
        <div class="d-flex"><h1 class="gh-header-title flex-auto">Proposal</h1><div class="gh-header-actions" id="discussion-actions"></div></div>
      </div>`;

    expect(at()).toEqual({ selector: '.gh-header-show .gh-header-actions', size: 'medium', item: false, position: 'first', element: 'discussion-actions' });
  });

  it("goes at the end of a discussion's title row when it has no actions", () => {
    document.body.innerHTML = `
      <div class="gh-header-show gh-header-no-access">
        <div class="d-flex"><h1 class="gh-header-title flex-auto" id="discussion-title">Proposal</h1></div>
      </div>`;

    expect(at()).toEqual({ selector: '.gh-header-show h1.gh-header-title', size: 'medium', item: false, position: 'after', element: 'discussion-title' });
  });

  it('never goes against the repository title', () => {
    document.body.innerHTML = `<div id="repo-title-component"></div>`;

    expect(shareButtonAnchor()).toBeNull();
  });

  it('gives no anchor while the page has none, so the UI waits for one', () => {
    document.body.innerHTML = '';

    expect(shareButtonAnchor()).toBeNull();
    expect(organizationTabs()).toBeUndefined();
  });
});
