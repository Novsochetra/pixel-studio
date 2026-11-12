// How every view is laid out while they all play: in rows of `columns`, each `scale` screen
// pixels to an art pixel. GAP parts two views; CAPTION is the room for a view's name above it.
export const GAP = 16;
export const CAPTION = 22;

const LEAST = 0.125;

// The steps a view playing is drawn at: whole pixels from two up, where the art is crisp; a
// pixel and a half where the choice was one; eighths under one.
function stepped(scale) {
  if (scale >= 2) {
    return Math.floor(scale);
  }

  return scale >= 1 ? Math.floor(scale * 2) / 2 : Math.max(LEAST, Math.floor(scale * 8) / 8);
}

// the most screen pixels an art pixel can take with the views in `columns`, not rounded
function roomScale({ count, width, height }, room, columns) {
  const rows = Math.ceil(count / columns);
  const across = (room.width - GAP * (columns - 1)) / (columns * width);
  const down = (room.height - CAPTION * rows - GAP * (rows - 1)) / (rows * height);

  return Math.min(across, down);
}

const columnsFrom = (count) => Array.from({ length: count }, (unused, i) => count - i);

// The rows that draw the views biggest, one row when it does as well; never bigger than the zoom
// being edited at. Every view is in sight whole, so in a small room the play is drawn between
// whole pixels, or under one: at whole pixels alone, art that filled its canvas stood in a
// column, all but the first view under a phone's sheet, and small art played the size of a
// stamp. Shown so small it is still the whole play; the sheet shut gives it its room back.
export function playLayout(views, room, zoom) {
  let best = { columns: views.count, scale: 0 };

  for (const columns of columnsFrom(views.count)) {
    const scale = Math.min(zoom, stepped(roomScale(views, room, columns)));

    if (scale > best.scale) {
      best = { columns, scale };
    }
  }

  return best;
}
