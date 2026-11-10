// The Views board's marks and notes, as { strokes: [{ direction, points }], notes: [{ direction,
// x, y, text }] }, in art pixels of the view they are on.

// Which mark or note lies under a press: the nearest within `reach` art pixels, on that view; a
// note counts from the point it was pinned at. Null where the press is on bare art.
export function markAt(markup, { direction, x, y }, reach = 6) {
  const near = (px, py) => Math.hypot(px - x, py - y);
  const found = [
    ...markup.notes.map((note, index) => ({
      kind: 'notes',
      index,
      direction: note.direction,
      distance: near(note.x, note.y),
    })),
    ...markup.strokes.map((stroke, index) => ({
      kind: 'strokes',
      index,
      direction: stroke.direction,
      distance: Math.min(...stroke.points.map(([px, py]) => near(px, py))),
    })),
  ]
    .filter((mark) => mark.direction === direction && mark.distance <= reach)
    .sort((first, second) => first.distance - second.distance);

  return found.length ? { kind: found[0].kind, index: found[0].index } : null;
}
