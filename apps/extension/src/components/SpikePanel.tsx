import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';

/** SPIKE, not to merge: what activeTab gives the popup, and whether the file picker closes it. */
export function SpikePanel() {
  const [tab, setTab] = useState('…');
  const [picked, setPicked] = useState('none');

  useEffect(() => {
    void browser.tabs.query({ active: true, currentWindow: true }).then(([active]) => setTab(`${active?.url ?? 'no URL'} · ${active?.title ?? 'no title'}`));
  }, []);

  return (
    <section class="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs">
      <div class="font-semibold">SPIKE</div>
      <div data-spike-tab class="break-all">
        Tab: {tab}
      </div>
      <label class="mt-1 block">
        Popup file picker: <input type="file" accept="image/*" onChange={(event) => setPicked(event.currentTarget.files?.[0]?.name ?? 'none')} />
      </label>
      <div data-spike-picked>Picked: {picked}</div>
    </section>
  );
}
