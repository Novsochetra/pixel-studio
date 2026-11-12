import { CANVAS_LIMITS } from './canvas-size.js';

// canvases come in the sizes games use: 48, 64, 96
const STEP = 8;
const upTo = (size) => Math.ceil(size / STEP) * STEP;

// the room a cleaned picture is given: its feet stand on the ground line with four rows of air
// over its head, or it keeps a pixel of margin all round (clean/alone.js)
function roomFor({ drawnWidth, drawnHeight, wantedHeight }, [sx, sy], { place, ground }) {
  const height = wantedHeight ?? drawnHeight;
  const wide = drawnWidth * (height / drawnHeight);
  const tall = place === 'centre' ? height + 2 : Math.ceil((height + 4) / (ground ?? 0.8));

  return { width: Math.ceil(wide * (sx / sy)) + 2, height: tall };
}

// whether the art came out smaller than it was meant to be: its own height, or one asked for
const madeSmaller = ({ fy, drawnHeight, wantedHeight }) =>
  fy * drawnHeight < (wantedHeight ?? drawnHeight) - 0.5;

// The canvas on which a picture made smaller to fit would keep its own pixel size: null when it
// kept it, when it fills the canvas as a tile does, or when no canvas is that large. A square
// canvas stays square.
export function canvasToKeep(report, canvas, placement) {
  const { scaled, cell } = report;

  if (placement.place === 'fill' || !scaled?.drawnWidth || !madeSmaller(scaled)) {
    return null;
  }

  const room = roomFor(scaled, cell, placement);
  const width = upTo(Math.max(canvas.width, room.width));
  const height = upTo(Math.max(canvas.height, room.height));
  const side = Math.max(width, height);
  const size = canvas.width === canvas.height ? { width: side, height: side } : { width, height };

  return Math.max(size.width, size.height) > CANVAS_LIMITS.max ? null : size;
}
