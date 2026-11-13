import { unpack } from '../model/sprite.js';
import { luminance } from './kits.js';

// which sixth of the colour wheel the colour sits in, as a fraction: the hue before degrees
function hueSector({ red, green, blue }, high, span) {
  if (high === red) {
    return ((green - blue) / span) % 6;
  }

  return high === green ? (blue - red) / span + 2 : (red - green) / span + 4;
}

export function hsl(color) {
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
  const hue = (hueSector({ red, green, blue }, high, span) * 60 + 360) % 360;

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

const RAMP_STEP = 12;
const isGrey = ({ saturation, light }) => saturation < 0.15 || light < 0.08;

// hues in order, a new ramp where the next is further than a step away; the two ends join
// across red when they are near
function hueRuns(coloured) {
  const sorted = [...coloured].sort((first, second) => first.hue - second.hue);
  const runs = [];

  sorted.forEach((entry, i) => {
    const near = i > 0 && entry.hue - sorted[i - 1].hue <= RAMP_STEP;

    near ? runs.at(-1).push(entry) : runs.push([entry]);
  });

  if (runs.length > 1 && 360 - runs.at(-1).at(-1).hue + runs[0][0].hue <= RAMP_STEP) {
    runs[0].unshift(...runs.pop());
  }

  return runs;
}

// The ramps the light and dark brush steps along, dark to light: each colour joined to the
// colour of hue nearest it. Joined to a family's first colour within 28°, the shirt's reds and
// the skin's browns were one ramp, and Darker shades turned skin into shirt red.
export function shadeRamps(colors) {
  const all = colors.map((color) => ({ color, ...hsl(color) }));
  const greys = all.filter(isGrey);
  const runs = hueRuns(all.filter((entry) => !isGrey(entry)));

  return [...runs, ...(greys.length ? [greys] : [])].map((run) =>
    run.map(({ color }) => color).sort((first, second) => luminance(first) - luminance(second)),
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
