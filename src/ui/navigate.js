// Moving around the canvas: space-drag or middle-drag pans, ⌘/Ctrl + scroll or a trackpad pinch
// zooms around the pointer, two fingers on a touch screen pan and pinch.

// Zooms are whole, so a pixel of the art is a whole number of the screen's. Below 1 there is a
// half: a canvas larger than the window showed only part of itself at 100%, and Fit fitted none
// of the rest. Below the half there is a quarter, for a canvas too large even for that: the
// largest canvas, with a phone's sheet up, ran under the sheet.
export const MIN_ZOOM = 0.5;
export const QUARTER_ZOOM = 0.25;
export const MAX_ZOOM = 24;

// The half and the quarter are for a canvas that does not fit the window whole: a small one
// pinched down to them was a thumbnail no one could draw on. `least` is the least zoom there is
// for the open canvas, the one Fit shows it at when that is under 100%.
export const leastZoom = (app) => (app.fittedZoom < 1 ? app.fittedZoom : 1);

// the step under 100% nearest to `zoom`, no smaller than the canvas has
const underOne = (zoom, least) => Math.max(least, zoom < 0.375 ? QUARTER_ZOOM : MIN_ZOOM);

export const nearestZoom = (zoom, least = MIN_ZOOM) =>
  zoom < 0.75 ? underOne(zoom, least) : Math.min(MAX_ZOOM, Math.max(1, Math.round(zoom)));

// one step closer (1) or further (-1): the half and the quarter are steps of their own under 1
export function steppedZoom(zoom, step, least = MIN_ZOOM) {
  if (zoom < 1) {
    const closer = zoom < MIN_ZOOM ? MIN_ZOOM : 1;

    return step > 0 ? closer : Math.max(least, QUARTER_ZOOM);
  }

  return zoom + step < 1 ? Math.max(least, MIN_ZOOM) : nearestZoom(zoom + step, least);
}

// zoom to `zoom` keeping the art pixel under the screen point [clientX, clientY] where it is;
// view: { stage, canvas }, the scrolling stage and the canvas in it
export function zoomAround(app, { stage, canvas }, zoom, [clientX, clientY]) {
  const next = nearestZoom(zoom, leastZoom(app));
  const old = app.store.state.zoom;

  if (next === old) {
    return;
  }

  const box = canvas.getBoundingClientRect();
  const artX = (clientX - box.left) / old;
  const artY = (clientY - box.top) / old;
  app.store.set({ zoom: next });
  const after = canvas.getBoundingClientRect();
  stage.scrollLeft += after.left + artX * next - clientX;
  stage.scrollTop += after.top + artY * next - clientY;
}

export function bindWheelZoom(stage, canvas, app) {
  let pending = 0;

  stage.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      pending += event.deltaY;

      // a trackpad pinch sends many small steps; a mouse wheel one big one
      if (Math.abs(pending) >= 40) {
        const zoom = steppedZoom(app.store.state.zoom, -Math.sign(pending), leastZoom(app));

        zoomAround(app, { stage, canvas }, zoom, [event.clientX, event.clientY]);
        pending = 0;
      }
    },
    { passive: false },
  );
}

export function panSession(stage, event) {
  const start = {
    x: event.clientX,
    y: event.clientY,
    left: stage.scrollLeft,
    top: stage.scrollTop,
  };

  return {
    move(_, moveEvent) {
      stage.scrollLeft = start.left - (moveEvent.clientX - start.x);
      stage.scrollTop = start.top - (moveEvent.clientY - start.y);
    },
  };
}
