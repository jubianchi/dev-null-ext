import type { CurrentUser } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { Glyph } from '../../components/Glyph.tsx';
import { PopupSettings } from '../../components/PopupSettings.tsx';
import { type SignInState, ask } from '../../lib/messages.ts';
import { type Settings, readSettings } from '../../lib/settings.ts';
import { loadSettings, saveSetting, watchSettings } from '../../lib/settings-store.ts';

const signInItem = storage.defineItem<SignInState>('local:signIn', { fallback: { status: 'idle' } });
const userItem = storage.defineItem<CurrentUser | null>('local:user', { fallback: null });

/** Firefox grants host access at the user's discretion, even when the manifest lists it. */
const ORIGINS = ['https://github.com/*', 'https://dev-null.sh/*', 'https://api.github.com/*'];

const button = 'rounded-md px-3 py-1.5 text-sm font-medium';
const primary = `${button} bg-primary text-primary-fg hover:bg-primary-hover`;
const secondary = `${button} border border-button-border bg-button text-fg hover:bg-button-hover`;

export function App() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [signIn, setSignIn] = useState<SignInState>({ status: 'idle' });
  const [hostAccess, setHostAccess] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'settings'>('home');
  const [settings, setSettings] = useState<Settings>(() => readSettings(undefined));

  useEffect(() => {
    void browser.permissions.contains({ origins: ORIGINS }).then(setHostAccess);
    void signInItem.getValue().then(setSignIn);
    void loadSettings().then(setSettings);
    ask({ type: 'session' }).then(setUser, () => setUser(null));

    const unwatchSignIn = signInItem.watch(setSignIn);
    const unwatchUser = userItem.watch(setUser);
    const unwatchSettings = watchSettings(setSettings);
    return () => {
      unwatchSignIn();
      unwatchUser();
      unwatchSettings();
    };
  }, []);

  if (view === 'settings') {
    return (
      <main class="w-80 bg-white font-sans text-sm text-zinc-900">
        <PopupSettings
          settings={settings}
          onChange={(id, on) => {
            setSettings({ ...settings, [id]: on });
            void saveSetting(id, on);
          }}
          onBack={() => setView('home')}
        />
      </main>
    );
  }

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <main class="w-80 bg-canvas p-4 font-sans text-sm text-fg">
      <header class="mb-4 flex items-center gap-2">
        <Glyph class="size-5" />
        <h1 class="m-0 text-base font-semibold">/dev/null for GitHub</h1>
        <button
          type="button"
          onClick={() => setView('settings')}
          aria-label="Settings"
          title="Settings"
          class="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-fg-muted hover:bg-button-hover hover:text-fg"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" />
            <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4" />
          </svg>
        </button>
      </header>

      {!hostAccess && (
        <section class="mb-4 space-y-2">
          <p class="m-0 text-fg-muted">The extension needs access to github.com and dev-null.sh to work.</p>
          <button type="button" class={primary} onClick={() => run(async () => setHostAccess(await browser.permissions.request({ origins: ORIGINS })))}>
            Allow access
          </button>
        </section>
      )}

      {user === undefined && <p class="m-0 text-fg-muted">Checking your session…</p>}

      {user && (
        <section class="space-y-3">
          <div class="flex items-center gap-3">
            <img src={user.avatar_url ?? ''} alt="" class="size-10 rounded-full" />
            <div class="min-w-0">
              <p class="m-0 truncate font-semibold">{user.name ?? user.handle}</p>
              <a href={user.html_url} target="_blank" rel="noopener" class="text-fg-accent hover:underline">
                @{user.handle}
              </a>
            </div>
          </div>
          <button type="button" class={secondary} onClick={() => run(() => ask({ type: 'sign-out' }))}>
            Disconnect
          </button>
          <p class="m-0 text-xs text-fg-muted">Disconnecting also revokes this browser in your /dev/null devices.</p>
        </section>
      )}

      {user === null && signIn.status === 'idle' && (
        <section class="space-y-2">
          <p class="m-0 text-fg-muted">Connect your /dev/null account to commit from GitHub. Reading works without it.</p>
          <button type="button" class={primary} onClick={() => run(() => ask({ type: 'sign-in' }))}>
            Connect /dev/null
          </button>
        </section>
      )}

      {user === null && signIn.status === 'waiting' && signIn.flow === 'device-grant' && (
        <section class="space-y-2">
          <p class="m-0">Approve this code on dev-null.sh, in the tab that just opened:</p>
          <p class="m-0 rounded-md bg-canvas-muted py-2 text-center font-mono text-xl tracking-widest">{signIn.userCode}</p>
          <div class="flex gap-2">
            <a href={signIn.verificationUri} target="_blank" rel="noopener" class={secondary}>
              Open the page again
            </a>
            <button type="button" class={secondary} onClick={() => run(() => ask({ type: 'sign-in:cancel' }))}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {user === null && signIn.status === 'waiting' && signIn.flow === 'loopback' && (
        <section class="space-y-2">
          <p class="m-0">Approve this browser on dev-null.sh, in the tab that just opened.</p>
          <button type="button" class={secondary} onClick={() => run(() => ask({ type: 'sign-in:cancel' }))}>
            Cancel
          </button>
        </section>
      )}

      {user === null && signIn.status === 'needs-permission' && (
        <section class="space-y-2">
          <p class="m-0 text-fg-muted">
            This /dev/null server signs browsers in through a redirect. To catch it, the extension needs to see where the
            sign-in tab goes. It only looks for its own redirect.
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class={primary}
              onClick={() =>
                run(async () => {
                  if (await browser.permissions.request({ permissions: ['webNavigation'] })) await ask({ type: 'sign-in:loopback' });
                })
              }
            >
              Allow and continue
            </button>
            <button type="button" class={secondary} onClick={() => run(() => ask({ type: 'sign-in:cancel' }))}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {user === null && signIn.status === 'failed' && (
        <section class="space-y-2">
          <p class="m-0 text-fg-danger">{signIn.message}</p>
          <button type="button" class={primary} onClick={() => run(() => ask({ type: 'sign-in' }))}>
            Try again
          </button>
        </section>
      )}

      {error && <p class="m-0 mt-3 text-fg-danger">{error}</p>}
    </main>
  );
}
