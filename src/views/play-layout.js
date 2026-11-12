// How every view is laid out while they all play: in rows of `columns`, each `scale` screen
// pixels to an art pixel. GAP parts two views; CAPTION is the room for a view's name above it.
export const GAP = 16;
export const CAPTION = 22;

const HALF = 0.5;

// the most screen pixels an art pixel can take with the views in `columns`, not rounded
function roomScale({ count, width, height }, room, columns) {
  const rows = Math.ceil(count / columns);
  const across = (room.width - GAP * (columns - 1)) / (columns * width);
  const down = (room.height - CAPTION * rows - GAP * (rows - 1)) / (rows * height);

  return Math.min(across, down);
}

const columnsFrom = (count) => Array.from({ length: count }, (unused, i) => count - i);

// The rows that draw the views biggest, one row when it does as well; never bigger than the zoom
// being edited at. Art too big for the room at one whole pixel plays at a half, as the canvas
// itself is shown when it is larger than its window: at a whole pixel the views stood in a
// column, all but the first under a phone's sheet. Too big even for that, it keeps to the
// columns that fit across, so it scrolls one way only.
export function playLayout(views, room, zoom) {
  let best = { columns: views.count, scale: 0 };

  for (const columns of columnsFrom(views.count)) {
    const scale = Math.min(zoom, Math.floor(roomScale(views, room, columns)));

    if (scale > best.scale) {
      best = { columns, scale };
    }
  }

  if (best.scale >= 1) {
    return best;
  }

  const halved = columnsFrom(views.count).find(
    (columns) => roomScale(views, room, columns) >= HALF,
  );

  if (halved) {
    return { columns: halved, scale: HALF };
  }

  const fit = Math.floor((room.width + GAP) / (views.width + GAP));

  return { columns: Math.max(1, Math.min(views.count, fit)), scale: 1 };
}
