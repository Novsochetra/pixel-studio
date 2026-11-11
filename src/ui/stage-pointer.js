import { currentLayer } from './actions.js';
import { startTool } from './tools.js';
import { panSession } from './navigate.js';
import { twoFingerSession } from './pinch.js';
import { stopPlayback } from './grid/playback.js';
import { playsAllViews } from './play-all-views.js';
import { touchIntent } from './touch-intent.js';
import { bindBeside } from './stage-beside.js';
import { getPixel, toHex } from '../model/sprite.js';

export function pixelAt(canvas, event, scale) {
  const box = canvas.getBoundingClientRect();

  return [
    Math.floor((event.clientX - box.left) / scale),
    Math.floor((event.clientY - box.top) / scale),
  ];
}

// Two fingers pan and pinch; a third joins them, and is not a tool.
function fingersSession(app, { canvas, stage, touches, session }) {
  if (touches.size > 2) {
    return session;
  }

  // A second finger: what the first one started was the start of a pan, not a stroke. A tool
  // that cannot take its work back keeps it, as one undo step, saved like any other.
  session?.cancel ? session.cancel() : session?.end?.();

  return twoFingerSession(app, { stage, canvas }, touches);
}

// What a press starts: a two-finger pan and pinch, a pan (middle button, or space held), or the
// current tool. Returns the session that follows the pointer, or null.
function pressSession(app, view, event) {
  const { canvas, stage, touches, session } = view;

  if (touches.size > 1) {
    return fingersSession(app, view);
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

// a mouse or a pen starts the tool at once; one finger waits to see whether it is half a pinch
function press(app, view, event) {
  const start = () => {
    view.intent = null;
    view.session = pressSession(app, view, event);
    app.dragging = Boolean(view.session);
  };

  view.intent?.drop();
  view.intent = null;

  if (event.pointerType === 'touch' && view.touches.size === 1) {
    view.intent = touchIntent(event, start);
  } else {
    start();
  }
}

// a finger lifted before its tool began was a tap: the tool acts where it landed. One the
// browser took away (a system gesture) was never meant for the art.
function settleIntent(view, event) {
  if (event.type === 'pointercancel') {
    view.intent?.drop();
    view.intent = null;
  } else {
    view.intent?.begin();
  }
}

function release(app, view, event) {
  settleIntent(view, event);
  view.touches.delete(event.pointerId);
  // one of two fingers lifted: the canvas they held takes its place now, not when the other lifts
  view.session?.settle?.();

  if (view.touches.size !== 1) {
    const ended = Boolean(view.session);

    view.session?.end?.();
    view.session = null;
    app.dragging = false;

    // What the drag selected stands where it will stay: its bar takes the other end of the
    // canvas. Add and Take away were for that one loop: left on, the next drag inside the
    // selection drew another loop where it was meant to move it.
    if (ended && app.store.state.selection) {
      app.store.set({ lassoMode: 'new' });
    }
  }
}

// Chromium on a phone takes a finger lifted while still moving for a fling, and swallows the next
// tap as the one that stops it: Undo tapped right after a quick stroke did nothing. A touch on
// the canvas is the studio's alone, and says so.
function ownTouches(canvas) {
  for (const kind of ['touchstart', 'touchmove']) {
    canvas.addEventListener(kind, (event) => event.preventDefault(), { passive: false });
  }
}

// On a phone a message shows at the top of the canvas: read or not, it leaves at the press, as
// it lay over the pixels and the handle the finger came for.
function clearSaid(app) {
  if (app.store.state.layout === 'compact') {
    document.querySelector('.toast')?.remove();
  }
}

function follow(app, view, event) {
  if (playsAllViews(app)) {
    return;
  }

  if (view.touches.has(event.pointerId)) {
    view.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  view.intent?.moved(event);

  // two fingers hold the canvas: there is no pixel under a pointer to show, and drawing the
  // stage again at each move is what made the canvas lag behind them
  if (view.touches.size > 1) {
    view.session?.move?.();

    return;
  }

  const point = pixelAt(view.canvas, event, app.store.state.zoom);

  showCursor(app, point);
  view.session?.move?.(point, event);
}

export function bindPointer(canvas, app, stage) {
  const view = { canvas, stage, touches: new Map(), session: null, intent: null };
  const place = (event) =>
    view.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const finish = (event) => release(app, view, event);

  ownTouches(canvas);
  bindBeside(view, { place, press: (event) => press(app, view, event), finish });
  canvas.addEventListener('pointerdown', (event) => {
    clearSaid(app);

    // a name still being typed (a new layer's) is done once the canvas is drawn on: on a phone
    // its keyboard would stay up over the art
    if (document.activeElement?.matches?.('input, textarea')) {
      document.activeElement.blur();
    }

    // The canvas shows the frame playing, not the one selected, and every view side by side has
    // no one frame under the pointer: a press stops play, and the next one draws.
    if (app.playback) {
      stopPlayback(app);
      app.store.touch('at');

      return;
    }

    if (event.pointerType === 'touch') {
      place(event);
    }

    press(app, view, event);
  });
  canvas.addEventListener('pointermove', (event) => follow(app, view, event));
  canvas.addEventListener('pointerleave', () => app.store.set({ cursor: null }));
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}
