// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { organizationTabLink } from '../src/components/OrganizationTab.tsx';

describe('organizationTabLink', () => {
  const link = organizationTabLink({ href: '#dev-null', className: 'prc-components-UnderlineItem-7fP-n' });

  it('links to the tab with its neighbours classes', () => {
    expect(link.getAttribute('href')).toBe('#dev-null');
    expect(link.className).toBe('prc-components-UnderlineItem-7fP-n');
    expect(link.hasAttribute('data-devnull-tab')).toBe(true);
  });

  it('shows the /dev/null glyph before its label, like GitHub tabs show an octicon', () => {
    const [icon, text] = link.children;

    expect(icon?.getAttribute('data-component')).toBe('icon');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('16');
    expect(text?.textContent).toBe('/dev/null');
  });

  it('colours the glyph without the extension stylesheet, which GitHub pages do not load', () => {
    const accent = link.querySelector<SVGPathElement>('svg path:last-child');

    expect(accent?.getAttribute('style')).toContain('#d9480f');
  });
});
