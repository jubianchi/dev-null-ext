const GAP = 4;
const MARGIN = 8;

/**
 * Where a menu shown in the top layer goes, fixed to the viewport: above its button when there is room (a toolbar sits
 * at a composer's bottom), below it otherwise, aligned on its left edge and kept within the viewport. A picker in the
 * middle of a composer prefers below, as a dropdown does. Fitting on neither side, it stays within the viewport, over
 * its button: fixed, no scroll would bring it in.
 */
export function menuPosition(
  button: { top: number; bottom: number; left: number },
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
  prefer: 'above' | 'below' = 'above',
): { top: number; left: number } {
  const above = button.top - GAP - menu.height;
  const below = button.bottom + GAP;
  const fitsAbove = above >= MARGIN;
  const fitsBelow = below + menu.height <= viewport.height - MARGIN;
  const first = prefer === 'below' ? { fits: fitsBelow, top: below } : { fits: fitsAbove, top: above };
  const second = prefer === 'below' ? { fits: fitsAbove, top: above } : { fits: fitsBelow, top: below };
  const top = first.fits ? first.top : second.fits ? second.top : Math.max(MARGIN, viewport.height - MARGIN - menu.height);
  const left = Math.min(Math.max(button.left, MARGIN), viewport.width - MARGIN - menu.width);

  return { top, left };
}
