import type { CommitImage } from '@devnull-github/client';
import type { ComponentChild } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';
import type { AttachedImage } from '../lib/use-commit-draft.ts';

interface Cell {
  key: string;
  /** The image in its cell, knowing whether it is the only one, which keeps its own ratio. */
  content: (single: boolean) => ComponentChild;
}

/**
 * Images laid out as dev-null.sh lays out a commit's (CommitImages): one at its own ratio, two side by side, three as
 * one tall image beside two. Each opens the link, when there is one.
 */
export function ImageGrid({ cells, link }: { cells: Cell[]; link: string | null }) {
  if (cells.length === 0) return null;

  const single = cells.length === 1;

  return (
    <div
      class={`mt-3 grid gap-0.5 overflow-hidden rounded-lg border border-border ${single ? '' : 'h-72 grid-cols-2'} ${cells.length === 3 ? 'grid-rows-2' : ''}`}
    >
      {cells.map((cell, index) => {
        const classes = `block min-h-0 bg-canvas-muted ${cells.length === 3 && index === 0 ? 'row-span-2' : ''}`;

        return link ? (
          <a key={cell.key} href={link} target="_blank" rel="noopener" class={classes}>
            {cell.content(single)}
          </a>
        ) : (
          <div key={cell.key} class={classes}>
            {cell.content(single)}
          </div>
        );
      })}
    </div>
  );
}

/** An image's alt text: its description, or its place among the others, as dev-null.sh words it. */
export function imageAlt(description: string | null, index: number, count: number): string {
  if (description?.trim()) return description.trim();
  return count === 1 ? 'Attached image' : `Attached image ${index + 1} of ${count}`;
}

/** A commit's images, fetched through the background, which github.com's CSP requires. */
export function CommitImages({ images, hash, link }: { images: CommitImage[]; hash: string; link: string | null }) {
  return (
    <ImageGrid
      link={link}
      cells={images.map((image, index) => ({
        key: image.id,
        content: (single) => <Image image={image} hash={hash} alt={imageAlt(image.description, index, images.length)} single={single} />,
      }))}
    />
  );
}

/** The images attached to a draft, as the commit will show them once published. */
export function AttachedImagesPreview({ images }: { images: AttachedImage[] }) {
  return (
    <ImageGrid
      link={null}
      cells={images.map((image, index) => ({
        key: image.id,
        content: (single) => <LocalImage url={image.url} alt={imageAlt(image.description, index, images.length)} single={single} />,
      }))}
    />
  );
}

/** A local image, whose size is only known once loaded: a portrait one is shown whole in a grid cell. */
function LocalImage({ url, alt, single }: { url: string; alt: string; single: boolean }) {
  const [portrait, setPortrait] = useState(false);

  return (
    <img
      src={url}
      alt={alt}
      decoding="async"
      onLoad={(event) => setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)}
      class={single ? 'block max-h-[32rem] w-full object-contain' : `block h-full w-full ${portrait ? 'object-contain' : 'object-cover'}`}
    />
  );
}

function Image({ image, hash, alt, single }: { image: CommitImage; hash: string; alt: string; single: boolean }) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    ask({ type: 'image', url: image.url }).then(
      (data) => current && setSource(data),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [image.url]);

  const portrait = image.height > image.width;

  if (!source) {
    return (
      <span
        class="flex h-full w-full items-center justify-center font-mono text-xs text-fg-muted"
        style={single ? { aspectRatio: `${image.width} / ${image.height}`, maxHeight: '32rem' } : undefined}
      >
        {hash}
      </span>
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      width={image.width}
      height={image.height}
      decoding="async"
      class={single ? 'block max-h-[32rem] w-full object-contain' : `block h-full w-full ${portrait ? 'object-contain' : 'object-cover'}`}
    />
  );
}
