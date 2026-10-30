import { randomBytes, toHex } from './encoding.ts';
import type { Signer } from './signer.ts';
import { signSsh } from './sshsig.ts';

/** The namespace /dev/null verifies JSON requests under (App\Services\SignedRequests::Namespace). */
export const API_NAMESPACE = 'devnull-api';

export interface SignableRequest {
  method: string;
  /** Path and query exactly as sent, e.g. `/api/v1/organizations/laravel/mentions?cursor=abc`. */
  pathAndQuery: string;
  /** The exact JSON text sent as the body, or '' when there is none. */
  body: string;
}

/**
 * The message the server rebuilds and verifies: "<unix timestamp>\n<nonce>\n<METHOD>\n<path and query>\n<body>".
 */
export function signedMessage(request: SignableRequest, timestamp: string, nonce: string): string {
  return [timestamp, nonce, request.method.toUpperCase(), request.pathAndQuery, request.body].join('\n');
}

/** A nonce as the server wants it: 32 lowercase hex characters, used once. */
export function createNonce(): string {
  return toHex(randomBytes(16));
}

export async function signatureHeaders(
  signer: Signer,
  request: SignableRequest,
  now: number,
  nonce: string = createNonce(),
): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(now / 1000));
  const signature = await signSsh(signer, signedMessage(request, timestamp, nonce), API_NAMESPACE);

  return {
    'X-Devnull-Timestamp': timestamp,
    'X-Devnull-Nonce': nonce,
    'X-SSH-Signature': signature.base64,
  };
}
