// SPIKE, not to merge: proves the extension's page can be framed on any site, and what it can do there.
const params = new URLSearchParams(location.search);
const context = JSON.parse(params.get('context') ?? '{}') as { url?: string; title?: string; image?: string | null; selection?: string };

const text = (id: string, value: string) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

text('origin', location.origin);
text('context', JSON.stringify(context));

const remote = document.getElementById('remote') as HTMLImageElement;
remote.addEventListener('load', () => text('remote-status', 'loaded'));
remote.addEventListener('error', () => text('remote-status', 'blocked or failed'));
remote.src = context.image ?? 'https://github.githubassets.com/favicons/favicon.png';

document.getElementById('picker')?.addEventListener('change', (event) => {
  text('picked', (event.target as HTMLInputElement).files?.[0]?.name ?? 'none');
});
document.getElementById('close')?.addEventListener('click', () => parent.postMessage('dev-null-share:close', '*'));

parent.postMessage('dev-null-share:ready', '*');
