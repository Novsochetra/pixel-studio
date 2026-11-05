// Naga Eleven's own ramp maker (src/art/ramp.js), so a custom kit shades exactly like the game's kits.
// A kit is painted from one base colour per part; its ramp of four shades (deep, shade, base,
// light) turns toward blue as it darkens and toward warm yellow as it lightens, as a pixel artist
// shades, instead of only getting darker
const COOL_HUE = 235;
const WARM_HUE = 50;

const STEPS = [
  { light: 0.5, hue: -16, saturation: 0.08 },
  { light: 0.74, hue: -8, saturation: 0.04 },
  { light: 1, hue: 0, saturation: 0 },
  { light: 1.22, hue: 7, saturation: 0.02 },
];

function hueOf([red, green, blue], high, span) {
  if (high === red) {
    return 60 * (((green - blue) / span + 6) % 6);
  }

  return high === green ? 60 * ((blue - red) / span + 2) : 60 * ((red - green) / span + 4);
}

function toHsl(hex) {
  const [red, green, blue] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const light = (high + low) / 2;
  const span = high - low;

  if (span === 0) {
    return { hue: COOL_HUE, saturation: 0, light };
  }

  const saturation = span / (1 - Math.abs(2 * light - 1));

  return { hue: hueOf([red, green, blue], high, span), saturation, light };
}

const channel = (value) =>
  Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, '0');

function toHex({ hue, saturation, light }) {
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const sector = Math.floor((((hue % 360) + 360) % 360) / 60);
  const order = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][sector];
  const lift = light - chroma / 2;

  return `#${order.map((value) => channel(value + lift)).join('')}`;
}

// turns a hue a little of the way toward another, the short way round the wheel
function hueToward(hue, target, degrees) {
  const gap = ((target - hue + 540) % 360) - 180;

  return hue + Math.sign(gap) * Math.min(Math.abs(gap), Math.abs(degrees));
}

function shadeOf(base, { light, hue, saturation }) {
  const target = hue < 0 ? COOL_HUE : WARM_HUE;
  const lift = Math.min((1 - base.light) * (light - 1) * 0.85, base.light * 0.4 + 0.05);
  const lighter = light > 1 ? base.light + lift : base.light * light;

  return toHex({
    hue: hueToward(base.hue, target, hue),
    saturation: Math.min(1, Math.max(0, base.saturation + saturation)),
    light: lighter,
  });
}

// a white kit keeps its light shade white and finds its shadows in a cool blue grey, whatever
// warmth its base has
const nearWhite = (base) => base.light > 0.86;

const WHITE_STEPS = [
  { light: 0.6, saturation: 0.18 },
  { light: 0.78, saturation: 0.16 },
];

function whiteRampOf(colour, base) {
  const shadows = WHITE_STEPS.map((step) => toHex({ hue: 222, ...step }));

  return [...shadows, colour, toHex({ ...base, light: Math.min(1, base.light + 0.05) })];
}

export function rampOf(colour) {
  if (Array.isArray(colour)) {
    return colour;
  }

  const base = toHsl(colour);

  return nearWhite(base) ? whiteRampOf(colour, base) : STEPS.map((step) => shadeOf(base, step));
}
