const GAP = 4;
const MARGIN = 8;

/**
 * Where a menu shown in the top layer goes, fixed to the viewport: above its button when there is room (a toolbar sits
 * at a composer's bottom), below it otherwise, aligned on its left edge and kept within the viewport.
 */
export function menuPosition(
  button: { top: number; bottom: number; left: number },
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const above = button.top - GAP - menu.height;
  const top = above >= MARGIN ? above : button.bottom + GAP;
  const left = Math.min(Math.max(button.left, MARGIN), viewport.width - MARGIN - menu.width);

  return { top, left };
}
