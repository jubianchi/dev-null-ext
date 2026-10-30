import { buffer, concat, sshString, toBase64, uint32, utf8 } from './encoding.ts';
import type { Signer } from './signer.ts';

/**
 * Signatures in the format of `ssh-keygen -Y sign`, without ssh-keygen.
 *
 * @see https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.sshsig
 */

const MAGIC = utf8('SSHSIG');
const VERSION = 1;
const HASH_ALGORITHM = 'sha512';

export interface SshSignature {
  /** The binary SSHSIG blob. */
  readonly blob: Uint8Array;
  /** The blob in base64 on one line, which fits in an HTTP header. */
  readonly base64: string;
  /** The armored form ssh-keygen writes, wrapped at 70 columns. */
  readonly armored: string;
}

export async function signSsh(signer: Signer, message: Uint8Array | string, namespace: string): Promise<SshSignature> {
  const bytes = typeof message === 'string' ? utf8(message) : message;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-512', buffer(bytes)));

  const signedData = concat(MAGIC, sshString(namespace), sshString(''), sshString(HASH_ALGORITHM), sshString(hash));
  const signature = concat(sshString('ssh-ed25519'), sshString(await signer.sign(signedData)));

  const blob = concat(
    MAGIC,
    uint32(VERSION),
    sshString(signer.publicKeyBlob),
    sshString(namespace),
    sshString(''),
    sshString(HASH_ALGORITHM),
    sshString(signature),
  );
  const base64 = toBase64(blob);

  return {
    blob,
    base64,
    armored: ['-----BEGIN SSH SIGNATURE-----', ...(base64.match(/.{1,70}/g) ?? []), '-----END SSH SIGNATURE-----'].join('\n'),
  };
}
