import { unpack } from '../model/sprite.js';
import { luminance } from './kits.js';

function hsl(color) {
  const [r, g, b] = unpack(color).slice(0, 3).map((v) => v / 255);
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const span = high - low;
  const light = (high + low) / 2;

  if (span === 0) {
    return { hue: 0, saturation: 0, light };
  }

  const saturation = span / (1 - Math.abs(2 * light - 1));
  let hue = high === r ? ((g - b) / span) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4;
  hue = (hue * 60 + 360) % 360;

  return { hue, saturation, light };
}

const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Shades that belong together, dark to light: colours of a near hue (greys with greys), as the
// skin, shirt or hair ramps of a sprite are.
export function shadeFamilies(colors) {
  const families = [];

  for (const color of colors) {
    const own = hsl(color);
    const grey = own.saturation < 0.15 || own.light < 0.08;
    const family = families.find((f) => (f.grey ? grey : !grey && hueGap(f.hue, own.hue) <= 28));

    if (family) {
      family.colors.push(color);
    } else {
      families.push({ hue: own.hue, grey, colors: [color] });
    }
  }

  return families.map((f) => f.colors.sort((a, b) => luminance(a) - luminance(b)));
}

// the next lighter (step 1) or darker (step -1) shade of the colour's family, or the colour itself
export function shiftShade(color, families, step) {
  const family = families.find((f) => f.includes(color));

  if (!family) {
    return color;
  }

  const index = family.indexOf(color) + step;

  return family[Math.max(0, Math.min(family.length - 1, index))];
}
