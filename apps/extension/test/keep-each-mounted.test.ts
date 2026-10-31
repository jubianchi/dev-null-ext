// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepEachMounted } from '../src/lib/keep-each-mounted.ts';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('keepEachMounted', () => {
  let controller: AbortController;
  const mount = vi.fn(async (box: Element) => {
    const element = document.createElement('span');
    element.className = 'ours';
    box.prepend(element);
    return { element, remove: () => element.remove() };
  });

  beforeEach(async () => {
    controller = new AbortController();
    mount.mockClear();
    document.body.innerHTML = '<div class="box" id="a"></div><div class="box" id="b"></div>';

    keepEachMounted({
      find: () => [...document.querySelectorAll('.box')],
      mount,
      root: document.body,
      signal: controller.signal,
    });
    await flush();
  });

  afterEach(() => controller.abort());

  it('mounts once in each place found', async () => {
    await flush();

    expect([...document.querySelectorAll('.box')].map((box) => box.querySelectorAll('.ours').length)).toEqual([1, 1]);
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it('mounts in the places the page adds', async () => {
    document.body.insertAdjacentHTML('beforeend', '<div class="box" id="c"></div>');
    await flush();
    await flush();

    expect(document.querySelector('#c .ours')).not.toBeNull();
    expect(mount).toHaveBeenCalledTimes(3);
  });

  it('mounts again where the page replaced a place', async () => {
    document.querySelector('#a')!.replaceWith(Object.assign(document.createElement('div'), { className: 'box', id: 'a' }));
    await flush();
    await flush();

    expect(document.querySelector('#a .ours')).not.toBeNull();
  });

  it('removes what it mounted when aborted', async () => {
    controller.abort();

    expect(document.querySelectorAll('.ours')).toHaveLength(0);
  });
});
