import { render } from 'preact';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { OrganizationPanel } from '../../components/OrganizationPanel.tsx';
import { OrganizationSidebar } from '../../components/OrganizationSidebar.tsx';
import { organizationTabLink } from '../../components/OrganizationTab.tsx';
import { ShareButton } from '../../components/ShareButton.tsx';
import {
  discussionsSidebar,
  organizationContent,
  organizationTabs,
  organizationTabStyle,
  releaseShareAnchors,
  selectedOrganizationTabs,
  shareButtonAnchor,
} from '../../lib/github/anchors.ts';
import { watchNavigation } from '../../lib/github/navigation.ts';
import { keepEachMounted } from '../../lib/keep-each-mounted.ts';
import { keepMounted } from '../../lib/keep-mounted.ts';
import type { SharedPage } from '../../lib/share.ts';
import { panelToggle } from '../../lib/panel-toggle.ts';
import { type Settings, decorationsFor, disabledFeatures } from '../../lib/settings.ts';
import { loadSettings, watchSettings } from '../../lib/settings-store.ts';
import { type GitHubPage, readPage, samePage } from '../../lib/github/page.ts';
import '../../assets/tailwind.css';

const TAB_HASH = '#dev-null';

interface Mounted {
  remove(): void;
}

export default defineContentScript({
  matches: ['https://github.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    let page: GitHubPage = { kind: 'other' };
    let mounted: Mounted[] = [];
    let settings = await loadSettings();

    const remount = async () => {
      for (const ui of mounted) ui.remove();
      mounted = await mount(ctx, page, settings);
    };

    const update = async () => {
      const next = readPage(window.location, document);
      if (samePage(page, next)) return;

      page = next;
      await remount();
    };

    // A setting changed in the popup applies at once, to every open GitHub tab.
    const stop = watchSettings((next) => {
      settings = next;
      void remount();
    });
    ctx.onInvalidated(stop);

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

/** What the page gets, as the settings allow; the composers leave out the additions the user turned off. */
async function mount(ctx: ContentScriptContext, page: GitHubPage, settings: Settings): Promise<Mounted[]> {
  const disabled = disabledFeatures(settings);
  const mounted: Mounted[] = [];

  for (const decoration of decorationsFor(page, settings)) {
    if (decoration === 'organization-tab' && page.kind === 'organization') mounted.push(organizationTab(ctx, page.organization, disabled));
    if (decoration === 'discussions-sidebar' && page.kind === 'organization') mounted.push(await organizationSidebar(ctx, page.organization));
    if (decoration === 'share-button' && 'url' in page && page.kind !== 'release') mounted.push(await shareButton(ctx, page, disabled));
    if (decoration === 'release-buttons' && page.kind === 'releases') mounted.push(releaseButtons(ctx, page, disabled));
  }

  return mounted;
}

async function shareButton(
  ctx: ContentScriptContext,
  page: Extract<GitHubPage, { url: string }>,
  disabled: ReadonlySet<string>,
): Promise<Mounted> {
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
      if (placement?.position === 'after') return anchor.after(element);
      if (!placement?.item) return anchor.prepend(element);

      const item = document.createElement('li');
      item.dataset['devnullShare'] = '';
      item.append(element);
      anchor.prepend(item);
    },
    onMount: (container) => {
      const placement = shareButtonAnchor();
      const spacing = placement?.position === 'after' ? 'start' : undefined;
      render(<ShareButton page={page} size={placement?.size ?? 'medium'} spacing={spacing} disabled={disabled} />, container);
    },
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

/**
 * A share button for each release of a releases page, before its Compare button and at its size: the page as a whole
 * has nothing to share. Releases GitHub adds or renders again get theirs too.
 */
function releaseButtons(ctx: ContentScriptContext, page: Extract<GitHubPage, { kind: 'releases' }>, disabled: ReadonlySet<string>): Mounted {
  const controller = new AbortController();
  const anchors = () => releaseShareAnchors(new URL(window.location.href));

  keepEachMounted({
    find: () => anchors().map(({ box }) => box),
    mount: async (box) => {
      const tag = anchors().find((anchor) => anchor.box === box)?.tag ?? '';
      const release: SharedPage = {
        kind: 'release',
        owner: page.owner,
        repository: page.repository,
        tag,
        // A tag like packages/queue-1.0 keeps its slashes, as GitHub writes its URL.
        url: `https://github.com/${page.owner}/${page.repository}/releases/tag/${tag.split('/').map(encodeURIComponent).join('/')}`,
      };
      const ui = await createShadowRootUi(ctx, {
        name: 'devnull-share',
        isolateEvents: true,
        position: 'inline',
        anchor: box,
        append: 'first',
        // Spaced from Compare as GitHub spaces a release's header buttons (mr-2).
        onMount: (container) => render(<ShareButton page={release} size="small" spacing="end" disabled={disabled} />, container),
        onRemove: (container) => container && render(null, container),
      });
      ui.mount();
      return { element: ui.shadowHost, remove: () => ui.remove() };
    },
    root: document.documentElement,
    signal: AbortSignal.any([ctx.signal, controller.signal]),
  });

  return { remove: () => controller.abort() };
}

/** What /dev/null says of the organization, at the end of its discussions list's sidebar. */
async function organizationSidebar(ctx: ContentScriptContext, organization: string): Promise<Mounted> {
  const ui = await createShadowRootUi(ctx, {
    name: 'devnull-sidebar',
    position: 'inline',
    anchor: discussionsSidebar,
    append: 'last',
    onMount: (container) => render(<OrganizationSidebar organization={organization} />, container),
    onRemove: (container) => container && render(null, container),
  });

  return keptMounted(ctx, ui, () => ui.shadowHost, discussionsSidebar);
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
function organizationTab(ctx: ContentScriptContext, organization: string, disabled: ReadonlySet<string>): Mounted {
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
      onMount: (container) => render(<OrganizationPanel organization={organization} disabled={disabled} />, container),
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
