import { hsl, shadeFamilies } from './families.js';
import { newId } from '../model/project.js';

// the upper edge of each named stretch of the colour wheel, in degrees
const HUE_NAMES = [
  [15, 'Reds'],
  [40, 'Oranges'],
  [70, 'Yellows'],
  [165, 'Greens'],
  [200, 'Cyans'],
  [255, 'Blues'],
  [290, 'Purples'],
  [340, 'Pinks'],
  [360, 'Reds'],
];

function familyName(colors) {
  const { hue, saturation, light } = hsl(colors[Math.floor(colors.length / 2)]);

  if (saturation < 0.15 || light < 0.08) {
    return 'Greys';
  }

  return HUE_NAMES.find(([edge]) => hue < edge)[1];
}

// A first guess at the parts of a piece of art: one part per family of shades, named by its hue,
// to rename and adjust. Two families of one hue are told apart by number.
export function partsFromColours(colors) {
  const seen = new Map();

  return shadeFamilies(colors).map((family) => {
    const base = familyName(family);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);

    return { id: newId('part'), name: count > 1 ? `${base} ${count}` : base, colours: family };
  });
}
