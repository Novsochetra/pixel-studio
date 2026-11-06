import { newProject } from '../model/new-project.js';
import { dataUrlSprite } from '../io/images.js';
import { fromHex } from '../model/sprite.js';
import { newGuide } from '../views/guides.js';
import { SAMPLE_PARTS, SAMPLE_WAIST } from '../art/sample-palette.js';

// The example character for Naga Eleven: Sochetra's cleaned front, side and back views, with guide
// lines at his hair, eyes, waist and feet.
export async function sampleProject() {
  const project = newProject({ name: 'Sochetra' });
  const directions = project.animations[0].directions;
  const art = globalThis.SAMPLE ?? {};

  for (const [direction, key] of [
    ['south', 'front'],
    ['east', 'side'],
    ['north', 'back'],
  ]) {
    if (art[key]) {
      directions[direction].frames[0].layers[0].sprite = await dataUrlSprite(art[key]);
    }
  }

  project.parts = project.parts.map((part) => ({
    ...part,
    colours: (SAMPLE_PARTS[part.id] ?? []).map(fromHex),
  }));
  project.guides = [
    newGuide('Top of hair', 31, 'top'),
    newGuide('Eyes', 53, 'fixed'),
    newGuide('Waist', 85, 'colour-top', fromHex(SAMPLE_WAIST)),
    newGuide('Feet', 128, 'bottom'),
  ];

  return project;
}
