import { toolsFor } from './tool-list.js';
import { currentFrames, flipCurrent } from './actions.js';
import { moveFrameTo } from './frame-actions.js';
import { redo, undo } from './undo.js';
import { leastZoom, steppedZoom } from './navigate.js';
import { handleSelectionKey } from './selection-keys.js';
import { openShortcuts } from './shortcuts.js';
import { resizeBrush } from '../editor/brush.js';
import { handlePoseKey } from './body/pose-keys.js';
import { handleAnimationKey } from './animation-keys.js';

// inputs that take no text: after one is used, the tool keys and undo still work
const NOT_TYPED_IN = new Set(['range', 'checkbox', 'radio', 'color', 'button', 'file']);
const MOVES_A_SLIDER = /^(Arrow|Home|End|Page)/;

function typing(event) {
  const { tagName: tag, type } = event.target;

  if (tag === 'INPUT' && NOT_TYPED_IN.has(type)) {
    return type === 'range' && MOVES_A_SLIDER.test(event.key);
  }

  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable
  );
}

const modalOpen = () => Boolean(document.querySelector('.sheet-backdrop, .menu'));

const zoomBy = (app, step) =>
  app.store.set({ zoom: steppedZoom(app.store.state.zoom, step, leastZoom(app)) });

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
  '[': (app) => app.store.set({ brush: resizeBrush(app.store.state.brush, -1) }),
  ']': (app) => app.store.set({ brush: resizeBrush(app.store.state.brush, 1) }),
};

const MOVES_FRAME = { arrowleft: -1, arrowright: 1 };

// Alt and an arrow move the frame being edited earlier or later, wherever the keyboard is: it
// worked only with a frame of the grid in focus, and did nothing after a stroke on the canvas
function moveFrameKey(app, event, key) {
  const step = event.altKey && MOVES_FRAME[key];
  const { frame } = app.store.state.at;

  if (!step) {
    return false;
  }

  event.preventDefault();

  if (currentFrames(app.store.state)[frame + step]) {
    moveFrameTo(app, frame, frame + step);
  }

  return true;
}

function plainKey(app, event, key) {
  if (moveFrameKey(app, event, key)) {
    return;
  }

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
    app.store.set({ tool: tool.id });
  }
}

// Escape takes back what is being dragged on the canvas, as a second finger does
const takesDragBack = (app, key) =>
  key === 'escape' && Boolean(app.dragging) && Boolean(app.cancelDrag?.());

function onKey(app, event) {
  const command = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();

  if (takesDragBack(app, key) || handlePoseKey(app, event, key)) {
    return;
  }

  if (handleSelectionKey(app, event, key, command) || handleAnimationKey(app, event, command)) {
    return;
  }

  if (command && COMMAND_KEYS[key]) {
    event.preventDefault();
    COMMAND_KEYS[key](app, event);
  } else if (!command) {
    plainKey(app, event, key);
  }
}

// Space pans from the page itself, and from anywhere while the pointer is over the canvas: a
// project opens with the keyboard on the tool in hand, where Space alone would press that button.
function startPanning(app, event) {
  const fromPage =
    event.target === document.body ||
    event.target.tagName === 'CANVAS' ||
    (Boolean(app.store.state.cursor) && !typing(event));

  if (event.key !== ' ' || !fromPage) {
    return false;
  }

  event.preventDefault();
  app.spaceHeld = true;
  document.body.classList.add('panning');

  return true;
}

export function bindKeyboard(app) {
  const stopPanning = () => {
    app.spaceHeld = false;
    document.body.classList.remove('panning');
  };

  document.addEventListener('keyup', (event) => event.key === ' ' && stopPanning());
  // Space let go while another window had the keys never says so here
  window.addEventListener('blur', stopPanning);
  document.addEventListener('keydown', (event) => {
    if (startPanning(app, event) || typing(event) || modalOpen()) {
      return;
    }

    if (event.key === '?') {
      openShortcuts(app.store.state.project);

      return;
    }

    onKey(app, event);
  });
}
