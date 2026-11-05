import { currentLayer } from './actions.js';
import { startTool } from './tools.js';
import { panSession, twoFingerSession } from './navigate.js';
import { getPixel, toHex } from '../model/sprite.js';

export function pixelAt(canvas, event, scale) {
  const box = canvas.getBoundingClientRect();

  return [Math.floor((event.clientX - box.left) / scale), Math.floor((event.clientY - box.top) / scale)];
}

export function bindPointer(canvas, app, stage) {
  let session = null;
  const touches = new Map();

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (touches.size === 2) {
      // a second finger: what the first one started was the start of a pan, not a stroke
      session?.cancel?.();
      session = twoFingerSession(app, stage, canvas, touches);

      return;
    }

    if (event.button === 1 || (event.button === 0 && app.spaceHeld)) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      session = panSession(stage, event);

      return;
    }

    if (event.button !== 0) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    session = startTool(app, pixelAt(canvas, event, app.store.state.zoom), event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const [x, y] = pixelAt(canvas, event, app.store.state.zoom);
    const color = getPixel(currentLayer(app.store.state).sprite, x, y);
    app.store.set({ cursor: { x, y, color: color ? toHex(color) : 'transparent' } });
    session?.move?.([x, y], event);
  });
  const finish = (event) => {
    touches.delete(event.pointerId);

    if (touches.size === 1) {
      return;
    }

    session?.end?.();
    session = null;
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}
