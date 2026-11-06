import { unpack } from '../model/sprite.js';
import { luminance } from './kits.js';

function hsl(color) {
  const [red, green, blue] = unpack(color)
    .slice(0, 3)
    .map((value) => value / 255);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const span = high - low;
  const light = (high + low) / 2;

  if (span === 0) {
    return { hue: 0, saturation: 0, light };
  }

  const saturation = span / (1 - Math.abs(2 * light - 1));
  let hue =
    high === red
      ? ((green - blue) / span) % 6
      : high === green
        ? (blue - red) / span + 2
        : (red - green) / span + 4;
  hue = (hue * 60 + 360) % 360;

  return { hue, saturation, light };
}

const hueGap = (first, second) =>
  Math.min(Math.abs(first - second), 360 - Math.abs(first - second));

// Shades that belong together, dark to light: colours of a near hue (greys with greys), as the
// skin, shirt or hair ramps of a sprite are.
export function shadeFamilies(colors) {
  const families = [];

  for (const color of colors) {
    const own = hsl(color);
    const grey = own.saturation < 0.15 || own.light < 0.08;
    const family = families.find((candidate) =>
      candidate.grey ? grey : !grey && hueGap(candidate.hue, own.hue) <= 28,
    );

    if (family) {
      family.colors.push(color);
    } else {
      families.push({ hue: own.hue, grey, colors: [color] });
    }
  }

  return families.map((candidate) =>
    candidate.colors.sort((first, second) => luminance(first) - luminance(second)),
  );
}

// the next lighter (step 1) or darker (step -1) shade of the colour's family, or the colour itself
export function shiftShade(color, families, step) {
  const family = families.find((candidate) => candidate.includes(color));

  if (!family) {
    return color;
  }

  const index = family.indexOf(color) + step;

  return family[Math.max(0, Math.min(family.length - 1, index))];
}
