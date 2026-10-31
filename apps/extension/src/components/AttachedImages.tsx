import type { Ref } from 'preact';
import { IMAGE_TYPES } from '../lib/images.ts';
import type { AttachedImage } from '../lib/use-commit-draft.ts';

/** The hidden file picker a composer's image button and footer open. */
export function ImagePicker({ picker, onFiles }: { picker: Ref<HTMLInputElement>; onFiles: (files: File[]) => void }) {
  return (
    <input
      ref={picker}
      type="file"
      accept={IMAGE_TYPES.join(',')}
      multiple
      class="hidden"
      onChange={(event) => {
        onFiles([...(event.currentTarget.files ?? [])]);
        event.currentTarget.value = '';
      }}
    />
  );
}

/** The files of a paste or a drop, when there are any: the composer takes them as images instead of text. */
export function filesOf(transfer: DataTransfer | null): File[] {
  return [...(transfer?.files ?? [])];
}

/**
 * The images attached to a commit, as dev-null.sh shows them in its composer: thumbnails, each with its description
 * (its alt text once published) and a way to remove it; then why some images were left out.
 */
export function AttachedImages({
  images,
  errors,
  onDescribe,
  onRemove,
}: {
  images: AttachedImage[];
  errors: string[];
  onDescribe: (id: string, description: string) => void;
  onRemove: (id: string) => void;
}) {
  if (images.length === 0 && errors.length === 0) return null;

  return (
    <div class="mt-2 space-y-2">
      {images.length > 0 && (
        <ul class="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {images.map((image) => (
            <li key={image.id} data-attached-image class="flex min-w-0 flex-col gap-1">
              <div class="relative aspect-square overflow-hidden rounded-md border border-solid border-border bg-canvas-muted">
                <img src={image.url} alt={image.file.name} class="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(image.id)}
                  aria-label={`Remove ${image.file.name}`}
                  class="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-black/60 text-white hover:bg-black/80"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                value={image.description}
                onInput={(event) => onDescribe(image.id, event.currentTarget.value)}
                aria-label={`Describe ${image.file.name}`}
                placeholder="Describe this image"
                maxLength={1000}
                class="w-full rounded border border-solid border-border bg-canvas px-1.5 py-1 text-xs text-fg placeholder:text-fg-muted focus:outline-2 focus:outline-fg-accent"
              />
            </li>
          ))}
        </ul>
      )}
      {errors.map((error) => (
        <p key={error} role="alert" class="m-0 text-xs text-fg-danger">
          {error}
        </p>
      ))}
    </div>
  );
}
