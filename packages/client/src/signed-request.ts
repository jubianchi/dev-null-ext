import { randomBytes, toHex } from './encoding.ts';
import type { Signer } from './signer.ts';
import { signSsh } from './sshsig.ts';

/** The namespace /dev/null verifies JSON requests under (App\Services\SignedRequests::Namespace). */
export const API_NAMESPACE = 'devnull-api';

/** The namespace /dev/null verifies requests with files under (App\Services\SignedRequests::ImagesNamespace). */
export const IMAGES_NAMESPACE = 'devnull-api-images';

export interface SignableRequest {
  method: string;
  /** Path and query exactly as sent, e.g. `/api/v1/organizations/laravel/mentions?cursor=abc`. */
  pathAndQuery: string;
  /** The exact JSON text sent as the body, or as the `payload` part of a multipart request; '' when there is none. */
  body: string;
  /** For a multipart request: each file's SHA-256, lowercase hex, joined with "," in the order of the parts. */
  hashes?: string;
}

/**
 * The message the server rebuilds and verifies: "<unix timestamp>\n<nonce>\n<METHOD>\n<path and query>\n<body>", with
 * the files' hashes on a line of their own before the body for a multipart request.
 */
export function signedMessage(request: SignableRequest, timestamp: string, nonce: string): string {
  const lines = [timestamp, nonce, request.method.toUpperCase(), request.pathAndQuery];
  if (request.hashes !== undefined) lines.push(request.hashes);

  return [...lines, request.body].join('\n');
}

/** A nonce as the server wants it: 32 lowercase hex characters, used once. */
export function createNonce(): string {
  return toHex(randomBytes(16));
}

export async function signatureHeaders(signer: Signer, request: SignableRequest, now: number, nonce: string = createNonce()): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(now / 1000));
  const namespace = request.hashes === undefined ? API_NAMESPACE : IMAGES_NAMESPACE;
  const signature = await signSsh(signer, signedMessage(request, timestamp, nonce), namespace);

  return {
    'X-Devnull-Timestamp': timestamp,
    'X-Devnull-Nonce': nonce,
    'X-SSH-Signature': signature.base64,
  };
}
