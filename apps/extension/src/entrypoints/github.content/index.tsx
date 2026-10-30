import { render } from 'preact';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { OrganizationPanel } from '../../components/OrganizationPanel.tsx';
import { ShareButton } from '../../components/ShareButton.tsx';
import { organizationContent, organizationTabs, shareButtonAnchor } from '../../lib/github/anchors.ts';
import { type GitHubPage, readPage, samePage } from '../../lib/github/page.ts';
import '../../assets/tailwind.css';

const TAB_HASH = '#dev-null';

interface Mounted {
  remove(): void;
}

export default defineContentScript({
  matches: ['https://github.com/*'],
  cssInjectionMode: 'ui',

  main(ctx) {
    let page: GitHubPage = { kind: 'other' };
    let mounted: Mounted[] = [];

    // GitHub navigates without reloading (Turbo, React): follow the URL, and the hash for the organization tab.
    const update = async () => {
      const next = readPage(window.location, document);
      if (samePage(page, next)) return;

      page = next;
      for (const ui of mounted) ui.remove();
      mounted = await mount(ctx, next);
    };

    void update();
    ctx.addEventListener(window, 'wxt:locationchange', () => void update());
  },
});

async function mount(ctx: ContentScriptContext, page: GitHubPage): Promise<Mounted[]> {
  switch (page.kind) {
    case 'organization':
      return [organizationTab(ctx, page.organization)];
    case 'repository':
    case 'pull-request':
    case 'issue':
      return [await shareButton(ctx, page)];
    default:
      return [];
  }
}

async function shareButton(ctx: ContentScriptContext, page: Extract<GitHubPage, { url: string }>): Promise<Mounted> {
  const ui = await createShadowRootUi(ctx, {
    name: 'devnull-share',
    // Keep keystrokes in the composer from reaching GitHub's own shortcuts (c, t, /, …).
    isolateEvents: true,
    position: 'inline',
    anchor: () => shareButtonAnchor()?.anchor,
    append: (anchor, element) => {
      const placement = shareButtonAnchor();
      if (placement?.append === 'first') anchor.prepend(element);
      else anchor.after(element);
      (element as HTMLElement).style.display = 'inline-flex';
      (element as HTMLElement).style.marginInline = '0.5rem';
      (element as HTMLElement).style.alignSelf = 'center';
    },
    onMount: (container) => render(<ShareButton page={page} />, container),
    onRemove: (container) => container && render(null, container),
  });
  ui.autoMount();

  return ui;
}

/**
 * A tab in the organization's own tab bar, drawn with GitHub's classes so it is one of them. Opening it (#dev-null)
 * hides the overview and shows the organization's commits on /dev/null in its place; leaving it puts the page back.
 */
function organizationTab(ctx: ContentScriptContext, organization: string): Mounted {
  let panel: Mounted | null = null;
  let hidden: HTMLElement | null = null;
  let deselected: Element[] = [];

  const tab = createIntegratedUi(ctx, {
    tag: 'li',
    position: 'inline',
    anchor: organizationTabs,
    append: 'last',
    onMount: (li) => {
      li.className = 'd-flex';
      const link = document.createElement('a');
      link.href = TAB_HASH;
      link.className = 'UnderlineNav-item';
      link.dataset['devnullTab'] = '';
      link.textContent = '/dev/null';
      li.append(link);
      void sync();
    },
  });
  tab.autoMount();

  async function open() {
    const content = organizationContent();
    if (!content || panel) return;

    hidden = content;
    content.hidden = true;

    for (const item of document.querySelectorAll('nav[aria-label="Organization"] .UnderlineNav-item.selected')) {
      item.classList.remove('selected');
      item.removeAttribute('aria-current');
      deselected.push(item);
    }
    const link = document.querySelector('[data-devnull-tab]');
    link?.classList.add('selected');
    link?.setAttribute('aria-current', 'page');

    const ui = await createShadowRootUi(ctx, {
      name: 'devnull-organization',
      isolateEvents: true,
      position: 'inline',
      anchor: content,
      append: 'before',
      onMount: (container) => render(<OrganizationPanel organization={organization} />, container),
      onRemove: (container) => container && render(null, container),
    });
    ui.mount();
    panel = ui;
  }

  function close() {
    panel?.remove();
    panel = null;
    if (hidden) hidden.hidden = false;
    hidden = null;

    const link = document.querySelector('[data-devnull-tab]');
    link?.classList.remove('selected');
    link?.removeAttribute('aria-current');
    for (const item of deselected) {
      item.classList.add('selected');
      item.setAttribute('aria-current', 'page');
    }
    deselected = [];
  }

  async function sync() {
    if (window.location.hash === TAB_HASH) await open();
    else close();
  }

  ctx.addEventListener(window, 'hashchange', () => void sync());

  return {
    remove() {
      close();
      tab.remove();
    },
  };
}
