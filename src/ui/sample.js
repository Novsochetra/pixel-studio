import { newProject } from '../model/project.js';
import { dataUrlSprite } from '../io/images.js';
import { fromHex } from '../model/sprite.js';
import { newGuide } from '../views/guides.js';

// The project the page opens with before anything is saved: Sochetra's cleaned front, side and
// back views, with guide lines at his hair, eyes, waist and feet.
export async function sampleProject() {
  const project = newProject();
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

  // the shirt's three reds, the shorts' blue and the yellow trim: what a team kit recolours
  project.parts = [
    { id: 'shirt', name: 'Shirt', colours: ['#850d19', '#b7101c', '#df2321'].map(fromHex) },
    { id: 'shorts', name: 'Shorts', colours: ['#283ca0'].map(fromHex) },
    { id: 'socks', name: 'Socks', colours: [] },
    { id: 'trim', name: 'Trim', colours: ['#fcb94c'].map(fromHex) },
  ];
  project.guides = [
    newGuide('Top of hair', 31, 'top'),
    newGuide('Eyes', 53, 'fixed'),
    newGuide('Waist', 85, 'colour-top', fromHex('#283ca0')),
    newGuide('Feet', 128, 'bottom'),
  ];

  return project;
}
