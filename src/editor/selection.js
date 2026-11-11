import { CLEAR, getPixel, setPixel } from '../model/sprite.js';

// A selection is a mask over the canvas: { width, height, cells: Uint8Array }.

// the box between two corners, clipped to the canvas ({ width, height })
export function rectSelection({ width, height }, [x0, y0], [x1, y1]) {
  const cells = new Uint8Array(width * height);
  const [left, right] = [Math.max(0, Math.min(x0, x1)), Math.min(width - 1, Math.max(x0, x1))];
  const [top, bottom] = [Math.max(0, Math.min(y0, y1)), Math.min(height - 1, Math.max(y0, y1))];

  for (let y = top; y <= bottom; y++) {
    cells.fill(1, y * width + left, y * width + right + 1);
  }

  return { width, height, cells };
}

function everywhere(sprite, target) {
  const cells = new Uint8Array(sprite.width * sprite.height);

  for (let i = 0; i < cells.length; i++) {
    cells[i] = getPixel(sprite, i % sprite.width, Math.floor(i / sprite.width)) === target ? 1 : 0;
  }

  return cells;
}

function connected(sprite, [x, y], target) {
  const { width, height } = sprite;
  const cells = new Uint8Array(width * height);
  const stack = [[x, y]];

  while (stack.length) {
    const [px, py] = stack.pop();
    const inside = px >= 0 && py >= 0 && px < width && py < height;

    if (inside && !cells[py * width + px] && getPixel(sprite, px, py) === target) {
      cells[py * width + px] = 1;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  return cells;
}

// Pixels of the clicked colour: touching it (4-way) or, with `anywhere`, anywhere. A clear pixel
// has no colour to select: null, where every clear pixel of an empty canvas was "selected".
export function colourSelection(sprite, x, y, anywhere) {
  const target = getPixel(sprite, x, y);

  if (target === CLEAR) {
    return null;
  }
  const cells = anywhere ? everywhere(sprite, target) : connected(sprite, [x, y], target);

  return { width: sprite.width, height: sprite.height, cells };
}

export function isSelected(selection, x, y) {
  return Boolean(
    selection &&
    x >= 0 &&
    y >= 0 &&
    x < selection.width &&
    y < selection.height &&
    selection.cells[y * selection.width + x],
  );
}

// the selected pixels as [{ x, y, color }]: a clipboard, or what a move lifts
export function liftPixels(sprite, selection) {
  const lifted = [];

  selection.cells.forEach((on, i) => {
    if (on) {
      const x = i % selection.width;
      const y = (i - x) / selection.width;

      lifted.push({ x, y, color: getPixel(sprite, x, y) });
    }
  });

  return lifted;
}

export function clearSelected(sprite, selection) {
  for (const { x, y } of liftPixels(sprite, selection)) {
    setPixel(sprite, x, y, CLEAR);
  }
}

// Stamps pixels at an offset; transparent ones leave what is below. Returns the mask they cover.
export function stampPixels(sprite, pixels, dx, dy) {
  const cells = new Uint8Array(sprite.width * sprite.height);

  for (const { x, y, color } of pixels) {
    const tx = x + dx;
    const ty = y + dy;

    if (tx >= 0 && ty >= 0 && tx < sprite.width && ty < sprite.height) {
      cells[ty * sprite.width + tx] = 1;

      if (color !== CLEAR) {
        setPixel(sprite, tx, ty, color);
      }
    }
  }

  return { width: sprite.width, height: sprite.height, cells };
}

// moves the selected pixels by (dx, dy) on the sprite; returns the moved selection
export function moveSelected(sprite, selection, dx, dy) {
  const lifted = liftPixels(sprite, selection);

  clearSelected(sprite, selection);

  return stampPixels(sprite, lifted, dx, dy);
}

// Half a pixel goes up for a box wider than tall and down for one taller than wide: a box whose
// sides differ by an odd number has no middle pixel to turn about, and rounding the same way at
// every turn walked it a pixel across the canvas each time.
const snap = (value, box) =>
  box.right - box.left >= box.bottom - box.top ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);

// a plain loop: the box is asked for several times at every move of the pointer, and a callback
// for every cell of a large canvas was what a selection being dragged waited for
export function selectionBox(selection) {
  const { width, cells } = selection;
  let box = null;

  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) {
      const x = i % width;
      const y = (i - x) / width;

      box ??= { left: x, top: y, right: x, bottom: y };
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.bottom = y;
    }
  }

  return box;
}

const TRANSFORMS = {
  'flip-x': (x, y, box) => [box.left + box.right - x, y],
  'flip-y': (x, y, box) => [x, box.top + box.bottom - y],
  'rotate-cw': (x, y, box) => {
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;

    return [snap(cx - (y - cy), box), snap(cy + (x - cx), box)];
  },
  'rotate-ccw': (x, y, box) => {
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;

    return [snap(cx + (y - cy), box), snap(cy - (x - cx), box)];
  },
};

// pixels ([{ x, y, color }]) flipped or turned about the middle of their box
export function transformPixels(pixels, kind, box) {
  return pixels.map(({ x, y, color }) => {
    const [tx, ty] = TRANSFORMS[kind](x, y, box);

    return { x: tx, y: ty, color };
  });
}

// flips or turns the selected pixels in place (about the middle of the selection); returns the
// selection they now cover
export function transformSelected(sprite, selection, kind) {
  const box = selectionBox(selection);

  if (!box) {
    return selection;
  }

  const lifted = liftPixels(sprite, selection);
  clearSelected(sprite, selection);

  return stampPixels(sprite, transformPixels(lifted, kind, box), 0, 0);
}
