import { edgeCells } from './regions.js';

const colorAt = (colors, i) => [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]];
const distance = (first, second) =>
  Math.abs(first[0] - second[0]) + Math.abs(first[1] - second[1]) + Math.abs(first[2] - second[2]);
const lexical = (first, second) =>
  first[0] - second[0] || first[1] - second[1] || first[2] - second[2];

// distinct colours in lexical order (numpy's unique), each with how many cells use it
export function uniqueColors(colors, mask) {
  const counts = new Map();

  mask.forEach((on, i) => {
    if (on) {
      const key = colorAt(colors, i).join();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return [...counts.entries()]
    .map(([key, count]) => ({ color: key.split(',').map(Number), count }))
    .sort((first, second) => lexical(first.color, second.color));
}

// collapse near-identical shades (AI noise) into the most common of them
export function mergeSimilar(colors, opaque, tolerance) {
  const unique = uniqueColors(colors, opaque);
  const order = unique
    .map((_, i) => i)
    .sort((first, second) => unique[second].count - unique[first].count || first - second);
  const target = unique.map((_, i) => i);
  const keepers = [];

  for (const i of order) {
    const near = keepers.find(
      (keeper) => distance(unique[i].color, unique[keeper].color) <= tolerance,
    );

    if (near === undefined) {
      keepers.push(i);
    } else {
      target[i] = near;
    }
  }

  const lookup = new Map(unique.map((entry, i) => [entry.color.join(), unique[target[i]].color]));
  const out = Uint8Array.from(colors);

  opaque.forEach((on, i) => {
    if (on) {
      out.set(lookup.get(colorAt(colors, i).join()), i * 3);
    }
  });

  return out;
}

// colours that fill the inside of the sprite: a blend left by the background only shows on the
// outline, so it is not one of them
export function ownPalette({ colors, opaque, width, height }, minCount = 3) {
  const edge = edgeCells({ opaque, width, height });
  const inner = opaque.map((on, i) => (on && !edge[i] ? 1 : 0));
  const unique = uniqueColors(colors, inner);
  const common = unique.filter((entry) => entry.count >= minCount);

  return (common.length ? common : unique).map((entry) => entry.color);
}

// explain an outline colour as palette colour p over background b with coverage a
function unmix(color, palette, backgrounds) {
  const pure = palette.map((swatch) => distance(swatch, color));
  let bestIndex = pure.indexOf(Math.min(...pure));
  let bestCover = 1.0;
  let bestResid = pure[bestIndex];

  for (const bg of backgrounds) {
    const fits = palette.map((swatch) => {
      const span = [swatch[0] - bg[0], swatch[1] - bg[1], swatch[2] - bg[2]];
      const dot =
        (color[0] - bg[0]) * span[0] + (color[1] - bg[1]) * span[1] + (color[2] - bg[2]) * span[2];
      const cover = Math.min(
        Math.max(dot / (span[0] ** 2 + span[1] ** 2 + span[2] ** 2 + 1e-9), 0),
        1,
      );
      const mixed = [0, 1, 2].map(
        (channel) => bg[channel] + cover * span[channel] - color[channel],
      );

      return { cover, resid: Math.abs(mixed[0]) + Math.abs(mixed[1]) + Math.abs(mixed[2]) };
    });
    const j = fits.reduce((best, fit, index) => (fit.resid < fits[best].resid ? index : best), 0);

    // prefer the plain colour unless the blend explains the pixel clearly better
    if (fits[j].resid < 0.6 * bestResid) {
      bestIndex = j;
      bestCover = fits[j].cover;
      bestResid = fits[j].resid;
    }
  }

  return { index: bestIndex, cover: bestCover };
}

// Every opaque cell to its nearest palette colour; an outline cell that is mostly background
// becomes transparent (the fringe a soft edge leaves).
export function snap(cells, palette, backgrounds) {
  const { width, height, colors } = cells;
  const out = Uint8Array.from(colors);
  const opaque = Uint8Array.from(cells.opaque);
  const edge = edgeCells({ opaque: cells.opaque, width, height });

  cells.opaque.forEach((on, i) => {
    if (!on) {
      return;
    }

    const color = colorAt(colors, i);
    let index;

    if (edge[i] && backgrounds.length) {
      const fit = unmix(color, palette, backgrounds);
      index = fit.index;
      opaque[i] = fit.cover >= 0.5 ? 1 : 0;
    } else {
      const distances = palette.map((swatch) => distance(swatch, color));
      index = distances.indexOf(Math.min(...distances));
    }

    out.set(palette[index], i * 3);
  });

  return { ...cells, colors: out, opaque };
}

function neighbourColors(cells, x, y) {
  const { width, height, colors, opaque } = cells;
  const near = [];

  for (let j = Math.max(y - 1, 0); j < Math.min(y + 2, height); j++) {
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 2, width); i++) {
      if ((j !== y || i !== x) && opaque[j * width + i]) {
        near.push(colorAt(colors, j * width + i).join());
      }
    }
  }

  return near;
}

// An outline pixel whose colour none of its 8 neighbours share is a blend of background and
// outline that snapped to the wrong palette colour; it takes its neighbours' colour. Inside the
// sprite a lone pixel is detail (a highlight), so only the edge is touched.
export function loneEdgeColours(cells) {
  const { width, height, colors } = cells;
  const out = Uint8Array.from(colors);
  const edge = edgeCells({ opaque: cells.opaque, width, height });

  edge.forEach((on, i) => {
    if (!on) {
      return;
    }

    const x = i % width;
    const near = neighbourColors(cells, x, (i - x) / width);

    if (near.length && !near.includes(colorAt(colors, i).join())) {
      const count = (key) => near.filter((index) => index === key).length;
      const winner = near.reduce((best, key) => (count(key) > count(best) ? key : best));
      out.set(winner.split(',').map(Number), i * 3);
    }
  });

  return { ...cells, colors: out };
}
