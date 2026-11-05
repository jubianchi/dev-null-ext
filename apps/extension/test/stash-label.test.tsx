// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StashLabel } from '../src/components/StashLabel.tsx';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
});

describe('StashLabel', () => {
  it('shows nothing until a stash came back', async () => {
    await act(async () => render(<StashLabel restored={false} onDrop={() => {}} />, root));

    expect(root.innerHTML).toBe('');
  });

  it('says a stash came back, as dev-null.sh does, and drops it on demand', async () => {
    const onDrop = vi.fn();
    await act(async () => render(<StashLabel restored onDrop={onDrop} />, root));

    expect(root.querySelector('[title="Restored your unsent draft"]')?.textContent).toBe('stash@{0}');
    const drop = root.querySelector<HTMLButtonElement>('button[title="Discard the restored draft"]');
    expect(drop?.textContent).toBe('drop');

    await act(async () => drop?.click());
    expect(onDrop).toHaveBeenCalledOnce();
  });
});
