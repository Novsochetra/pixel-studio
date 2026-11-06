export const BRUSH_SIZES = { smallest: 1, biggest: 8 };

export const FIRST_BRUSH = { size: 1, shape: 'round' };

export function resizeBrush(brush, step) {
  const size = Math.min(BRUSH_SIZES.biggest, Math.max(BRUSH_SIZES.smallest, brush.size + step));

  return { ...brush, size };
}

// The quarter taken off the radius makes a 3-pixel brush a plus, as pixel artists draw one,
// instead of a full square; one and two pixels are too small to be anything but square.
function inCircle(size, [col, row]) {
  const centre = (size - 1) / 2;
  const radius = size / 2;

  return (col - centre) ** 2 + (row - centre) ** 2 < radius ** 2 - 0.25;
}

// an even size has no middle pixel, so it leans up and to the left of the pointer
export function brushOffsets({ size, shape }) {
  const start = -Math.floor(size / 2);
  const round = shape === 'round' && size > 2;
  const offsets = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!round || inCircle(size, [col, row])) {
        offsets.push([start + col, start + row]);
      }
    }
  }

  return offsets;
}
