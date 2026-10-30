import { buffer } from './encoding.ts';
import { ED25519, exportRawPublicKey, fingerprint, publicKeyBlob } from './keys.ts';

/** Something that holds an Ed25519 key and signs bytes with it. */
export interface Signer {
  readonly publicKeyBlob: Uint8Array;
  readonly fingerprint: string;
  /** The raw 64-byte Ed25519 signature of the data. */
  sign(data: Uint8Array): Promise<Uint8Array>;
}

export async function createWebCryptoSigner(keyPair: CryptoKeyPair): Promise<Signer> {
  const blob = publicKeyBlob(await exportRawPublicKey(keyPair.publicKey));

  return {
    publicKeyBlob: blob,
    fingerprint: await fingerprint(blob),
    async sign(data) {
      return new Uint8Array(await crypto.subtle.sign(ED25519, keyPair.privateKey, buffer(data)));
    },
  };
}
