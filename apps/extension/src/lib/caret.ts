/** What lays text out in a textarea, copied onto a mirror to measure where a character falls. */
const LAYOUT = [
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const;

/**
 * Where a character of a textarea is on screen: a textarea can't say, so a hidden copy of it, laid out the same, holds
 * the text up to that character followed by a marker, whose position is the caret's.
 */
export function caretRect(textarea: HTMLTextAreaElement, position: number): { top: number; bottom: number; left: number } {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement('div');
  for (const property of LAYOUT) mirror.style[property] = style[property];
  Object.assign(mirror.style, { position: 'absolute', top: '0', left: '-9999px', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });

  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(position) || '.';
  mirror.append(marker);
  document.body.append(mirror);

  const box = textarea.getBoundingClientRect();
  const lineHeight = Number.parseFloat(style.lineHeight) || marker.offsetHeight;
  const top = box.top + Number.parseFloat(style.borderTopWidth) + marker.offsetTop - textarea.scrollTop;
  const left = box.left + Number.parseFloat(style.borderLeftWidth) + marker.offsetLeft - textarea.scrollLeft;
  mirror.remove();

  return { top, bottom: top + lineHeight, left };
}
