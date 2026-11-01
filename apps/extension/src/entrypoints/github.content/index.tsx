import { render } from 'preact';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { FollowButton } from '../../components/FollowButton.tsx';
import { OrganizationPanel } from '../../components/OrganizationPanel.tsx';
import { OrganizationSidebar } from '../../components/OrganizationSidebar.tsx';
import { organizationTabLink } from '../../components/OrganizationTab.tsx';
import { ShareButton } from '../../components/ShareButton.tsx';
import { batched } from '../../lib/batch.ts';
import {
  discussionsSidebar,
  type FollowLayout,
  listFollowAnchors,
  organizationContent,
  organizationFollowAnchor,
  organizationTabStyle,
  organizationTabs,
  profileFollowAnchor,
  releaseShareAnchors,
  selectedOrganizationTabs,
  shareButtonAnchor,
} from '../../lib/github/anchors.ts';
import { watchNavigation } from '../../lib/github/navigation.ts';
import { type GitHubPage, readPage, samePage } from '../../lib/github/page.ts';
import { keepEachMounted } from '../../lib/keep-each-mounted.ts';
import { keepMounted } from '../../lib/keep-mounted.ts';
import { ask } from '../../lib/messages.ts';
import { panelToggle } from '../../lib/panel-toggle.ts';
import { decorationsFor, disabledFeatures, type Settings } from '../../lib/settings.ts';
import { loadSettings, watchSettings } from '../../lib/settings-store.ts';
import type { SharedPage } from '../../lib/share.ts';
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
    if (decoration === 'organization-follow' && page.kind === 'organization') mounted.push(await organizationFollow(ctx, page.organization));
    if (decoration === 'follow-buttons') mounted.push(followButtons(ctx));
    if (decoration === 'profile-follow' && page.kind === 'profile') mounted.push(await profileFollow(ctx, page.login));
    if (decoration === 'share-button' && 'url' in page && page.kind !== 'release') mounted.push(await shareButton(ctx, page, disabled));
    if (decoration === 'release-buttons' && page.kind === 'releases') mounted.push(releaseButtons(ctx, page, disabled));
  }

  return mounted;
}

async function shareButton(ctx: ContentScriptContext, page: Extract<GitHubPage, { url: string }>, disabled: ReadonlySet<string>): Promise<Mounted> {
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
      item.dataset.devnullShare = '';
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

  const kept = keptMounted(
    ctx,
    ui,
    () => ui.shadowHost,
    () => shareButtonAnchor()?.selector,
  );
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

/** How the /dev/null Follow is spaced from GitHub's, inside the shadow root since WXT resets the host. */
const FOLLOW_SPACING: Record<FollowLayout, string> = {
  'before-column': 'flex items-center pr-2',
  beside: 'flex items-center pl-2',
  below: 'flex justify-end pt-1',
};

/**
 * A /dev/null Follow beside GitHub's own for each person the page lists, at its size: before its column, beside it or
 * under it (listFollowAnchors). Their states come from one question to the background for all of them; nothing shows
 * when the user is signed out of /dev/null.
 */
function followButtons(ctx: ContentScriptContext): Mounted {
  const controller = new AbortController();
  const state = batched((handles) => ask({ type: 'follows', handles }));

  keepEachMounted({
    find: () => listFollowAnchors().map(({ box }) => box),
    mount: async (box) => {
      const { login, layout } = listFollowAnchors().find((anchor) => anchor.box === box) ?? { login: '', layout: 'below' as const };
      const current = await state(login).catch(() => null);
      const before = layout === 'before-column' && box.parentElement;
      const ui = await createShadowRootUi(ctx, {
        name: 'devnull-follow',
        position: 'inline',
        anchor: before || box,
        append: before ? 'before' : 'after',
        onMount: (container) =>
          current &&
          render(
            <span class={FOLLOW_SPACING[layout]}>
              <FollowButton handle={login} state={current} size="small" />
            </span>,
            container,
          ),
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

/**
 * A /dev/null Follow beside GitHub's own in an organization's header; nothing when signed out of /dev/null, nor for
 * an organization /dev/null has no page for.
 */
async function organizationFollow(ctx: ContentScriptContext, organization: string): Promise<Mounted> {
  const state = await ask({ type: 'organization-follows', handle: organization }).catch(() => null);
  const ui = await createShadowRootUi(ctx, {
    name: 'devnull-follow',
    position: 'inline',
    anchor: organizationFollowAnchor,
    append: 'after',
    onMount: (container) =>
      state &&
      state !== 'absent' &&
      render(
        <span class="flex items-center pl-2">
          <FollowButton handle={organization} state={state} size="medium" organization />
        </span>,
        container,
      ),
    onRemove: (container) => container && render(null, container),
  });

  return keptMounted(ctx, ui, () => ui.shadowHost, organizationFollowAnchor);
}

/** A /dev/null Follow under GitHub's own on a user's profile, as wide and as tall; nothing when signed out of /dev/null. */
async function profileFollow(ctx: ContentScriptContext, login: string): Promise<Mounted> {
  const states = await ask({ type: 'follows', handles: [login] }).catch(() => null);
  const state = states?.[login];
  const ui = await createShadowRootUi(ctx, {
    name: 'devnull-follow',
    position: 'inline',
    anchor: profileFollowAnchor,
    append: 'after',
    onMount: (container) =>
      state &&
      render(
        <div class="pt-2">
          <FollowButton handle={login} state={state} size="medium" block />
        </div>,
        container,
      ),
    onRemove: (container) => container && render(null, container),
  });

  return keptMounted(ctx, ui, () => ui.shadowHost, profileFollowAnchor);
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
function keptMounted(ctx: ContentScriptContext, ui: { mount(): void; remove(): void }, element: () => Element, selector: () => string | undefined): Mounted {
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

  // Mounting the tab syncs the panel at once when the page opens on #dev-null: the panel must exist by then.
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
