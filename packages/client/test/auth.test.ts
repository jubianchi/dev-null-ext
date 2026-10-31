import { describe, expect, it } from 'vitest';
import { SignInDenied, SignInExpired } from '../src/auth/device-grant.ts';
import { prepareLoopbackSignIn, readLoopbackAnswer } from '../src/auth/loopback.ts';
import { challengeFor } from '../src/auth/pkce.ts';
import { type SignInHost, signIn } from '../src/auth/sign-in.ts';
import { DevNullClient } from '../src/client.ts';
import { fakeClock, fakeFetch, fixtureSigner } from './helpers.ts';

const user = { id: 'u1', handle: 'jubianchi', name: 'Julien', avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

const authorization = {
  device_code: 'device-code',
  user_code: 'WDJB-MJHT',
  verification_uri: 'https://dev-null.sh/activate',
  verification_uri_complete: 'https://dev-null.sh/activate?user_code=WDJB-MJHT',
  expires_in: 600,
  interval: 5,
};

function host(overrides: Partial<SignInHost> = {}): SignInHost & { shown: string[] } {
  const shown: string[] = [];
  return {
    shown,
    deviceName: 'GitHub extension (Firefox)',
    presentUserCode: (code) => void shown.push(code),
    openAndCatchRedirect: async () => {
      throw new Error('not expected');
    },
    ...overrides,
  };
}

describe('PKCE', () => {
  it('derives the RFC 7636 appendix B challenge', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('device grant', () => {
  it('shows the code, waits while pending, slows down when told, and returns the user', async () => {
    const fetch = fakeFetch([
      [201, authorization],
      [400, { code: 'authorization_pending', message: 'pending' }],
      [400, { code: 'slow_down', message: 'slow', interval: 10 }],
      [200, { data: user }],
    ]);
    const clock = fakeClock();
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock });
    const h = host({ clock });

    const result = await signIn(client, h);

    expect(result).toEqual({ user, flow: 'device-grant' });
    expect(h.shown).toEqual(['WDJB-MJHT']);
    expect(clock.slept).toEqual([5000, 5000, 10000]);
    expect(JSON.parse(fetch.requests[0]!.body)).toEqual({ device_name: 'GitHub extension (Firefox)' });
    expect(JSON.parse(fetch.requests[3]!.body)).toEqual({ device_code: 'device-code' });
  });

  it('stops when the user denies the sign-in', async () => {
    const fetch = fakeFetch([
      [201, authorization],
      [400, { code: 'access_denied', message: 'denied' }],
    ]);
    const clock = fakeClock();
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock });

    await expect(signIn(client, host({ clock }))).rejects.toBeInstanceOf(SignInDenied);
  });

  it('gives up once the code expired', async () => {
    const fetch = fakeFetch([
      [201, { ...authorization, expires_in: 10 }],
      [400, { code: 'authorization_pending', message: '' }],
      [400, { code: 'authorization_pending', message: '' }],
    ]);
    const clock = fakeClock();
    const client = new DevNullClient({ signer: await fixtureSigner(), fetch, clock });

    await expect(signIn(client, host({ clock }))).rejects.toBeInstanceOf(SignInExpired);
  });
});

describe('loopback fallback', () => {
  it('falls back to /mobile/authorize when the server has no device grant', async () => {
    const fetch = fakeFetch([
      [404, { message: 'Not Found' }],
      [200, { data: user }],
    ]);
    const signer = await fixtureSigner();
    const client = new DevNullClient({ signer, fetch, clock: fakeClock() });

    let opened = '';
    const result = await signIn(
      client,
      host({
        openAndCatchRedirect: async (authorizeUrl, redirectUri) => {
          opened = authorizeUrl;
          const state = new URL(authorizeUrl).searchParams.get('state');
          return `${redirectUri}?code=the-code&state=${state}`;
        },
      }),
    );

    const params = new URL(opened).searchParams;
    expect(new URL(opened).pathname).toBe('/mobile/authorize');
    expect(params.get('fingerprint')).toBe(signer.fingerprint);
    expect(params.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d{5}\/devnull-github\/callback$/);
    expect(params.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.flow).toBe('loopback');

    const redeem = JSON.parse(fetch.requests[1]!.body) as Record<string, string>;
    expect(redeem.code).toBe('the-code');
    expect(await challengeFor(redeem.code_verifier!)).toBe(params.get('code_challenge'));
  });

  it('refuses an answer for another sign-in', async () => {
    const signIn = await prepareLoopbackSignIn(new DevNullClient(), 'SHA256:x', 'test', 50000);

    expect(() => readLoopbackAnswer(signIn, `${signIn.redirectUri}?code=c&state=other`)).toThrow(/does not match/);
    expect(() => readLoopbackAnswer(signIn, `${signIn.redirectUri}?error=access_denied&state=${signIn.state}`)).toThrow(SignInDenied);
  });
});
