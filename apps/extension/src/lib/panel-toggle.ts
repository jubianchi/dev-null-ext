/**
 * Shows and hides a panel that takes a while to open, so that showing it twice before it is open still opens one, and
 * hiding it while it opens removes it once open.
 */

export interface Removable {
  remove(): void;
}

export interface PanelToggle {
  show(): Promise<void>;
  hide(): void;
}

export function panelToggle(open: () => Promise<Removable>): PanelToggle {
  let opening: Promise<Removable> | null = null;
  let opened: Removable | null = null;

  return {
    show() {
      if (opened) return Promise.resolve();
      if (!opening) opening = open();
      const current = opening;

      return current.then((panel) => {
        if (opening !== current) panel.remove();
        else opened = panel;
      });
    },

    hide() {
      opening = null;
      opened?.remove();
      opened = null;
    },
  };
}
