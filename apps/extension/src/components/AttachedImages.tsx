import type { Ref } from 'preact';
import { useState } from 'preact/hooks';
import { IMAGE_TYPES } from '../lib/images.ts';
import type { AttachedImage } from '../lib/use-commit-draft.ts';

/** /dev/null's limit on an image's description (CreateCommitImages::MAX_DESCRIPTION_LENGTH). */
const MAX_DESCRIPTION = 1000;

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
 * The images attached to a commit, as dev-null.sh's composer shows them: small thumbnails, each with a × to remove it
 * and an ALT badge ("+ALT" until described) that opens its description below, alt text once published; then why some
 * images were left out.
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
  const [editing, setEditing] = useState<string | null>(null);
  const edited = images.findIndex((image) => image.id === editing);
  const image = images[edited];

  if (images.length === 0 && errors.length === 0) return null;

  return (
    <div class="mt-2 space-y-2">
      {images.length > 0 && (
        <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
          {images.map((attached, index) => (
            <li key={attached.id} data-attached-image class="relative size-20 overflow-hidden rounded-lg border border-solid border-border bg-canvas-muted">
              <img src={attached.url} alt={attached.file.name} class="size-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (editing === attached.id) setEditing(null);
                  onRemove(attached.id);
                }}
                aria-label={`Remove image ${index + 1}`}
                class="absolute right-1 top-1 flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-black/70 text-xs text-white hover:bg-black/90"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => setEditing(editing === attached.id ? null : attached.id)}
                aria-label={`Describe image ${index + 1}`}
                aria-expanded={editing === attached.id}
                class="absolute bottom-1 left-1 cursor-pointer rounded border-0 bg-black/70 px-1 py-px text-[10px] font-bold text-white hover:bg-black/90"
              >
                {attached.description.trim() === '' ? '+ALT' : 'ALT'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {image && (
        <div data-image-description class="rounded-lg border border-solid border-border bg-canvas-muted p-3">
          <label class="block">
            <span class="mb-1 block text-xs text-fg-muted">Description of image {edited + 1}</span>
            <textarea
              value={image.description}
              onInput={(event) => onDescribe(image.id, event.currentTarget.value)}
              maxLength={MAX_DESCRIPTION}
              rows={2}
              placeholder="Describe the image for people who can't see it"
              class="block w-full resize-none border-0 bg-transparent p-0 text-sm text-fg [field-sizing:content] placeholder:text-fg-muted focus:outline-none"
            />
          </label>
          <div class="mt-2 flex items-center justify-end gap-3">
            <span class="font-mono text-xs text-fg-muted">
              {image.description.length}/{MAX_DESCRIPTION}
            </span>
            <button
              type="button"
              onClick={() => setEditing(null)}
              class="h-7 cursor-pointer rounded-md border border-solid border-button-border bg-button px-3 text-xs font-medium text-fg hover:bg-button-hover"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {errors.map((error) => (
        <p key={error} role="alert" class="m-0 text-xs text-fg-danger">
          {error}
        </p>
      ))}
    </div>
  );
}
