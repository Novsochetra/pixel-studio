import { backgroundMask, detectBackground } from './background.js';
import { findGrid } from './grid.js';
import { rebuild } from './rebuild.js';
import { transparentCells } from './transparency.js';
import { despeckle } from './regions.js';
import { loneEdgeColours, mergeSimilar, ownPalette, snap } from './snap.js';

export const DEFAULTS = {
  tolerance: 60,
  holeMin: 6,
  merge: 30,
  cell: null,
  native: null,
  background: null,
};

// A cut-out PNG hides any colour (often black, which would match the outline) under its
// transparent pixels, so they are painted one flat key colour the background detection then
// finds on the border.
export function flatten({ width, height, data }) {
  const rgb = new Uint8Array(width * height * 3);
  let cutOut = false;

  for (let i = 0; i < width * height; i++) {
    const clear = data[i * 4 + 3] < 128;
    cutOut ||= clear;
    rgb.set(clear ? [255, 0, 255] : data.subarray(i * 4, i * 4 + 3), i * 3);
  }

  return { image: { width, height, rgb }, cutOut };
}

function cleanColors(cells, grid, { backgrounds, palette, merge }) {
  let out = cells;

  if (merge > 0 && !grid.exact) {
    out = { ...out, colors: mergeSimilar(out.colors, out.opaque, merge) };
  }

  if (palette || !grid.exact) {
    const own = ownPalette(out);
    out = loneEdgeColours(snap(out, palette ?? own, backgrounds));
  }

  return out;
}

// One image to native pixel art: { width, height, colors, opaque, cell, exact, backgrounds }.
export function analyze(imageData, options = {}, palette = null) {
  const settings = { ...DEFAULTS, ...options };
  const { image, cutOut } = flatten(imageData);
  const backgrounds = settings.keepBackground
    ? []
    : (settings.background ?? detectBackground(image));
  const isBg = backgroundMask(image, backgrounds, settings.tolerance);
  const grid = findGrid(image, isBg, settings, cutOut);
  const rebuilt = rebuild(image, isBg, grid);
  const clear = backgrounds.length
    ? transparentCells(rebuilt, settings.holeMin, settings.tolerance)
    : new Uint8Array(rebuilt.bg.length);
  const cells = { width: rebuilt.width, height: rebuilt.height, colors: rebuilt.colors };
  cells.opaque = clear.map((value) => (value ? 0 : 1));
  const cleaned = cleanColors(cells, grid, { backgrounds, palette, merge: settings.merge });

  return {
    ...cleaned,
    opaque: despeckle(cleaned),
    backgroundColors: rebuilt.colors,
    cell: [grid.sx, grid.sy],
    exact: grid.exact,
    backgrounds,
  };
}
