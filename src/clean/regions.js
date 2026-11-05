const STEPS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function fill(mask, width, height, seeds) {
  const reached = new Uint8Array(mask.length);
  const queue = [];

  for (const seed of seeds) {
    if (mask[seed] && !reached[seed]) {
      reached[seed] = 1;
      queue.push(seed);
    }
  }

  while (queue.length) {
    const at = queue.pop();
    const x = at % width;
    const y = (at - x) / width;

    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      const next = ny * width + nx;

      if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[next] && !reached[next]) {
        reached[next] = 1;
        queue.push(next);
      }
    }
  }

  return reached;
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

      for (let j = 0; j < region.length; j++) {
        if (region[j]) {
          left[j] = 0;
        }
      }

      regions.push(region);
    }
  }

  return regions;
}

function opaqueAt(opaque, width, height, x, y) {
  return x >= 0 && y >= 0 && x < width && y < height && opaque[y * width + x] === 1;
}

// opaque cells touching (4-way) a transparent cell or the canvas edge
export function edgeCells(opaque, width, height) {
  const edge = new Uint8Array(opaque.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const touches = STEPS.some(([dx, dy]) => !opaqueAt(opaque, width, height, x + dx, y + dy));
      edge[y * width + x] = opaque[y * width + x] && touches ? 1 : 0;
    }
  }

  return edge;
}

export function despeckle(opaque, width, height) {
  const out = new Uint8Array(opaque.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const touches = STEPS.some(([dx, dy]) => opaqueAt(opaque, width, height, x + dx, y + dy));
      out[y * width + x] = opaque[y * width + x] && touches ? 1 : 0;
    }
  }

  return out;
}
