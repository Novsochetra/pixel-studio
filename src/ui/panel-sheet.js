import { node } from './dom.js';
import { pullToClose } from './sheet-pull.js';

// On a phone a panel opened from the dock is a sheet at the screen's foot. This is the bar at its
// top: the grabber it is pulled down by, and a way out a thumb finds without knowing the pull.
export function panelGrab(app) {
  return node(
    'div.panel-grab',
    {},
    node(
      'button.btn.quiet.panel-close',
      { 'aria-label': 'Close this panel', onclick: () => app.store.set({ panel: null }) },
      '×',
    ),
  );
}

// pulled down by its bar, or by its title, the panel shuts as a window does
export function pullsShut(panel, app) {
  pullToClose({
    head: panel,
    body: panel,
    grips: (event) => Boolean(event.target.closest('.panel-grab, .section > h2')),
    close: () => {
      // the panel is kept for the next time it opens: it must not open where it was pulled to
      panel.style.translate = '';
      app.store.set({ panel: null });
    },
  });
}
