import { describe, expect, it } from 'vitest';
import { MAX_IMAGES, MAX_IMAGE_BYTES, fromTransfer, imageProblem, toTransfer } from '../src/lib/images.ts';

const file = (type: string, size = 10, name = 'shot') => new File([new Uint8Array(size)], name, { type });

describe('imageProblem', () => {
  it('takes JPEG, PNG and WebP images up to 10 MB, as /dev/null does', () => {
    expect(imageProblem(file('image/png'), 0)).toBeNull();
    expect(imageProblem(file('image/jpeg'), 1)).toBeNull();
    expect(imageProblem(file('image/webp'), 2)).toBeNull();
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it('says why it refuses an image', () => {
    expect(imageProblem(file('image/svg+xml'), 0)).toBe('shot: only JPEG, PNG and WebP images can be attached.');
    expect(imageProblem(file('image/gif'), 0)).toBe('shot: only JPEG, PNG and WebP images can be attached.');
    expect(imageProblem(file('image/png', MAX_IMAGE_BYTES + 1), 0)).toBe('shot: an image can weigh 10 MB at most.');
    expect(imageProblem(file('image/png'), MAX_IMAGES)).toBe('A commit can have 3 images at most.');
  });
});

describe('toTransfer and fromTransfer', () => {
  it('carry an image and its description through a JSON message, bytes intact', async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    const transferred = await toTransfer(new File([bytes], 'shot.png', { type: 'image/png' }), 'The popup');

    const message = JSON.parse(JSON.stringify(transferred));
    expect(fromTransfer(message)).toEqual({ bytes, type: 'image/png', description: 'The popup' });
  });

  it('sends an empty description as none', async () => {
    const transferred = await toTransfer(file('image/png'), '  ');

    expect(fromTransfer(transferred).description).toBeNull();
  });
});
