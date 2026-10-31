import { render } from 'preact';
import { Glyph } from './Glyph.tsx';

/**
 * The /dev/null tab's link, laid out like GitHub's own tabs: an icon then a label. It lives in GitHub's light DOM, so
 * it carries GitHub's classes and none of the extension's.
 */
export function organizationTabLink({ href, className }: { href: string; className: string }): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = href;
  link.className = className;
  link.dataset['devnullTab'] = '';

  render(
    <>
      <span data-component="icon">
        <Glyph class="octicon" />
      </span>
      <span data-component="text" data-content="/dev/null">
        /dev/null
      </span>
    </>,
    link,
  );

  return link;
}
