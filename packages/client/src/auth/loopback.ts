import type { DevNullClient } from '../client.ts';
import { randomBytes, toBase64Url } from '../encoding.ts';
import { ApiError } from '../errors.ts';
import type { CurrentUser } from '../types.ts';
import { SignInDenied, SignInExpired } from './device-grant.ts';
import { challengeFor, createVerifier } from './pkce.ts';

/**
 * Signing in the way the apps do today, before the device grant: /mobile/authorize with PKCE, answered on a loopback
 * redirect (RFC 8252, section 7.3), which /dev/null accepts as `http://127.0.0.1:<port>`. Nothing has to listen on
 * the port: the caller catches the navigation and reads the code from its URL.
 */

export interface LoopbackSignIn {
  /** The page the user approves the key on. */
  authorizeUrl: string;
  /** Navigations to URLs starting with this carry the answer. */
  redirectUri: string;
  state: string;
  verifier: string;
}

export function randomLoopbackPort(): number {
  // The dynamic range, so nothing well-known is likely to be listening.
  return 49152 + Math.floor(Math.random() * (65535 - 49152));
}

export async function prepareLoopbackSignIn(
  client: DevNullClient,
  fingerprint: string,
  deviceName: string,
  port: number = randomLoopbackPort(),
): Promise<LoopbackSignIn> {
  const verifier = createVerifier();
  const state = toBase64Url(randomBytes(16));
  const redirectUri = `http://127.0.0.1:${port}/dev-null-ext/callback`;

  const url = new URL(`${client.baseUrl}/mobile/authorize`);
  url.search = new URLSearchParams({
    fingerprint,
    device_name: deviceName,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
    state,
    redirect_uri: redirectUri,
  }).toString();

  return { authorizeUrl: url.toString(), redirectUri, state, verifier };
}

/** The code from the redirect, once checked against the state. */
export function readLoopbackAnswer(signIn: LoopbackSignIn, redirectedTo: string): string {
  const url = new URL(redirectedTo);
  if (url.searchParams.get('state') !== signIn.state) throw new Error('The sign-in answer does not match this sign-in.');
  if (url.searchParams.get('error') === 'access_denied') throw new SignInDenied();

  const code = url.searchParams.get('code');
  if (!code) throw new Error('The sign-in answer has no code.');

  return code;
}

export async function redeemLoopbackCode(client: DevNullClient, signIn: LoopbackSignIn, code: string): Promise<CurrentUser> {
  try {
    const { data } = await client.request<{ data: CurrentUser }>('POST', '/api/v1/devices', {
      body: { code, code_verifier: signIn.verifier },
      signed: true,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'invalid_grant') throw new SignInExpired();
    throw error;
  }
}
