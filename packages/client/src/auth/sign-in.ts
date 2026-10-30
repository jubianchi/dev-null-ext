import { type Clock, systemClock } from '../clock.ts';
import type { DevNullClient } from '../client.ts';
import type { CurrentUser } from '../types.ts';
import { DeviceGrantUnavailable, pollDeviceAuthorization, startDeviceAuthorization } from './device-grant.ts';
import { prepareLoopbackSignIn, readLoopbackAnswer, redeemLoopbackCode } from './loopback.ts';

/** What the platform does for a sign-in: everything that needs a browser, a window or a person. */
export interface SignInHost {
  deviceName: string;
  /** Shows the user code, then opens the page to approve it (device grant). */
  presentUserCode(userCode: string, verificationUriComplete: string): void | Promise<void>;
  /** Opens the approval page and resolves with the URL the browser was sent back to (loopback fallback). */
  openAndCatchRedirect(authorizeUrl: string, redirectUri: string, signal?: AbortSignal): Promise<string>;
  clock?: Clock;
  signal?: AbortSignal;
}

export type SignInFlow = 'device-grant' | 'loopback';

/**
 * Approves the client's key as a device of the user, with the device grant when the server has it and the loopback
 * redirect otherwise.
 */
export async function signIn(client: DevNullClient, host: SignInHost): Promise<{ user: CurrentUser; flow: SignInFlow }> {
  if (!client.signer) throw new Error('Signing in needs a key to approve.');

  const clock = host.clock ?? systemClock;

  try {
    const authorization = await startDeviceAuthorization(client, host.deviceName);
    await host.presentUserCode(authorization.user_code, authorization.verification_uri_complete);

    return { user: await pollDeviceAuthorization(client, authorization, clock, host.signal), flow: 'device-grant' };
  } catch (error) {
    if (!(error instanceof DeviceGrantUnavailable)) throw error;
  }

  const loopback = await prepareLoopbackSignIn(client, client.signer.fingerprint, host.deviceName);
  const redirectedTo = await host.openAndCatchRedirect(loopback.authorizeUrl, loopback.redirectUri, host.signal);

  return { user: await redeemLoopbackCode(client, loopback, readLoopbackAnswer(loopback, redirectedTo)), flow: 'loopback' };
}
