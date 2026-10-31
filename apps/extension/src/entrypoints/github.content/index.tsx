import { render } from 'preact';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { OrganizationPanel } from '../../components/OrganizationPanel.tsx';
import { organizationTabLink } from '../../components/OrganizationTab.tsx';
import { ShareButton } from '../../components/ShareButton.tsx';
import {
  organizationContent,
  organizationTabs,
  organizationTabStyle,
  selectedOrganizationTabs,
  shareButtonAnchor,
} from '../../lib/github/anchors.ts';
import { watchNavigation } from '../../lib/github/navigation.ts';
import { keepMounted } from '../../lib/keep-mounted.ts';
import { panelToggle } from '../../lib/panel-toggle.ts';
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

    const update = async () => {
      const next = readPage(window.location, document);
      if (samePage(page, next)) return;

      page = next;
      for (const ui of mounted) ui.remove();
      mounted = await mount(ctx, next);
    };

    void update();
    watchNavigation({
      window,
      document,
      listen: (target, type, handler) => target.addEventListener(type, handler, { signal: ctx.signal }),
      defer: (callback) => ctx.setTimeout(callback, 0),
      onNavigate: () => void update(),
    });
  },
});

async function mount(ctx: ContentScriptContext, page: GitHubPage): Promise<Mounted[]> {
  switch (page.kind) {
    case 'organization':
      return [organizationTab(ctx, page.organization)];
    case 'repository':
    case 'pull-request':
    case 'issue':
    case 'discussion':
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
    anchor: () => shareButtonAnchor()?.selector,
    // First among GitHub's own buttons, whose container spaces them; in a list item when it is a list.
    append: (anchor, element) => {
      removeShareItems();
      const placement = shareButtonAnchor();
      (element as HTMLElement).style.display = 'inline-flex';
      if (placement?.position === 'after') {
        (element as HTMLElement).style.alignSelf = 'flex-start';
        (element as HTMLElement).style.marginLeft = '8px';
        return anchor.after(element);
      }
      if (!placement?.item) return anchor.prepend(element);

      const item = document.createElement('li');
      item.dataset['devnullShare'] = '';
      item.append(element);
      anchor.prepend(item);
    },
    onMount: (container) => render(<ShareButton page={page} size={shareButtonAnchor()?.size ?? 'medium'} />, container),
    onRemove: (container) => container && render(null, container),
  });

  const kept = keptMounted(ctx, ui, () => ui.shadowHost, () => shareButtonAnchor()?.selector);
  return {
    remove() {
      kept.remove();
      removeShareItems();
    },
  };
}

/** The list items the share button went in, so none is left empty among GitHub's. */
function removeShareItems() {
  for (const item of document.querySelectorAll('li[data-devnull-share]')) item.remove();
}

/** Mounts a WXT UI and keeps it mounted while its anchor is there, even when GitHub's React replaces the anchor. */
function keptMounted(
  ctx: ContentScriptContext,
  ui: { mount(): void; remove(): void },
  element: () => Element,
  selector: () => string | undefined,
): Mounted {
  const controller = new AbortController();

  keepMounted({
    element,
    anchor: () => {
      const current = selector();
      return current ? document.querySelector(current) : null;
    },
    mount: () => ui.mount(),
    root: document.documentElement,
    signal: AbortSignal.any([ctx.signal, controller.signal]),
  });

  return {
    remove() {
      controller.abort();
      ui.remove();
    },
  };
}

/**
 * A tab in the organization's tab bar, drawn with its neighbours' classes so it is one of them. Opening it (#dev-null)
 * hides the page's content and shows the organization's commits on /dev/null in its place; leaving it puts the page
 * back.
 */
function organizationTab(ctx: ContentScriptContext, organization: string): Mounted {
  let hidden: HTMLElement | null = null;
  let deselected: Array<{ tab: Element; hadSelectedClass: boolean }> = [];

  const tab = createIntegratedUi(ctx, {
    tag: 'li',
    position: 'inline',
    anchor: organizationTabs,
    append: 'last',
    onMount: (li) => {
      const style = organizationTabStyle() ?? { item: 'd-flex', link: 'UnderlineNav-item' };
      li.className = style.item;
      li.replaceChildren(organizationTabLink({ href: TAB_HASH, className: style.link }));
      void sync();
    },
  });
  const kept = keptMounted(ctx, tab, () => tab.wrapper, organizationTabs);

  const panel = panelToggle(async () => {
    const content = organizationContent();
    if (!content) return { remove() {} };

    hidden = content;
    content.hidden = true;

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
    return ui;
  });

  function close() {
    panel.hide();
    if (hidden) hidden.hidden = false;
    hidden = null;

    const link = document.querySelector('[data-devnull-tab]');
    link?.classList.remove('selected');
    link?.removeAttribute('aria-current');
    for (const { tab: selected, hadSelectedClass } of deselected) {
      if (hadSelectedClass) selected.classList.add('selected');
      selected.setAttribute('aria-current', 'page');
    }
    deselected = [];
  }

  /** Idempotent, since GitHub's React may render the tab bar again, and the /dev/null tab with it, while it is open. */
  function select() {
    for (const selected of selectedOrganizationTabs()) {
      deselected.push({ tab: selected, hadSelectedClass: selected.classList.contains('selected') });
      selected.classList.remove('selected');
      selected.removeAttribute('aria-current');
    }
    const link = document.querySelector('[data-devnull-tab]');
    if (deselected.some(({ hadSelectedClass }) => hadSelectedClass)) link?.classList.add('selected');
    link?.setAttribute('aria-current', 'page');
  }

  async function sync() {
    if (window.location.hash !== TAB_HASH) return close();

    select();
    await panel.show();
  }

  ctx.addEventListener(window, 'hashchange', () => void sync());

  return {
    remove() {
      close();
      kept.remove();
    },
  };
}
