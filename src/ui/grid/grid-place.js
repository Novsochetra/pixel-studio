const GAP = 8;

// how far a box must move to stand inside the room [from, to], the row's own label kept clear
function shift(box, room) {
  if (box.to > room.to) {
    return Math.min(box.to - room.to + GAP, box.from - room.from);
  }

  return box.from < room.from ? box.from - room.from - GAP : 0;
}

// the frame being edited, with the + after it when it is the last
function editedBox(scroller) {
  const cell = scroller.querySelector('.grid-row.current .cell.selected');
  const after = cell?.nextElementSibling;
  const last = after?.querySelector('.cell-add') ? after : cell;

  return cell ? { cell: cell.getBoundingClientRect(), last: last.getBoundingClientRect() } : null;
}

// The frames are drawn anew at each change, scrolled to their start: they are put back where
// they were, and when the place being edited changed (a new frame, another view) that frame is
// brought in sight. A new frame past the edge stayed out of sight, and the + with it.
export function keepGridPlace(el, before, moved) {
  const scroller = el.querySelector('.grid-scroll');

  if (!scroller) {
    return;
  }

  scroller.scrollLeft = before.left;
  scroller.scrollTop = before.top;
  const edited = moved ? editedBox(scroller) : null;

  if (!edited) {
    return;
  }

  const room = scroller.getBoundingClientRect();
  const label = scroller.querySelector('.grid-row.current .grid-label')?.getBoundingClientRect();

  scroller.scrollLeft += shift(
    { from: edited.cell.left, to: edited.last.right },
    { from: label?.right ?? room.left, to: room.right },
  );
  scroller.scrollTop += shift(
    { from: edited.cell.top, to: edited.cell.bottom },
    { from: room.top, to: room.bottom },
  );
}

export function gridPlace(el) {
  const scroller = el.querySelector('.grid-scroll');

  return { left: scroller?.scrollLeft ?? 0, top: scroller?.scrollTop ?? 0 };
}
