import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('../src/assets/tailwind.css', import.meta.url), 'utf8');
const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the stylesheet', () => {
  it("keeps the extension's own pages' palette off GitHub: WXT turns :root into :host in GitHub's shadow roots", () => {
    // node_modules/wxt/dist/utils/content-script-ui/shadow-root.mjs: entryCss.replaceAll(":root", ":host").
    expect(withoutComments).not.toMatch(/:root\b/);
  });

  it("sets the extension's own pages' palette on html, which no shadow root has", () => {
    expect(withoutComments).toMatch(/^html\s*\{[^}]*--fgColor-default:/m);
    expect(withoutComments).toMatch(/^html\s*\{[^}]*color-scheme:\s*light dark/m);
  });
});
