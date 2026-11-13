import { bounds } from '../../model/sprite.js';

const DESK = { width: 440, height: 420 };
const MARGIN = 3;

// The room the art may take: beside the parts on a desk; on a phone above them, or beside them
// when it is held wide (what it paints and Zoom to part beside it, 87-body.css), and no more than
// leaves the parts their share of the screen. Shrunk by
// the stylesheet instead, the art was squashed and the brush painted beside the finger.
function roomFor({ innerWidth, innerHeight }) {
  if (innerWidth > 860) {
    return DESK;
  }

  return innerHeight < 500
    ? { width: innerWidth * 0.4 - 140, height: innerHeight - 210 }
    : { width: Math.min(DESK.width, innerWidth - 72), height: innerHeight * 0.34 - 20 };
}

// the part of the art that has pixels, with a margin, and how many times its size it is shown;
// `framed`: a smaller box to show, the part zoomed to
export function viewBox(source, screen = window, framed = null) {
  const box = framed ??
    bounds(source) ?? { left: 0, top: 0, right: source.width, bottom: source.height };
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

// Zoomed to a part: its pixels and some round them (viewBox's margin and one more), to paint
// what joins it, and never so few that a hand fills the window.
const AROUND = 1;
const LEAST = 16;

function grown(from, to, least) {
  const short = Math.max(0, least - (to - from));

  return [from - AROUND - Math.floor(short / 2), to + AROUND + Math.ceil(short / 2)];
}

export function partBox(owners, { width, height }, index) {
  let box = null;

  owners.forEach((owner, i) => {
    if (owner === index) {
      const [x, y] = [i % width, Math.floor(i / width)];

      box = box
        ? {
            left: Math.min(box.left, x),
            top: Math.min(box.top, y),
            right: Math.max(box.right, x + 1),
            bottom: Math.max(box.bottom, y + 1),
          }
        : { left: x, top: y, right: x + 1, bottom: y + 1 };
    }
  });

  if (!box) {
    return null;
  }

  const [left, right] = grown(box.left, box.right, LEAST);
  const [top, bottom] = grown(box.top, box.bottom, LEAST);

  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    right: Math.min(width, right),
    bottom: Math.min(height, bottom),
  };
}

// The whole art, or zoomed to the part picked. Framed again only as the zoom or the part
// changes: a frame that followed each stroke moved the art under the finger.
export function refit(job) {
  const key = `${job.zoomed}:${job.selected}`;

  if (job.view && job.viewKey === key) {
    return;
  }

  const framed = job.zoomed ? partBox(job.plan.owners, job.source, job.selected) : null;

  job.view = viewBox(job.source, window, framed);
  job.viewKey = key;
}
