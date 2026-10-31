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
  it('prefers the issue or pull request header actions over the repository title', () => {
    document.body.innerHTML = `<div id="repo-title-component"></div><div class="gh-header-actions"></div>`;

    const anchor = shareButtonAnchor();
    expect(anchor?.append).toBe('first');
    expect(document.querySelector(anchor?.selector ?? 'none')?.className).toBe('gh-header-actions');
  });

  it('falls back to the repository title', () => {
    document.body.innerHTML = `<div id="repo-title-component"></div>`;

    expect(shareButtonAnchor()).toEqual({ selector: '#repo-title-component', append: 'after' });
  });

  it('gives no anchor while the page has none, so the UI waits for one', () => {
    document.body.innerHTML = '';

    expect(shareButtonAnchor()).toBeNull();
    expect(organizationTabs()).toBeUndefined();
  });
});
