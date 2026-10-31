import type { NewCommitImage } from '@devnull-github/client';

/** What /dev/null takes (App\Actions\CreateCommitImages): 3 images, JPEG, PNG or WebP, 10 MB each. */
export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Why an image can't be attached, given how many already are, or null when it can. /dev/null checks again by content. */
export function imageProblem(file: File, attached: number): string | null {
  if (attached >= MAX_IMAGES) return `A commit can have ${MAX_IMAGES} images at most.`;
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return `${file.name}: only JPEG, PNG and WebP images can be attached.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: an image can weigh 10 MB at most.`;
  return null;
}

/** An image as a JSON message carries it to the background: its bytes in base64. */
export interface TransferredImage {
  data: string;
  type: string;
  description: string | null;
}

export async function toTransfer(file: File, description: string): Promise<TransferredImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));

  return { data: btoa(binary), type: file.type, description: description.trim() || null };
}

export function fromTransfer(image: TransferredImage): NewCommitImage {
  const binary = atob(image.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  return { bytes, type: image.type, description: image.description };
}
