// How every view is laid out while they all play: in rows of `columns`, each `scale` screen
// pixels to an art pixel. GAP parts two views; CAPTION is the room for a view's name above it.
export const GAP = 16;
export const CAPTION = 22;

function scaleFor({ count, width, height }, room, columns) {
  const rows = Math.ceil(count / columns);
  const across = (room.width - GAP * (columns - 1)) / (columns * width);
  const down = (room.height - CAPTION * rows - GAP * (rows - 1)) / (rows * height);

  return Math.floor(Math.min(across, down));
}

// The rows that draw the views biggest, one row when it does as well; never bigger than the zoom
// being edited at, and never under one whole pixel. Art too big for the room at that keeps to the
// columns that fit across, so it scrolls one way only.
export function playLayout(views, room, zoom) {
  let best = { columns: views.count, scale: 0 };

  for (let columns = views.count; columns >= 1; columns--) {
    const scale = Math.min(zoom, scaleFor(views, room, columns));

    if (scale > best.scale) {
      best = { columns, scale };
    }
  }

  if (best.scale >= 1) {
    return best;
  }

  const fit = Math.floor((room.width + GAP) / (views.width + GAP));

  return { columns: Math.max(1, Math.min(views.count, fit)), scale: 1 };
}
