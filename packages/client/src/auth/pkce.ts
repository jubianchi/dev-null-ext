import { buffer, randomBytes, toBase64Url, utf8 } from '../encoding.ts';

/** A PKCE verifier (RFC 7636): 32 random bytes, 43 base64url characters. */
export function createVerifier(): string {
  return toBase64Url(randomBytes(32));
}

/** The S256 challenge of a verifier: base64url(sha256(verifier)), unpadded. */
export async function challengeFor(verifier: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(utf8(verifier)))));
}
