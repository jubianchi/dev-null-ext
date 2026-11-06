import { render } from 'preact';
import '../../assets/tailwind.css';
import { ShareFrame } from '../../components/ShareFrame.tsx';
import { readShareContext } from '../../lib/share-frame.ts';

// Framed over the page by the injected script (src/lib/share-frame.ts), which listens to this frame alone.
const tell = (message: { type: string; height?: number }) => window.parent.postMessage(message, '*');

const root = document.getElementById('app');
if (root) {
  render(<ShareFrame page={readShareContext(location.hash)} onClose={() => tell({ type: 'dev-null-share:close' })} />, root);
  new ResizeObserver(() => tell({ type: 'dev-null-share:height', height: root.scrollHeight })).observe(root);
}
