// Moving around the canvas: space-drag or middle-drag pans, ⌘/Ctrl + scroll or a trackpad pinch
// zooms around the pointer, two fingers on a touch screen pan and pinch.

// Zooms are whole, so a pixel of the art is a whole number of the screen's. Below 1 there is a
// half: a canvas larger than the window showed only part of itself at 100%, and Fit fitted none
// of the rest.
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 24;

// The half is for a canvas that does not fit the window whole: a small one pinched down to it
// was a thumbnail no one could draw on. `least` is the least zoom there is for the open canvas.
export const leastZoom = (app) => (app.fittedZoom < 1 ? MIN_ZOOM : 1);

export const nearestZoom = (zoom, least = MIN_ZOOM) =>
  zoom < 0.75 ? least : Math.min(MAX_ZOOM, Math.max(1, Math.round(zoom)));

// one step closer (1) or further (-1): the half is a step of its own under 1
export function steppedZoom(zoom, step, least = MIN_ZOOM) {
  if (zoom < 1) {
    return step > 0 ? 1 : MIN_ZOOM;
  }

  return nearestZoom(zoom + step < 1 ? least : zoom + step, least);
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
