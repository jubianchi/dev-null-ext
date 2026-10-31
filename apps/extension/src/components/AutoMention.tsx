/**
 * The @mention a composer adds below what the user writes, shown as a removable chip so it is never a surprise; once
 * removed, a button puts it back. Without it, the commit doesn't show on the organization's /dev/null page.
 */
export function AutoMention({ organization, on, onChange }: { organization: string; on: boolean; onChange: (on: boolean) => void }) {
  if (!on) {
    return (
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-label={`Mention @${organization}`}
        title={`Mention @${organization}, so the commit shows on the organization's /dev/null page`}
        class="rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-xs text-fg-muted hover:border-fg-accent hover:text-fg-accent"
      >
        + @{organization}
      </button>
    );
  }

  return (
    <span
      data-auto-mention
      title={`Added below your text, so the commit shows on the organization's /dev/null page`}
      class="inline-flex items-center gap-1 rounded-full border border-border bg-canvas-muted py-0.5 pl-2 pr-0.5 font-mono text-xs text-fg-accent"
    >
      @{organization}
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-label={`Remove the mention of @${organization}`}
        class="flex size-4 items-center justify-center rounded-full text-fg-muted hover:bg-button-hover hover:text-fg"
      >
        ×
      </button>
    </span>
  );
}
