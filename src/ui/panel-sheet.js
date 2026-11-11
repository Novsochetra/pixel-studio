import { icon, node } from './dom.js';
import { PANELS, openPanel } from './panels.js';

function panelTabs(app) {
  const { state } = app.store;
  const open = openPanel(state);

  return node(
    'div.segmented.panel-tabs',
    { role: 'group', 'aria-label': 'Panel' },
    PANELS.map((panel) =>
      node(
        'button',
        {
          'aria-pressed': String(panel.id === open),
          onclick: () => app.store.set({ panel: panel.id }),
        },
        panel.label,
      ),
    ),
  );
}

// On a phone a panel is a sheet at the screen's foot. At its top: the row that names it and
// picks another, and a way out a thumb finds without knowing the sheet can be pulled down. The
// panels' names were a second bar under the tools before; here they come and go with the sheet.
export function panelHead(app) {
  return [
    panelTabs(app),
    node(
      'button.btn.quiet.panel-close',
      { 'aria-label': 'Close this panel', onclick: () => app.store.set({ panel: null }) },
      icon('close'),
    ),
  ];
}

export const panelGrab = (app) => node('div.panel-grab', {}, panelHead(app));

const STARTS = 8;
const TURNS = 48;

// a press that became a pull must not also press the button it began on
const swallow = (event) => {
  event.stopPropagation();
  event.preventDefault();
};

// How far the finger has pulled, and what that does when it lets go: down shuts the sheet, or
// brings a tall one back to its height; up makes it tall.
function pulled(panel, app, distance) {
  const frame = panel.closest('.app');
  const tall = frame.dataset.sheet === 'tall';

  if (distance < -TURNS) {
    frame.dataset.sheet = 'tall';
  } else if (distance > TURNS && tall) {
    frame.dataset.sheet = '';
  } else if (distance > TURNS) {
    app.store.set({ panel: null });
  }
}

// The sheet is pulled by its top: the grabber, the row of names, the room round them. It starts
// once the finger has moved up or down, so a tap on a name or on × is still a tap; only the
// grabber's own strip took the pull before, and nothing made the sheet taller.
export function pullsShut(panel, app) {
  let pull = null;
  const end = (event) => {
    if (pull?.moving) {
      panel.style.translate = '';
      pulled(panel, app, event.type === 'pointerup' ? event.clientY - pull.y : 0);
      // the click of this press comes before the timer does
      setTimeout(() => panel.removeEventListener('click', swallow, true));
    }

    pull = null;
  };

  panel.addEventListener('pointerdown', (event) => {
    const compact = document.documentElement.dataset.layout === 'compact';

    if (compact && event.target.closest('.panel-grab')) {
      pull = { y: event.clientY, x: event.clientX, moving: false };
    }
  });
  panel.addEventListener('pointermove', (event) => {
    if (!pull) {
      return;
    }

    const [down, across] = [event.clientY - pull.y, Math.abs(event.clientX - pull.x)];

    if (!pull.moving && Math.abs(down) > STARTS && Math.abs(down) > across) {
      pull.moving = true;
      panel.setPointerCapture(event.pointerId);
      panel.addEventListener('click', swallow, true);
    }

    if (pull.moving) {
      // down, the sheet follows the finger; up, it waits to be let go
      panel.style.translate = `0 ${Math.max(0, down)}px`;
    }
  });
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
}
