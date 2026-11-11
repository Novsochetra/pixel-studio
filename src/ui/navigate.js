// Moving around the canvas: space-drag or middle-drag pans, ⌘/Ctrl + scroll or a trackpad pinch
// zooms around the pointer, two fingers on a touch screen pan and pinch.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 24;

// zoom to `zoom` keeping the art pixel under the screen point [clientX, clientY] where it is;
// view: { stage, canvas }, the scrolling stage and the canvas in it
export function zoomAround(app, { stage, canvas }, zoom, [clientX, clientY]) {
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
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
        zoomAround(app, { stage, canvas }, app.store.state.zoom - Math.sign(pending), [
          event.clientX,
          event.clientY,
        ]);
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
