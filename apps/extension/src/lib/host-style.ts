/**
 * Styles a shadow root UI's host in the page. WXT resets the host (`:host { all: initial !important }`), which beats
 * any plain inline style: the host's layout among GitHub's elements has to be important too.
 */
export function styleHost(host: Element, properties: Record<string, string>): void {
  if (!(host instanceof HTMLElement)) return;
  for (const [property, value] of Object.entries(properties)) host.style.setProperty(property, value, 'important');
}
