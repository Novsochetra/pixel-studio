import { currentLayer } from './actions.js';
import { startTool } from './tools.js';
import { panSession, twoFingerSession } from './navigate.js';
import { getPixel, toHex } from '../model/sprite.js';

export function pixelAt(canvas, event, scale) {
  const box = canvas.getBoundingClientRect();

  return [
    Math.floor((event.clientX - box.left) / scale),
    Math.floor((event.clientY - box.top) / scale),
  ];
}

// What a press starts: a two-finger pan and pinch, a pan (middle button, or space held), or the
// current tool. Returns the session that follows the pointer, or null.
function pressSession(app, view, event) {
  const { canvas, stage, touches, session } = view;

  if (touches.size === 2) {
    // a second finger: what the first one started was the start of a pan, not a stroke
    session?.cancel?.();

    return twoFingerSession(app, stage, canvas, touches);
  }

  if (event.button === 1 || (event.button === 0 && app.spaceHeld)) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    return panSession(stage, event);
  }

  if (event.button !== 0) {
    return session;
  }

  canvas.setPointerCapture(event.pointerId);

  return startTool(app, pixelAt(canvas, event, app.store.state.zoom), event);
}

function showCursor(app, point) {
  const color = getPixel(currentLayer(app.store.state).sprite, ...point);

  app.store.set({
    cursor: { x: point[0], y: point[1], color: color ? toHex(color) : 'transparent' },
  });
}

export function bindPointer(canvas, app, stage) {
  const view = { canvas, stage, touches: new Map(), session: null };
  const place = (event) =>
    view.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const finish = (event) => {
    view.touches.delete(event.pointerId);

    if (view.touches.size !== 1) {
      view.session?.end?.();
      view.session = null;
    }
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') {
      place(event);
    }

    view.session = pressSession(app, view, event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (view.touches.has(event.pointerId)) {
      place(event);
    }

    const point = pixelAt(canvas, event, app.store.state.zoom);
    showCursor(app, point);
    view.session?.move?.(point, event);
  });
  // the brush's ring goes with the pointer
  canvas.addEventListener('pointerleave', () => app.store.set({ cursor: null }));
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}
