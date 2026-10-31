import type { CommitImage } from '@devnull-github/client';
import { useEffect, useState } from 'preact/hooks';
import { ask } from '../lib/messages.ts';

/**
 * A commit's images, laid out as dev-null.sh does (CommitImages): one at its own ratio, two side by side, three as one
 * tall image beside two. Each opens the commit on /dev/null, where its photo viewer is.
 */
export function CommitImages({ images, hash, link }: { images: CommitImage[]; hash: string; link: string | null }) {
  if (images.length === 0) return null;

  const single = images.length === 1;

  return (
    <div
      class={`mt-3 grid gap-0.5 overflow-hidden rounded-lg border border-border ${single ? '' : 'h-72 grid-cols-2'} ${images.length === 3 ? 'grid-rows-2' : ''}`}
    >
      {images.map((image, index) => {
        const cell = `block min-h-0 bg-canvas-muted ${images.length === 3 && index === 0 ? 'row-span-2' : ''}`;
        const content = <Image image={image} hash={hash} alt={alt(image, index, images.length)} single={single} />;

        return link ? (
          <a key={image.id} href={link} target="_blank" rel="noopener" class={cell}>
            {content}
          </a>
        ) : (
          <div key={image.id} class={cell}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function alt(image: CommitImage, index: number, count: number): string {
  if (image.description) return image.description;
  return count === 1 ? 'Attached image' : `Attached image ${index + 1} of ${count}`;
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
