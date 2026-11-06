/** What a page tells of itself for its link card, as /dev/null unfurls it. */
export interface PageMeta {
  title: string | null;
  description: string | null;
  /** An http(s) URL, resolved against the page. */
  image: string | null;
  siteName: string | null;
}

/**
 * Reads the page's card from its `<meta>` tags: Open Graph first, then Twitter's and the plain description. It runs in
 * the page, injected with `scripting.executeScript`, so it MUST stay self-contained: no import, no outer helper.
 */
export function readPageMeta(): PageMeta {
  const content = (...names: string[]) => {
    for (const name of names) {
      const value = document.querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)?.content.trim();
      if (value) return value;
    }
    return null;
  };
  const image = content('og:image', 'og:image:url', 'twitter:image');
  let resolved: string | null = null;
  if (image) {
    try {
      const url = new URL(image, location.href);
      resolved = url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      resolved = null;
    }
  }

  return {
    title: content('og:title', 'twitter:title') ?? (document.title.trim() || null),
    description: content('og:description', 'twitter:description', 'description'),
    image: resolved,
    siteName: content('og:site_name'),
  };
}
