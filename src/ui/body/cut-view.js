import { bounds } from '../../model/sprite.js';

const DESK = { width: 440, height: 420 };
const MARGIN = 3;

// The room the art may take: beside the parts on a desk; on a phone above them, or beside them
// when it is held wide, and no more than leaves the parts their share of the screen. Shrunk by
// the stylesheet instead, the art was squashed and the brush painted beside the finger.
function roomFor({ innerWidth, innerHeight }) {
  if (innerWidth > 860) {
    return DESK;
  }

  return innerHeight < 500
    ? { width: innerWidth * 0.4 - 40, height: innerHeight - 190 }
    : { width: Math.min(DESK.width, innerWidth - 72), height: innerHeight * 0.34 };
}

// the part of the art that has pixels, with a margin, and how many times its size it is shown
export function viewBox(source, screen = window) {
  const box = bounds(source) ?? { left: 0, top: 0, right: source.width, bottom: source.height };
  const room = roomFor(screen);
  const left = Math.max(0, box.left - MARGIN);
  const top = Math.max(0, box.top - MARGIN);
  const width = Math.min(source.width, box.right + MARGIN) - left;
  const height = Math.min(source.height, box.bottom + MARGIN) - top;
  const fit = Math.min(room.width / width, room.height / height);
  // whole pixels where there is room for two or more; under that, a quarter more is worth having
  const scale = fit >= 2 ? Math.floor(fit) : Math.max(1, Math.floor(fit * 4) / 4);

  return { left, top, width, height, scale };
}
