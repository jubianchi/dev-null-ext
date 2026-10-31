import type { DevNullClient } from '../client.ts';
import type { Clock } from '../clock.ts';
import { ApiError } from '../errors.ts';
import type { CurrentUser } from '../types.ts';

/**
 * Signing in with the device authorization grant (RFC 8628), dev-null-sh/dev-null.sh#585: the key asks for a code,
 * the user types or opens it on dev-null.sh, and the key polls until the user decides. No redirect to catch.
 */

export interface DeviceAuthorization {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  /** Seconds. */
  expires_in: number;
  /** Seconds between polls. */
  interval: number;
}

/** The server has no device grant (its start endpoint answers 404). */
export class DeviceGrantUnavailable extends Error {
  constructor() {
    super('This /dev/null server does not offer the device authorization grant.');
    this.name = 'DeviceGrantUnavailable';
  }
}

export class SignInDenied extends Error {
  constructor() {
    super('The sign-in was denied on /dev/null.');
    this.name = 'SignInDenied';
  }
}

export class SignInExpired extends Error {
  constructor() {
    super('The sign-in expired before it was approved.');
    this.name = 'SignInExpired';
  }
}

export async function startDeviceAuthorization(client: DevNullClient, deviceName: string): Promise<DeviceAuthorization> {
  try {
    return await client.request<DeviceAuthorization>('POST', '/api/v1/device-authorizations', {
      body: { device_name: deviceName },
      signed: true,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) throw new DeviceGrantUnavailable();
    throw error;
  }
}

export async function pollDeviceAuthorization(
  client: DevNullClient,
  authorization: DeviceAuthorization,
  clock: Clock,
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const deadline = clock.now() + authorization.expires_in * 1000;
  let interval = authorization.interval;

  while (clock.now() < deadline) {
    await clock.sleep(interval * 1000, signal);

    try {
      const { data } = await client.request<{ data: CurrentUser }>('POST', '/api/v1/devices', {
        body: { device_code: authorization.device_code },
        signed: true,
        ...(signal ? { signal } : {}),
      });
      return data;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      switch (error.code) {
        case 'authorization_pending':
          continue;
        case 'slow_down':
          interval = typeof error.data['interval'] === 'number' ? error.data['interval'] : interval + 5;
          continue;
        case 'access_denied':
          throw new SignInDenied();
        case 'invalid_grant':
          throw new SignInExpired();
        default:
          throw error;
      }
    }
  }

  throw new SignInExpired();
}
