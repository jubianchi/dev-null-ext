import type { LinkPreview as Preview } from '@devnull-github/client';

/** The image hosts github.com's CSP allows (img-src), which GitHub's own link previews use. */
const ALLOWED_IMAGE_HOST = /(^|\.)(githubusercontent\.com|githubassets\.com)$/;

/**
 * The card of a commit's first link, as dev-null.sh draws it (LinkPreview): its image, its site, title and
 * description. The image only shows when github.com's CSP lets this page load it; nothing shows while /dev/null is
 * still fetching the preview, or when the page has no title.
 */
export function LinkPreview({ preview, interactive }: { preview: Preview; interactive: boolean }) {
  if (preview.is_pending || !preview.title) return null;

  const url = new URL(preview.url);
  const image = preview.image_url && ALLOWED_IMAGE_HOST.test(new URL(preview.image_url).hostname) ? preview.image_url : null;
  const card = 'mt-3 flex items-center overflow-hidden rounded-lg border border-border text-fg';

  const content = (
    <>
      {image && <img src={image} alt="" referrerPolicy="no-referrer" class="size-20 shrink-0 object-contain" loading="lazy" />}
      <span class="min-w-0 px-3 py-2">
        <span class="block font-mono text-[13px] text-fg-muted">{preview.site_name ?? url.hostname.replace(/^www\./, '')}</span>
        <span class="line-clamp-2 block text-[15px] font-medium">{preview.title}</span>
        {preview.description && <span class="line-clamp-2 block text-sm text-fg-muted">{preview.description}</span>}
      </span>
    </>
  );

  return interactive ? (
    <a href={preview.url} target="_blank" rel="noopener noreferrer nofollow ugc" class={`${card} hover:bg-canvas-muted`}>
      {content}
    </a>
  ) : (
    <div class={card}>{content}</div>
  );
}
