// Drag a frame along the strip to put it somewhere else. A mouse or pen drags once it moves a
// little; a finger holds still for a moment first, so a quick swipe still scrolls the strip.
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
  frames.forEach((frame, i) => {
    frame.classList.toggle('dragging', i === from);
    frame.classList.toggle('drop-before', i === slot && slot !== from && slot !== from + 1);
    frame.classList.toggle(
      'drop-after',
      i === frames.length - 1 && slot === frames.length && from !== frames.length - 1,
    );
  });
}

function scrollNear(strip, x) {
  const box = strip.getBoundingClientRect();

  if (x < box.left + 24) {
    strip.scrollLeft -= 8;
  } else if (x > box.right - 24) {
    strip.scrollLeft += 8;
  }
}

// onMove(from, to): `to` is where the frame should end up, as moveFrame takes it
export function bindFrameDrag(strip, onMove) {
  let press = null;
  const framesOf = () => [...strip.querySelectorAll('.frame')];
  const end = () => {
    clearTimeout(press?.timer);
    framesOf().forEach((frame) => frame.classList.remove('dragging', 'drop-before', 'drop-after'));
    strip.classList.remove('sorting');
    press = null;
  };
  const start = () => {
    press.dragging = true;
    strip.classList.add('sorting');
    try {
      strip.setPointerCapture(press.pointerId);
    } catch {
      // a pointer that already lifted cannot be captured; the drag still ends on pointerup
    }
    markSlot(framesOf(), press.from, press.from);
  };

  strip.addEventListener('pointerdown', (event) => {
    const frame = event.target.closest('.frame');

    if (!frame || event.button > 0) {
      return;
    }

    press = {
      from: framesOf().indexOf(frame),
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      touch: event.pointerType === 'touch',
      dragging: false,
      slot: null,
    };

    if (press.touch) {
      press.timer = setTimeout(() => press && start(), HOLD_MS);
    }
  });
  strip.addEventListener('pointermove', (event) => {
    if (!press || event.pointerId !== press.pointerId) {
      return;
    }

    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);

    if (!press.dragging) {
      if (press.touch && moved > TOUCH_SLOP) {
        end();
      } else if (!press.touch && moved > MOUSE_SLOP) {
        start();
      }

      return;
    }

    press.slot = slotAt(framesOf(), event.clientX);
    markSlot(framesOf(), press.from, press.slot);
    scrollNear(strip, event.clientX);
  });
  strip.addEventListener('pointerup', () => {
    if (press?.dragging && press.slot !== null) {
      const { from, slot } = press;
      strip.dataset.justSorted = '1';
      setTimeout(() => delete strip.dataset.justSorted, 50);
      end();
      onMove(from, slot > from ? slot - 1 : slot);

      return;
    }

    end();
  });
  strip.addEventListener('pointercancel', end);
  // the click that ends a drag is not a click on a frame
  strip.addEventListener(
    'click',
    (event) => {
      if (strip.dataset.justSorted) {
        delete strip.dataset.justSorted;
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );
  // once a finger is dragging a frame, it must not scroll the page or the strip
  strip.addEventListener('touchmove', (event) => press?.dragging && event.preventDefault(), {
    passive: false,
  });
}
