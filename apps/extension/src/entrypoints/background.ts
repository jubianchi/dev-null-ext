import {
  ApiError,
  type Clock,
  type CurrentUser,
  createWebCryptoSigner,
  DeviceGrantUnavailable,
  DevNullClient,
  pollDeviceAuthorization,
  prepareLoopbackSignIn,
  readLoopbackAnswer,
  redeemLoopbackCode,
  SignInDenied,
  SignInExpired,
  startDeviceAuthorization,
  systemClock,
} from '@devnull-github/client';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { storage } from 'wxt/utils/storage';
import { fetchImageAsDataUrl } from '../lib/image-proxy.ts';
import { fromTransfer } from '../lib/images.ts';
import { deleteKey, loadKey, loadOrCreateKey } from '../lib/keystore.ts';
import type { ErrorPayload, OwnerType, Request, Responses, SignInState } from '../lib/messages.ts';

const userItem = storage.defineItem<CurrentUser | null>('local:user', { fallback: null });
const signInItem = storage.defineItem<SignInState>('local:signIn', { fallback: { status: 'idle' } });
const ownerTypesItem = storage.defineItem<Record<string, Exclude<OwnerType, null>>>('local:ownerTypes', { fallback: {} });

/** How the device shows on /dev/null's Devices page. */
async function deviceName(): Promise<string> {
  const { os } = await browser.runtime.getPlatformInfo();
  const browserName = import.meta.env.FIREFOX ? 'Firefox' : 'Chrome';
  return `GitHub extension (${browserName}, ${os})`;
}

/**
 * Sleeps through extension API calls, which keep a Chrome service worker alive while a sign-in waits for the user.
 * Timers alone don't: an idle worker is stopped after 30 seconds.
 */
const keepAliveClock: Clock = {
  now: () => systemClock.now(),
  async sleep(milliseconds, signal) {
    const end = Date.now() + milliseconds;
    while (Date.now() < end) {
      await browser.runtime.getPlatformInfo();
      await systemClock.sleep(Math.min(10_000, end - Date.now()), signal);
    }
  },
};

async function client(options: { signed: boolean }): Promise<DevNullClient> {
  if (!options.signed) return new DevNullClient();

  const key = await loadKey();
  if (!key) throw new ApiError(401, 'signed_out', 'Connect /dev/null first, from the extension button.');

  return new DevNullClient({ signer: await createWebCryptoSigner(key) });
}

/** Signed when signed in, as a guest otherwise. */
async function readingClient(): Promise<DevNullClient> {
  return client({ signed: (await userItem.getValue()) !== null });
}

let signInAbort: AbortController | null = null;

async function startSignIn(): Promise<SignInState> {
  signInAbort?.abort();
  signInAbort = new AbortController();
  const { signal } = signInAbort;

  const signed = new DevNullClient({ signer: await createWebCryptoSigner(await loadOrCreateKey()) });

  try {
    const authorization = await startDeviceAuthorization(signed, await deviceName());
    const tab = await browser.tabs.create({ url: authorization.verification_uri_complete });
    const state: SignInState = {
      status: 'waiting',
      flow: 'device-grant',
      userCode: authorization.user_code,
      verificationUri: authorization.verification_uri_complete,
    };
    await signInItem.setValue(state);

    void pollDeviceAuthorization(signed, authorization, keepAliveClock, signal)
      .then((user) => signedIn(user, tab.id))
      .catch((error: unknown) => signInFailed(error, signal));

    return state;
  } catch (error) {
    if (!(error instanceof DeviceGrantUnavailable)) throw error;
  }

  if (!(await browser.permissions.contains({ permissions: ['webNavigation'] }))) {
    const state: SignInState = { status: 'needs-permission' };
    await signInItem.setValue(state);
    return state;
  }

  return startLoopbackSignIn();
}

/**
 * The fallback before dev-null-sh/dev-null.sh#585: approve on /mobile/authorize, which answers on a loopback URL. Nothing
 * listens there; the navigation is caught before it leaves the browser, and its tab closed.
 */
async function startLoopbackSignIn(): Promise<SignInState> {
  signInAbort?.abort();
  signInAbort = new AbortController();
  const { signal } = signInAbort;

  const key = await createWebCryptoSigner(await loadOrCreateKey());
  const signed = new DevNullClient({ signer: key });
  const loopback = await prepareLoopbackSignIn(signed, key.fingerprint, await deviceName());
  const redirect = new URL(loopback.redirectUri);

  const answer = new Promise<{ url: string; tabId: number }>((resolve, reject) => {
    const filter = { url: [{ hostEquals: '127.0.0.1', ports: [Number(redirect.port)], pathPrefix: redirect.pathname }] };
    const listener = (details: { url: string; tabId: number }) => {
      browser.webNavigation.onBeforeNavigate.removeListener(listener);
      clearInterval(keepAlive);
      resolve(details);
    };
    const keepAlive = setInterval(() => void browser.runtime.getPlatformInfo(), 20_000);

    browser.webNavigation.onBeforeNavigate.addListener(listener, filter);
    signal.addEventListener('abort', () => {
      browser.webNavigation.onBeforeNavigate.removeListener(listener);
      clearInterval(keepAlive);
      reject(signal.reason);
    });
  });

  await browser.tabs.create({ url: loopback.authorizeUrl });
  const state: SignInState = { status: 'waiting', flow: 'loopback' };
  await signInItem.setValue(state);

  void answer
    .then(async ({ url, tabId }) => signedIn(await redeemLoopbackCode(signed, loopback, readLoopbackAnswer(loopback, url)), tabId))
    .catch((error: unknown) => signInFailed(error, signal));

  return state;
}

async function signedIn(user: CurrentUser, tabId: number | undefined): Promise<void> {
  await userItem.setValue(user);
  await signInItem.setValue({ status: 'idle' });
  if (tabId !== undefined) await browser.tabs.remove(tabId).catch(() => undefined);
}

async function signInFailed(error: unknown, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  const message =
    error instanceof SignInDenied
      ? 'The sign-in was denied on /dev/null.'
      : error instanceof SignInExpired
        ? 'The sign-in expired. Start again.'
        : error instanceof Error
          ? error.message
          : String(error);
  await signInItem.setValue({ status: 'failed', message });
}

async function cancelSignIn(): Promise<SignInState> {
  signInAbort?.abort();
  signInAbort = null;
  const state: SignInState = { status: 'idle' };
  await signInItem.setValue(state);
  return state;
}

/** Revokes this device on /dev/null when it still can, then forgets the key either way. */
async function signOut(): Promise<null> {
  try {
    const signed = await client({ signed: true });
    const fingerprint = signed.signer?.fingerprint;
    const device = (await signed.devices()).find((candidate) => candidate.fingerprint === fingerprint);
    if (device) await signed.revokeDevice(device.id);
  } catch {
    // Offline, or already revoked on the web: forgetting the key locally is what matters.
  }

  await deleteKey();
  await userItem.setValue(null);
  await signInItem.setValue({ status: 'idle' });
  return null;
}

/** The cached user, refreshed in the background. A device revoked on the web signs the extension out. */
async function session(): Promise<CurrentUser | null> {
  const user = await userItem.getValue();
  if (!user || !(await loadKey())) return null;

  void client({ signed: true })
    .then((signed) => signed.me())
    .then((fresh) => userItem.setValue(fresh))
    .catch(async (error: unknown) => {
      if (error instanceof ApiError && (error.code === 'device_not_approved' || error.code === 'invalid_signature')) {
        await deleteKey();
        await userItem.setValue(null);
      }
    });

  return user;
}

/** Whether a GitHub login is an organization, from GitHub's public API, remembered for good. */
async function ownerType(login: string): Promise<OwnerType> {
  const key = login.toLowerCase();
  const known = await ownerTypesItem.getValue();
  if (known[key]) return known[key];

  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: { Accept: 'application/vnd.github+json' },
    credentials: 'omit',
  });
  if (!response.ok) return null;

  const { type } = (await response.json()) as { type?: string };
  if (type !== 'Organization' && type !== 'User') return null;

  await ownerTypesItem.setValue({ ...(await ownerTypesItem.getValue()), [key]: type });
  return type;
}

async function handle(request: Request): Promise<Responses[Request['type']]> {
  switch (request.type) {
    case 'session':
      return session();
    case 'mentions':
      return (await readingClient()).organizationMentions(request.organization, request.cursor);
    case 'commit':
      return (await client({ signed: true })).createCommit({ body: request.body }, (request.images ?? []).map(fromTransfer));
    case 'preview':
      return (await client({ signed: true })).previewCommit(request.body);
    case 'mention-suggestions':
      return (await client({ signed: true })).mentionSuggestions(request.query);
    case 'image':
      return fetchImageAsDataUrl(request.url);
    case 'replies':
      return (await client({ signed: true })).commitReplies(request.commitId, { cursor: request.cursor, newest: true });
    case 'star': {
      const signed = await client({ signed: true });
      await (request.starred ? signed.star(request.commitId) : signed.unstar(request.commitId));
      return null;
    }
    case 'owner-type':
      return ownerType(request.login);
    case 'sign-in':
      return startSignIn();
    case 'sign-in:loopback':
      return startLoopbackSignIn();
    case 'sign-in:cancel':
      return cancelSignIn();
    case 'sign-out':
      return signOut();
  }
}

function toPayload(error: unknown): ErrorPayload {
  if (error instanceof ApiError) return { message: error.message, status: error.status, code: error.code };
  return { message: error instanceof Error ? error.message : String(error) };
}

export default defineBackground(() => {
  // sendResponse and `return true` rather than a returned promise: the one form every supported browser honours.
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    handle(message as Request).then(
      (data) => sendResponse({ ok: true, data }),
      (error: unknown) => sendResponse({ ok: false, error: toPayload(error) }),
    );
    return true;
  });
});
