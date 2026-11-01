// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  discussionsSidebar,
  organizationContent,
  organizationTabStyle,
  organizationTabs,
  peopleFollowAnchors,
  releaseShareAnchors,
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

describe('release share anchors', () => {
  const card = (tag: string) => `
    <section aria-labelledby="h-${tag}">
      <div class="Box"><div class="Box-body"><div class="d-flex flex-md-row flex-column">
        <div class="d-flex flex-row flex-1"><h2 id="h-${tag}"><a href="/laravel/installer/releases/tag/${tag}">${tag}</a></h2></div>
        <div class="d-flex tmp-mb-3" id="compare-${tag}"><select-panel><button>Compare</button></select-panel></div>
      </div></div></div>
    </section>`;

  it("finds each release's Compare box on a releases list, with its tag", () => {
    document.body.innerHTML = card('v5.32.0') + card('v5.31.0');

    expect(releaseShareAnchors(new URL('https://github.com/laravel/installer/releases')).map(({ box, tag }) => [box.id, tag])).toEqual([
      ['compare-v5.32.0', 'v5.32.0'],
      ['compare-v5.31.0', 'v5.31.0'],
    ]);
  });

  it("finds the Compare box of a release's own page, its tag from the URL", () => {
    document.body.innerHTML = `
      <div class="Box"><div class="Box-body"><div class="d-flex">
        <h1>v5.32.0</h1>
        <div class="d-flex tmp-mb-3" id="compare"><select-panel><button>Compare</button></select-panel></div>
      </div></div></div>`;

    expect(releaseShareAnchors(new URL('https://github.com/laravel/installer/releases/tag/packages%2Fqueue-1.0')).map(({ box, tag }) => [box.id, tag])).toEqual(
      [['compare', 'packages/queue-1.0']],
    );
  });
});

describe('discussions sidebar anchor', () => {
  it("finds the discussions list's right sidebar, not its categories", () => {
    document.body.innerHTML = `
      <div class="Layout Layout--sidebarPosition-start"><div class="Layout-sidebar" id="categories"></div><div class="Layout-main">
        <div class="Layout Layout--flowRow-until-lg Layout--sidebarPosition-end"><div class="Layout-main"></div><div class="Layout-sidebar" id="most-helpful"></div></div>
      </div></div>`;

    expect(document.querySelector(discussionsSidebar())?.id).toBe('most-helpful');
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

describe('peopleFollowAnchors', () => {
  const member = (login: string, follow = true) => `
    <li class="d-flex flex-items-center member-list-item js-bulk-actions-item">
      <div class="tmp-py-3 tmp-pl-3"><a class="d-inline-block" data-hovercard-type="user" href="/${login}"><img class="avatar"></a></div>
      <div class="flex-auto">
        <span class="d-flex">
          <div class="css-truncate flex-auto"><a class="f4 d-block" data-hovercard-type="user" href="/${login}">Someone</a><span>${login}</span></div>
          <div class="text-center color-fg-muted f5 text-right flex-shrink-0" id="box-${login}">
            ${follow ? '<span class="user-following-container js-form-toggle-container"><form><input type="submit" value="Follow"></form></span>' : ''}
          </div>
        </span>
      </div>
    </li>`;

  it("finds, for each member of an organization's people, the box of GitHub's Follow button, and their login", () => {
    document.body.innerHTML = `<ul>${member('A5hleyRich')}${member('taylorotwell')}</ul>`;

    expect(peopleFollowAnchors().map(({ box, login }) => [box.id, login])).toEqual([
      ['box-A5hleyRich', 'A5hleyRich'],
      ['box-taylorotwell', 'taylorotwell'],
    ]);
  });

  it('leaves out a member GitHub offers no Follow for, as the signed-in user', () => {
    document.body.innerHTML = `<ul>${member('jubianchi', false)}${member('taylorotwell')}</ul>`;

    expect(peopleFollowAnchors().map(({ login }) => login)).toEqual(['taylorotwell']);
  });
});
