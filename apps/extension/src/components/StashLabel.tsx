/**
 * Says the composer opened with its stash, with a way to drop it, as dev-null.sh's StashLabel: muted monospace, never
 * blue, no icon. Typing alone never shows it.
 */
export function StashLabel({ restored, onDrop }: { restored: boolean; onDrop: () => void }) {
  if (!restored) return null;

  return (
    <span class="flex items-center gap-2 font-mono text-xs text-fg-muted">
      <span title="Restored your unsent draft">stash@{'{0}'}</span>
      <button
        type="button"
        onClick={onDrop}
        title="Discard the restored draft"
        class="cursor-pointer border-0 bg-transparent p-0 font-mono text-xs text-fg-muted underline hover:text-fg"
      >
        drop
      </button>
    </span>
  );
}
