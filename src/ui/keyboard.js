import { toolsFor } from './tools.js';
import { flipCurrent, redo, undo } from './actions.js';
import { handleSelectionKey } from './selection-keys.js';
import { openShortcuts } from './shortcuts.js';

function typing(event) {
  const tag = event.target.tagName;

  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable
  );
}

const modalOpen = () => Boolean(document.querySelector('.sheet-backdrop, .menu'));

const zoomBy = (app, step) =>
  app.store.set({ zoom: Math.max(1, Math.min(24, app.store.state.zoom + step)) });

// keys that do the same whatever is selected; ⌘ ones and plain ones apart
const COMMAND_KEYS = {
  z: (app, event) => (event.shiftKey ? redo : undo)(app),
  y: (app) => redo(app),
};

const PLAIN_KEYS = {
  '+': (app) => zoomBy(app, 1),
  '=': (app) => zoomBy(app, 1),
  '-': (app) => zoomBy(app, -1),
  m: (app) => {
    const { symmetry } = app.store.state;

    app.store.set({ symmetry: { ...symmetry, on: !symmetry.on } });
  },
};

function plainKey(app, event, key) {
  if (key === 'f' && event.shiftKey) {
    flipCurrent(app);

    return;
  }

  if (PLAIN_KEYS[key]) {
    PLAIN_KEYS[key](app);

    return;
  }

  const tools = toolsFor(app.store.state.project);
  const tool = event.altKey ? null : tools.find((candidate) => candidate.key === key);

  if (tool) {
    app.store.set({ tool: tool.id, mode: 'edit' });
  }
}

function onKey(app, event) {
  const command = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();

  if (handleSelectionKey(app, event, key, command)) {
    return;
  }

  if (command && COMMAND_KEYS[key]) {
    event.preventDefault();
    COMMAND_KEYS[key](app, event);
  } else if (!command) {
    plainKey(app, event, key);
  }
}

// space pans only from the page itself: on a focused button it still presses the button
function startPanning(app, event) {
  const fromPage = event.target === document.body || event.target.tagName === 'CANVAS';

  if (event.key !== ' ' || !fromPage) {
    return false;
  }

  event.preventDefault();
  app.spaceHeld = true;
  document.body.classList.add('panning');

  return true;
}

export function bindKeyboard(app) {
  document.addEventListener('keyup', (event) => {
    if (event.key === ' ') {
      app.spaceHeld = false;
      document.body.classList.remove('panning');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (startPanning(app, event) || typing(event) || modalOpen()) {
      return;
    }

    if (event.key === '?') {
      openShortcuts();

      return;
    }

    onKey(app, event);
  });
}
