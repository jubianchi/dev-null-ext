import type { BodySegment } from '@devnull-github/client';

/** /dev/null's code spans (App\Services\CodeSpans): fenced blocks starting a line, then inline code. */
const CODE_PATTERN = /(?<![^\n])(?<fence>`{3,})[^`\r\n]*\r?\n(?:[\s\S]*?\r?\n)?\k<fence>`*[ \t]*(?![^\r\n])|`[^`\r\n]+`/g;
const META_PATTERN = /\{[^}]*\}|([A-Za-z][\w-]*)="([^"]*)"|[^ \t]+/g;

/**
 * A body cut into segments as /dev/null cuts it, for the bodies it sends unsegmented (to a guest). Blocks are not
 * highlighted: their `html` is the escaped code.
 */
export function segmentBody(body: string): BodySegment[] {
  if (body === '') return [];
  if (!body.includes('`')) return [{ type: 'text', text: body }];

  const segments: BodySegment[] = [];
  let prose = '';
  let afterBlock = false;
  let last = 0;

  const flush = (beforeBlock: boolean) => {
    let text = prose;
    if (afterBlock) text = text.replace(/^\r?\n/, '');
    if (beforeBlock) text = text.replace(/\r?\n$/, '');
    if (text !== '') segments.push({ type: 'text', text });
    prose = '';
  };

  for (const match of body.matchAll(CODE_PATTERN)) {
    prose += body.slice(last, match.index);
    last = match.index + match[0].length;

    if (match.groups?.['fence']) {
      flush(true);
      segments.push(block(match[0]));
      afterBlock = true;
    } else {
      flush(false);
      afterBlock = false;
      segments.push({ type: 'code', code: match[0].slice(1, -1) });
    }
  }
  prose += body.slice(last);
  flush(false);

  return segments;
}

function block(fenced: string): BodySegment {
  const lines = fenced.split(/\r?\n/);
  const info = (lines[0] ?? '').replace(/^`+/, '').replace(/^[ \t]+|[ \t]+$/g, '');
  const [, language = '', meta = ''] = /^(\S*)\s*([\s\S]*)$/.exec(info) ?? [];

  const attributes = new Map<string, string>();
  for (const [, key, value] of meta.matchAll(META_PATTERN)) {
    if (key && value && !attributes.has(key)) attributes.set(key, value);
  }

  return {
    type: 'block',
    language: language === '' ? null : language,
    filename: attributes.get('title') ?? attributes.get('filename') ?? null,
    html: escape(lines.slice(1, -1).join('\n')),
  };
}

function escape(code: string): string {
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
