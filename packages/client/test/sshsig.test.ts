import { describe, expect, it } from 'vitest';
import { buffer, fromBase64, utf8 } from '../src/encoding.ts';
import { ED25519, generateDeviceKey, openSshPublicKey } from '../src/keys.ts';
import { createWebCryptoSigner } from '../src/signer.ts';
import { signSsh } from '../src/sshsig.ts';
import { fixture, fixtureSigner, fromBase64Url } from './helpers.ts';

describe('signSsh', () => {
  it('produces byte for byte the signature ssh-keygen -Y sign produced for the same key and message', async () => {
    const signature = await signSsh(await fixtureSigner(), fixture.message, fixture.namespace);

    expect(signature.base64).toBe(fixture.signatureBase64);
    expect(signature.armored).toBe(fixture.signatureArmored);
  });

  it('computes the OpenSSH fingerprint and public key line of the key', async () => {
    const signer = await fixtureSigner();

    expect(signer.fingerprint).toBe(fixture.fingerprint);
    expect(openSshPublicKey(fromBase64Url(fixture.publicRawBase64Url), 'devnull-github test key')).toBe(fixture.publicKey);
  });

  it('signs with a fresh non-extractable WebCrypto key, which verifies', async () => {
    const keyPair = await generateDeviceKey();
    expect(keyPair.privateKey.extractable).toBe(false);

    const signer = await createWebCryptoSigner(keyPair);
    const { blob } = await signSsh(signer, 'hello', 'devnull-api');

    // The last field of the blob is string("ssh-ed25519") + string(<64-byte signature>).
    const raw = blob.slice(blob.length - 64);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-512', buffer(utf8('hello'))));
    const { concat, sshString } = await import('../src/encoding.ts');
    const signedData = concat(utf8('SSHSIG'), sshString('devnull-api'), sshString(''), sshString('sha512'), sshString(hash));

    expect(await crypto.subtle.verify(ED25519, keyPair.publicKey, buffer(raw), buffer(signedData))).toBe(true);
    expect(signer.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);
  });

  it('keeps the armored body equal to the one-line base64', async () => {
    const signature = await signSsh(await fixtureSigner(), 'x', 'devnull-api');
    const body = signature.armored.split('\n').slice(1, -1).join('');

    expect(body).toBe(signature.base64);
    expect(fromBase64(body)).toEqual(signature.blob);
  });
});
