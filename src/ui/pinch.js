import { MAX_ZOOM, MIN_ZOOM } from './navigate.js';

const middle = ([first, second]) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });

const spreadOf = ([first, second]) => Math.hypot(first.x - second.x, first.y - second.y);

// where the canvas is drawn while the fingers hold it: as a move and a size of the canvas as it
// stood when they landed, so the pixel under them stays under them
export function heldAt(start, touches) {
  const points = [...touches.values()];
  const mid = middle(points);
  const zoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, start.zoom * (spreadOf(points) / start.spread)),
  );
  const scale = zoom / start.zoom;

  return {
    mid,
    zoom,
    scale,
    x: mid.x - start.grip.x * scale - start.box.left,
    y: mid.y - start.grip.y * scale - start.box.top,
  };
}

// The fingers let go: the canvas is drawn once at the whole zoom nearest, scrolled so the pixel
// that was under them is as near there as the stage lets it be, and glides the rest of the way.
function settle(app, { stage, holder }, start, held) {
  const zoom = Math.round(held.zoom);
  const art = { x: start.grip.x / start.zoom, y: start.grip.y / start.zoom };
  const shown = {
    left: start.box.left + held.x,
    top: start.box.top + held.y,
    scale: held.zoom / zoom,
  };

  holder.style.transform = '';
  app.store.set({ zoom });
  const box = holder.getBoundingClientRect();

  stage.scrollLeft += box.left + art.x * zoom - held.mid.x;
  stage.scrollTop += box.top + art.y * zoom - held.mid.y;
  const now = holder.getBoundingClientRect();

  holder.style.transform = `translate(${shown.left - now.left}px, ${shown.top - now.top}px) scale(${shown.scale})`;
  // read, so the glide starts from where the canvas was held and not from its place
  holder.getBoundingClientRect();
  holder.classList.add('settling');
  holder.addEventListener('transitionend', () => holder.classList.remove('settling'), {
    once: true,
  });
  holder.style.transform = '';
}

// Two touches: the canvas moves with their middle and grows with their spread. It is moved as a
// picture while they hold it and drawn again only when they let go: drawn at each move, at whole
// zooms, it lagged behind the fingers and jumped from size to size.
export function twoFingerSession(app, { stage, canvas }, touches) {
  const holder = canvas.parentElement;

  holder.classList.remove('settling');
  holder.style.transform = '';
  const points = [...touches.values()];
  const box = holder.getBoundingClientRect();
  const mid = middle(points);
  const start = {
    box,
    zoom: app.store.state.zoom,
    spread: spreadOf(points) || 1,
    grip: { x: mid.x - box.left, y: mid.y - box.top },
  };
  let held = null;
  let frame = 0;
  const draw = () => {
    frame = 0;

    if (held) {
      holder.style.transform = `translate(${held.x}px, ${held.y}px) scale(${held.scale})`;
    }
  };
  const letGo = () => {
    cancelAnimationFrame(frame);

    if (held) {
      settle(app, { stage, holder }, start, held);
      held = null;
    }
  };

  return {
    move() {
      if (touches.size > 1) {
        held = heldAt(start, touches);
        frame ||= requestAnimationFrame(draw);
      }
    },
    settle: letGo,
    end: letGo,
  };
}
