// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { keepMounted } from '../src/lib/keep-mounted.ts';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('keepMounted', () => {
  let controller: AbortController;
  let element: HTMLElement;

  beforeEach(() => {
    controller = new AbortController();
    document.body.innerHTML = '<nav><ul></ul></nav>';
    element = document.createElement('li');
    element.textContent = '/dev/null';

    keepMounted({
      element: () => element,
      anchor: () => document.querySelector('nav ul'),
      mount: (anchor) => anchor.append(element),
      root: document.body,
      signal: controller.signal,
    });
  });

  afterEach(() => controller.abort());

  it('mounts at once when the anchor is there', () => {
    expect(document.querySelector('nav ul li')?.textContent).toBe('/dev/null');
  });

  it('mounts again when the page replaces the anchor with a new one', async () => {
    document.querySelector('nav')!.innerHTML = '<ul><li>Overview</li></ul>';
    await flush();

    expect([...document.querySelectorAll('nav ul li')].map((li) => li.textContent)).toEqual(['Overview', '/dev/null']);
  });

  it('waits for the anchor to appear', async () => {
    document.body.innerHTML = '';
    await flush();
    expect(element.isConnected).toBe(false);

    document.body.innerHTML = '<nav><ul></ul></nav>';
    await flush();
    expect(element.isConnected).toBe(true);
  });

  it('stops when aborted', async () => {
    controller.abort();
    document.querySelector('nav')!.innerHTML = '<ul></ul>';
    await flush();

    expect(element.isConnected).toBe(false);
  });
});
