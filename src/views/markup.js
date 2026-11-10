// The Views board's marks and notes, as { strokes: [{ direction, points }], notes: [{ direction,
// x, y, text }] }, in art pixels of the view they are on.

// how far the point is from the line between two points of a mark
function fromSegment([x, y], [startX, startY], [endX, endY]) {
  const [alongX, alongY] = [endX - startX, endY - startY];
  const length = alongX * alongX + alongY * alongY;
  const part = length
    ? Math.max(0, Math.min(1, ((x - startX) * alongX + (y - startY) * alongY) / length))
    : 0;

  return Math.hypot(x - startX - part * alongX, y - startY - part * alongY);
}

// a pointer that moves fast leaves the points of a mark far apart: it is pressed on its lines
function fromStroke(point, points) {
  const ends = points.length > 1 ? points.slice(1) : points;

  return Math.min(...ends.map((end, index) => fromSegment(point, points[index], end)));
}

// The label a note is written on, in art pixels: it opens to the right of its pin and above it,
// and to the left near the view's right edge. Its letters keep a size that can be read, so on a
// small board the label is many art pixels wide.
export function noteLabel(note, { scale, width }) {
  const letter = Math.max(11, Math.round(scale * 3.2)) * 0.8;
  const whole = (note.text.length * letter + 10) / scale;
  const across = Math.min(width, whole);
  // a note wider than its view is written on as many lines as it needs
  const down = (Math.ceil(whole / across) * Math.max(16, scale * 4.4)) / scale;
  const left = Math.max(0, Math.min(note.x, width - across));
  const bottom = Math.max(down, note.y);

  return { left, right: left + across, top: bottom - down, bottom };
}

function fromLabel([x, y], label) {
  const across = Math.max(label.left - x, 0, x - label.right);
  const down = Math.max(label.top - y, 0, y - label.bottom);

  return Math.hypot(across, down);
}

// Which mark or note lies under a press: the nearest within `reach` art pixels, on that view. A
// mark counts along its whole line; a note from its pin and from its label, as the board draws
// it at `scale` on a view `width` wide. Null where the press is on bare art.
export function markAt(
  markup,
  { direction, x, y },
  { reach = 6, scale = 4, width = Infinity } = {},
) {
  const found = [
    ...markup.notes.map((note, index) => ({
      kind: 'notes',
      index,
      direction: note.direction,
      distance: fromLabel([x, y], noteLabel(note, { scale, width })),
    })),
    ...markup.strokes.map((stroke, index) => ({
      kind: 'strokes',
      index,
      direction: stroke.direction,
      distance: fromStroke([x, y], stroke.points),
    })),
  ]
    .filter((mark) => mark.direction === direction && mark.distance <= reach)
    .sort((first, second) => first.distance - second.distance);

  return found.length ? { kind: found[0].kind, index: found[0].index } : null;
}
