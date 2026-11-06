const STEPS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

const inside = ({ width, height }, x, y) => x >= 0 && y >= 0 && x < width && y < height;

// adds the unreached neighbours of `at` that are in the mask to the queue
function spread(flood, at) {
  const { mask, width, reached, queue } = flood;
  const x = at % width;
  const y = (at - x) / width;

  for (const [dx, dy] of STEPS) {
    const next = (y + dy) * width + x + dx;

    if (inside(flood, x + dx, y + dy) && mask[next] && !reached[next]) {
      reached[next] = 1;
      queue.push(next);
    }
  }
}

function fill(mask, width, height, seeds) {
  const flood = { mask, width, height, reached: new Uint8Array(mask.length), queue: [] };

  for (const seed of seeds) {
    if (mask[seed] && !flood.reached[seed]) {
      flood.reached[seed] = 1;
      flood.queue.push(seed);
    }
  }

  while (flood.queue.length) {
    spread(flood, flood.queue.pop());
  }

  return flood.reached;
}

// the part of `mask` connected (4-way) to the image border
export function floodFromBorder(mask, width, height) {
  const seeds = [];

  for (let x = 0; x < width; x++) {
    seeds.push(x, (height - 1) * width + x);
  }

  for (let y = 0; y < height; y++) {
    seeds.push(y * width, y * width + width - 1);
  }

  return fill(mask, width, height, seeds);
}

export function components(mask, width, height) {
  const left = Uint8Array.from(mask);
  const regions = [];

  for (let i = 0; i < left.length; i++) {
    if (left[i]) {
      const region = fill(left, width, height, [i]);

      region.forEach((on, j) => {
        if (on) {
          left[j] = 0;
        }
      });
      regions.push(region);
    }
  }

  return regions;
}

const opaqueAt = (cells, x, y) => inside(cells, x, y) && cells.opaque[y * cells.width + x] === 1;

// opaque cells touching (4-way) a transparent cell or the canvas edge; cells: { opaque, width,
// height }
export function edgeCells(cells) {
  const { opaque, width, height } = cells;
  const edge = new Uint8Array(opaque.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const touches = STEPS.some(([dx, dy]) => !opaqueAt(cells, x + dx, y + dy));

      edge[y * width + x] = opaque[y * width + x] && touches ? 1 : 0;
    }
  }

  return edge;
}

// opaque cells without an opaque neighbour are dropped
export function despeckle(cells) {
  const { opaque, width, height } = cells;
  const out = new Uint8Array(opaque.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const touches = STEPS.some(([dx, dy]) => opaqueAt(cells, x + dx, y + dy));

      out[y * width + x] = opaque[y * width + x] && touches ? 1 : 0;
    }
  }

  return out;
}
