// Drag a frame along a row to put it somewhere else. A mouse or pen drags once it moves a little;
// a finger holds still for a moment first, so a quick swipe still scrolls the row.
const MOUSE_SLOP = 5;
const TOUCH_SLOP = 8;
const HOLD_MS = 300;

// the gap the pointer is over: 0 is before the first frame, n after the last
function slotAt(frames, x) {
  return frames.filter((frame) => {
    const box = frame.getBoundingClientRect();

    return box.left + box.width / 2 < x;
  }).length;
}

function markSlot(frames, from, slot) {
  const last = frames.length - 1;

  frames.forEach((frame, i) => {
    frame.classList.toggle('dragging', i === from);
    frame.classList.toggle('drop-before', i === slot && slot !== from && slot !== from + 1);
    frame.classList.toggle('drop-after', i === last && slot === frames.length && from !== last);
  });
}

function scrollNear(row, x) {
  const scroller = row.closest('.grid-scroll') ?? row;
  const box = scroller.getBoundingClientRect();

  if (x < box.left + 24) {
    scroller.scrollLeft -= 8;
  } else if (x > box.right - 24) {
    scroller.scrollLeft += 8;
  }
}

function startDrag(drag) {
  const { row, press } = drag;
  press.dragging = true;
  row.classList.add('sorting');

  try {
    row.setPointerCapture(press.pointerId);
  } catch {
    // a pointer that already lifted cannot be captured; the drag still ends on pointerup
  }

  markSlot(drag.frames(), press.from, press.from);
}

function endDrag(drag) {
  clearTimeout(drag.press?.timer);
  drag.frames().forEach((frame) => frame.classList.remove('dragging', 'drop-before', 'drop-after'));
  drag.row.classList.remove('sorting');
  drag.press = null;
}

function onDown(drag, event) {
  const frame = event.target.closest(drag.selector);

  if (!frame || event.button > 0 || event.target.closest('.cell-more')) {
    return;
  }

  const touch = event.pointerType === 'touch';
  drag.press = {
    from: drag.frames().indexOf(frame),
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    touch,
    dragging: false,
    slot: null,
  };

  if (touch) {
    drag.press.timer = setTimeout(() => drag.press && startDrag(drag), HOLD_MS);
  }
}

function onMove(drag, event) {
  const { press } = drag;

  if (!press || event.pointerId !== press.pointerId) {
    return;
  }

  if (press.dragging) {
    press.slot = slotAt(drag.frames(), event.clientX);
    markSlot(drag.frames(), press.from, press.slot);
    scrollNear(drag.row, event.clientX);

    return;
  }

  const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);

  if (press.touch && moved > TOUCH_SLOP) {
    endDrag(drag);
  } else if (!press.touch && moved > MOUSE_SLOP) {
    startDrag(drag);
  }
}

function onUp(drag) {
  const press = drag.press;
  endDrag(drag);

  if (press?.dragging && press.slot !== null) {
    drag.row.dataset.justSorted = '1';
    setTimeout(() => delete drag.row.dataset.justSorted, 50);
    drag.onMove(press.from, press.slot > press.from ? press.slot - 1 : press.slot);
  }
}

// onMove(from, to): `to` is where the frame should end up, as moveFrame takes it
export function bindFrameDrag(row, selector, onMoveFrame) {
  const drag = {
    row,
    selector,
    onMove: onMoveFrame,
    press: null,
    frames: () => [...row.querySelectorAll(selector)],
  };

  row.addEventListener('pointerdown', (event) => onDown(drag, event));
  row.addEventListener('pointermove', (event) => onMove(drag, event));
  row.addEventListener('pointerup', () => onUp(drag));
  row.addEventListener('pointercancel', () => endDrag(drag));
  // the click that ends a drag is not a click on a frame
  row.addEventListener(
    'click',
    (event) => {
      if (row.dataset.justSorted) {
        delete row.dataset.justSorted;
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );
  // once a finger is dragging a frame, it must not scroll the page or the row
  row.addEventListener('touchmove', (event) => drag.press?.dragging && event.preventDefault(), {
    passive: false,
  });
}
