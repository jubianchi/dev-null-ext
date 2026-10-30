import { buffer, concat, sshString, toBase64 } from './encoding.ts';

export const ED25519 = { name: 'Ed25519' } as const;

const KEY_TYPE = 'ssh-ed25519';

/**
 * A new device key. The private half is not extractable: it can sign, and it can be kept in IndexedDB as a
 * CryptoKey, but its bytes never reach JavaScript.
 */
export async function generateDeviceKey(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey(ED25519, false, ['sign', 'verify'])) as CryptoKeyPair;
}

export async function exportRawPublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
}

/** The public key in SSH wire format, as it appears inside an SSHSIG blob. */
export function publicKeyBlob(rawPublicKey: Uint8Array): Uint8Array {
  return concat(sshString(KEY_TYPE), sshString(rawPublicKey));
}

/** The `authorized_keys` line of the key, e.g. to show the user. */
export function openSshPublicKey(rawPublicKey: Uint8Array, comment = ''): string {
  return `${KEY_TYPE} ${toBase64(publicKeyBlob(rawPublicKey))}${comment ? ` ${comment}` : ''}`;
}

/** The OpenSSH fingerprint `SHA256:<43 base64 chars>`, which /dev/null uses to identify a device. */
export async function fingerprint(blob: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(blob)));
  return `SHA256:${toBase64(digest).replace(/=+$/, '')}`;
}
