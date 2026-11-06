// A brush is { size, shape }: how many pixels across it paints, and whether it is 'round' or
// 'square'. The pencil, the eraser and the light and dark brush all paint with it.

export const BRUSH_SIZES = { smallest: 1, biggest: 8 };

export const FIRST_BRUSH = { size: 1, shape: 'round' };

// the brush one pixel bigger (step 1) or smaller (step -1), kept between the smallest and biggest
export function resizeBrush(brush, step) {
  const size = Math.min(BRUSH_SIZES.biggest, Math.max(BRUSH_SIZES.smallest, brush.size + step));

  return { ...brush, size };
}

// A pixel is in a round brush when its centre is inside the circle. The quarter taken off the
// radius makes a 3-pixel brush a plus, as pixel artists draw one, instead of a full square; one
// and two pixels are too small to be anything but square.
function inCircle(size, [col, row]) {
  const centre = (size - 1) / 2;
  const radius = size / 2;

  return (col - centre) ** 2 + (row - centre) ** 2 < radius ** 2 - 0.25;
}

// The pixels the brush covers, as [dx, dy] from the pixel under the pointer. An even size has no
// middle pixel, so it leans up and to the left of the pointer.
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
