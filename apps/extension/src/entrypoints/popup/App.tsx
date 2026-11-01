import type { CurrentUser } from '@dev-null-ext/client';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { Glyph } from '../../components/Glyph.tsx';
import { Loader } from '../../components/Loader.tsx';
import { PopupProfile } from '../../components/PopupProfile.tsx';
import { PopupSettings } from '../../components/PopupSettings.tsx';
import { PopupSignIn } from '../../components/PopupSignIn.tsx';
import { PopupWelcome } from '../../components/PopupWelcome.tsx';
import { ask, type SignInState } from '../../lib/messages.ts';
import { hostPermission, isDefaultServer, SERVER, serverName } from '../../lib/server.ts';
import { readSettings, type Settings } from '../../lib/settings.ts';
import { loadSettings, saveSetting, watchSettings } from '../../lib/settings-store.ts';

const signInItem = storage.defineItem<SignInState>('local:signIn', { fallback: { status: 'idle' } });
const userItem = storage.defineItem<CurrentUser | null>('local:user', { fallback: null });

/**
 * How many developers are on /dev/null, as dev-null.sh tells its guests on 2026-10-31 (rounded down, so it stays true
 * as the network grows). Hard-coded until the API tells it: see TODO.md.
 */
const DEVELOPERS = 12_000;

/** Firefox grants host access at the user's discretion, even when the manifest lists it. */
const ORIGINS = ['https://github.com/*', hostPermission(SERVER), 'https://api.github.com/*'];
const SERVER_NAME = serverName(SERVER);

const primary = 'h-9 cursor-pointer rounded-lg border-0 bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700';

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
      <main class="w-[360px] bg-white font-sans text-sm text-zinc-900">
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
    <main class="flex w-[360px] flex-col bg-white font-sans text-sm text-zinc-900">
      <header class="flex items-center gap-2 px-4 py-3">
        <Glyph class="size-5" />
        <h1 class="m-0 text-sm font-semibold">{SERVER_NAME}</h1>
        {isDefaultServer(SERVER) ? (
          <span class="rounded border border-solid border-zinc-200 px-1.5 font-mono text-[11px] text-zinc-600">extension</span>
        ) : (
          <span title="A build for a development server" class="rounded bg-amber-100 px-1.5 font-mono text-[11px] font-semibold text-amber-800">
            dev
          </span>
        )}
        <button
          type="button"
          onClick={() => setView('settings')}
          aria-label="Settings"
          title="Settings"
          class="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" />
            <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4" />
          </svg>
        </button>
      </header>

      {user && <PopupProfile user={user} onDisconnect={() => void run(() => ask({ type: 'sign-out' }))} />}

      {user === null && signIn.status === 'idle' && <PopupWelcome developers={DEVELOPERS} onJoin={() => void run(() => ask({ type: 'sign-in' }))} />}

      {user === null && signIn.status !== 'idle' && (
        <PopupSignIn
          state={signIn}
          server={SERVER_NAME}
          onCancel={() => void run(() => ask({ type: 'sign-in:cancel' }))}
          onRetry={() => void run(() => ask({ type: 'sign-in' }))}
          onAllow={() =>
            void run(async () => {
              if (await browser.permissions.request({ permissions: ['webNavigation'] })) await ask({ type: 'sign-in:loopback' });
            })
          }
        />
      )}

      <div class="flex flex-col gap-3 px-4 pb-4 empty:hidden">
        {!hostAccess && (
          <section class="flex flex-col items-start gap-2">
            <p class="m-0 text-zinc-600">The extension needs access to github.com and {SERVER_NAME} to work.</p>
            <button type="button" class={primary} onClick={() => run(async () => setHostAccess(await browser.permissions.request({ origins: ORIGINS })))}>
              Allow access
            </button>
          </section>
        )}

        {user === undefined && <Loader label="Checking your session…" />}

        {error && <p class="m-0 text-red-700">{error}</p>}
      </div>
    </main>
  );
}
