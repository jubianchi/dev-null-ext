import { FEATURES, type FeatureId, type Settings } from '../lib/settings.ts';

const GROUPS = [...new Set(FEATURES.map((feature) => feature.group))];

/**
 * The popup's settings: every feature the extension adds to GitHub, as a switch, by group. A change applies at once
 * to every open GitHub tab.
 */
export function PopupSettings({ settings, onChange, onBack }: { settings: Settings; onChange: (id: FeatureId, on: boolean) => void; onBack: () => void }) {
  return (
    <section class="flex flex-col">
      <header class="flex items-center gap-2 border-0 border-b border-solid border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          class="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-fg-muted hover:bg-canvas-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <h1 class="m-0 text-[15px] font-semibold">Settings</h1>
      </header>

      <div class="px-4 pb-3">
        <p class="m-0 mt-3 text-xs text-fg-muted">Choose what the extension adds to GitHub.</p>

        {GROUPS.map((group) => (
          <section key={group} class="pt-3">
            <h2 class="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{group}</h2>
            {FEATURES.filter((feature) => feature.group === group).map((feature) => {
              const on = settings[feature.id];

              return (
                <label key={feature.id} class="flex cursor-pointer items-center gap-3 border-0 border-b border-solid border-border-muted py-2">
                  <span class="min-w-0 flex-1">
                    <span class="block text-[13px] font-medium">{feature.label}</span>
                    <span class="block text-[11px] text-fg-muted">{feature.hint}</span>
                  </span>
                  <input type="checkbox" role="switch" checked={on} aria-checked={on} onChange={() => onChange(feature.id, !on)} class="peer sr-only" />
                  <span
                    aria-hidden="true"
                    class={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg-accent ${on ? 'bg-primary' : 'bg-fg-muted'}`}
                  >
                    <span class={`absolute top-0.5 size-3.5 rounded-full transition-[left] ${on ? 'left-4 bg-primary-fg' : 'left-0.5 bg-canvas'}`} />
                  </span>
                </label>
              );
            })}
          </section>
        ))}
      </div>

      <footer class="border-0 border-t border-solid border-border px-4 py-2.5 text-[11px] text-fg-muted">
        Applies at once to your GitHub tabs, and follows you to your other browsers.
      </footer>
    </section>
  );
}
