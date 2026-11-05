import { fromHex, unpack } from '../model/sprite.js';
import { rampOf } from './ramp.js';

// A character's parts are named groups of its colours ({ id, name, colours }), like a shirt or a
// cape. An outfit gives each part one base colour; the part's colours then take that colour's
// ramp, shade for shade.

export function luminance(color) {
  const [r, g, b] = unpack(color);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// an outfit's base colours ({ partId: '#hex' }) as ramps, shaded the way Naga Eleven shades kits
export function outfitRamps(parts, bases) {
  return Object.fromEntries(parts.filter((part) => bases[part.id]).map((part) => [part.id, rampOf(bases[part.id])]));
}

// Each part's colours, dark to light, take the ramp's shades by rank: the darkest gets the deepest
// shade, the lightest the lightest, as the game recolours its sheets shade for shade.
export function kitMapping(parts, ramps) {
  const mapping = {};

  for (const part of parts) {
    const own = [...part.colours].sort((a, b) => luminance(a) - luminance(b));
    const ramp = (ramps[part.id] ?? []).map(fromHex);

    if (!ramp.length) {
      continue;
    }

    own.forEach((color, i) => {
      const rank = own.length === 1 ? Math.floor((ramp.length - 1) / 2) + 1 : Math.round((i * (ramp.length - 1)) / (own.length - 1));
      mapping[color] = ramp[Math.min(rank, ramp.length - 1)];
    });
  }

  return mapping;
}

// colours claimed by two parts, which therefore cannot wear different colours
export function sharedColours(parts) {
  const seen = new Map();
  const shared = new Set();

  for (const part of parts) {
    for (const color of part.colours) {
      if (seen.has(color) && seen.get(color) !== part.id) {
        shared.add(color);
      }

      seen.set(color, part.id);
    }
  }

  return [...shared];
}
