import { describe, expect, it } from 'vitest';
import { segmentBody } from '../src/lib/segments.ts';

describe('segmentBody', () => {
  it('gives nothing for an empty body, and one text for a body without backticks', () => {
    expect(segmentBody('')).toEqual([]);
    expect(segmentBody('Shipped')).toEqual([{ type: 'text', text: 'Shipped' }]);
  });

  it('cuts out a fenced block, its language and its title, and the line breaks around it', () => {
    expect(segmentBody('Posted via\n```php title="src/Ollama.php#L17-L28"\necho 1 < 2;\n\nreturn;\n```\n\nhttps://github.com/x')).toEqual([
      { type: 'text', text: 'Posted via' },
      { type: 'block', language: 'php', filename: 'src/Ollama.php#L17-L28', html: 'echo 1 &lt; 2;\n\nreturn;' },
      { type: 'text', text: '\nhttps://github.com/x' },
    ]);
  });

  it('reads the file name from title first, then filename, the first of each winning', () => {
    expect(segmentBody('```js filename="a.js" title="b.js" title="c.js"\nx\n```')).toEqual([
      { type: 'block', language: 'js', filename: 'b.js', html: 'x' },
    ]);
    expect(segmentBody('```\nx\n```')).toEqual([{ type: 'block', language: null, filename: null, html: 'x' }]);
  });

  it('allows longer closing fences and empty blocks, and CRLF', () => {
    expect(segmentBody('````\r\n````` ')).toEqual([{ type: 'block', language: null, filename: null, html: '' }]);
    expect(segmentBody('```sh\r\nls\r\n```')).toEqual([{ type: 'block', language: 'sh', filename: null, html: 'ls' }]);
  });

  it('keeps unclosed and mid-line fences as prose', () => {
    expect(segmentBody('```php\necho 1;')).toEqual([{ type: 'text', text: '```php\necho 1;' }]);
    expect(segmentBody('see ```x``` here')).toEqual([
      { type: 'text', text: 'see ``' },
      { type: 'code', code: 'x' },
      { type: 'text', text: '`` here' },
    ]);
  });

  it('cuts out inline code, without its backticks', () => {
    expect(segmentBody('Run `npm i` then a lone ` here')).toEqual([
      { type: 'text', text: 'Run ' },
      { type: 'code', code: 'npm i' },
      { type: 'text', text: ' then a lone ` here' },
    ]);
  });
});
