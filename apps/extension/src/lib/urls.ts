const PAIRS: Record<string, string> = { ')': '(', ']': '[' };

/**
 * A URL found in prose without the punctuation that ends the sentence around it ("see https://example.com."), nor a
 * closing bracket the URL itself didn't open ("(https://example.com)"), as /dev/null reads links.
 */
export function withoutTrailingPunctuation(url: string): string {
  let end = url.length;

  while (end > 0) {
    const last = url[end - 1] ?? '';
    const opening = PAIRS[last];

    if (/[.,;:!?'"]/.test(last)) {
      end -= 1;
    } else if (opening !== undefined && count(url.slice(0, end), last) > count(url.slice(0, end), opening)) {
      end -= 1;
    } else {
      break;
    }
  }

  return url.slice(0, end);
}

function count(text: string, character: string): number {
  return text.split(character).length - 1;
}
