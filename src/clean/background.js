import { medianColor } from './numeric.js';

function borderPixels(image, depth = 4) {
  const { width, height, rgb } = image;
  const pixels = [];
  const add = (x, y) => {
    const i = (y * width + x) * 3;
    pixels.push([rgb[i], rgb[i + 1], rgb[i + 2]]);
  };

  const rows = [...Array(depth).keys()];

  for (const y of [...rows, ...rows.map((row) => height - depth + row)]) {
    for (let x = 0; x < width; x++) {
      add(x, y);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let d = 0; d < depth; d++) {
      add(d, y);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let d = 0; d < depth; d++) {
      add(width - depth + d, y);
    }
  }

  return pixels;
}

// every colour covering at least `share` of the border: one for magenta, two for a checkerboard
export function detectBackground(image, share = 0.1) {
  const pixels = borderPixels(image);
  const groups = new Map();

  for (const pixel of pixels) {
    const key = Math.floor(pixel[0] / 24) * 4096 + Math.floor(pixel[1] / 24) * 64 + Math.floor(pixel[2] / 24);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(pixel);
  }

  return [...groups.keys()]
    .sort((a, b) => a - b)
    .filter((key) => groups.get(key).length >= share * pixels.length)
    .map((key) => medianColor(groups.get(key)));
}

export function backgroundMask(image, backgrounds, tolerance) {
  const { width, height, rgb } = image;
  const mask = new Uint8Array(width * height);

  if (!backgrounds.length) {
    return mask;
  }

  // pixel_clean.py compares against the colours truncated to whole numbers
  const whole = backgrounds.map((bg) => bg.map(Math.trunc));

  for (let i = 0; i < width * height; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const nearest = Math.min(
      ...whole.map((bg) => Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2])),
    );
    mask[i] = nearest <= tolerance ? 1 : 0;
  }

  return mask;
}
