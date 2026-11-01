import { useState } from 'preact/hooks';

type Person = { handle: string; name?: string | null; avatar_url?: string | null };

/** As dev-null.sh's default avatar: the first letters of the name's first two words, or of the handle. */
export function initials({ handle, name }: Pick<Person, 'handle' | 'name'>): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [handle[0]];

  return letters.join('').toUpperCase();
}

/**
 * A person's picture, or their initials in a circle, as dev-null.sh does, when they have none or it doesn't load.
 * Decorative unless given an `alt`, for when nothing beside it names the person.
 */
export function Avatar({ person, size, alt = '', class: className = '' }: { person: Person; size: number; alt?: string; class?: string }) {
  const [broken, setBroken] = useState(false);
  const dimensions = { width: `${size}px`, height: `${size}px` };

  if (person.avatar_url && !broken) {
    return (
      <img
        src={person.avatar_url}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        class={`shrink-0 rounded-full ${className}`}
        style={dimensions}
      />
    );
  }

  return (
    <span
      data-avatar
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' })}
      class={`flex shrink-0 items-center justify-center rounded-full border border-border bg-canvas-muted font-mono leading-none text-fg-muted select-none ${className}`}
      style={{ ...dimensions, fontSize: `${Math.max(7, Math.round(size * 0.36))}px` }}
    >
      {initials(person)}
    </span>
  );
}
