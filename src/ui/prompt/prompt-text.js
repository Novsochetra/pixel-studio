import { currentAnimation, referenceSprite } from '../actions.js';
import { characterColors } from '../character-colours.js';
import { outlineColour } from '../../editor/outline.js';
import { hasMarks } from '../markup.js';
import { directionLabel } from '../../model/project.js';
import { bounds, toHex } from '../../model/sprite.js';
import { kindOf, placementOf } from '../../model/kinds.js';
import { KEY_BACKGROUND } from '../../art/editor-colours.js';

const VIEW_WORDS = {
  south: 'front view, facing the camera',
  'south-east': 'three-quarter front view, turned toward the right',
  east: 'side view, facing right',
  'north-east': 'three-quarter back view, turned away toward the right',
  north: 'back view, facing away from the camera',
  'north-west': 'three-quarter back view, turned away toward the left',
  west: 'side view, facing left',
  'south-west': 'three-quarter front view, turned toward the left',
};

const viewWords = (direction) =>
  VIEW_WORDS[direction] ?? `${directionLabel(direction).toLowerCase()} view`;

const SUBJECT = {
  character: 'character',
  object: 'object',
  tile: 'tile',
  effect: 'effect',
  icon: 'icon',
};

// what to draw: a view, the next frame, or another of the same kind in the same style
function request(state, direction, task) {
  const subject = SUBJECT[state.project.kind] ?? 'character';
  const single = Boolean(kindOf(state.project).view);
  const animation = currentAnimation(state).name;

  if (task === 'more') {
    return `Draw another ${subject} in the same style as the attached reference sheet.`;
  }

  const what =
    task === 'frame'
      ? `the next frame of the "${animation}" animation${single ? '' : `, ${viewWords(direction)}`}`
      : `the ${viewWords(direction)}`;

  return `Draw ${what} of the same ${subject} as the attached reference sheet. Keep the same shapes, colours and proportions.`;
}

// where the art sits on the grid, in the numbers of the big copy
function sizeLine(state, box) {
  const { width, height, scale } = state.project.canvas;
  const { place } = placementOf(state.project);
  const big = `${width * scale}×${height * scale}`;

  if (place === 'fill') {
    return `One tile, ${width}×${height} pixels, drawn as a solid square in the middle of the picture. It must be seamless: its left edge continues its right edge, its top edge its bottom.`;
  }

  if (place === 'centre') {
    return `Centred, no wider than ${width - 2} and no taller than ${height - 2} pixels (in the ${big} image: ${(width - 2) * scale}×${(height - 2) * scale}), with empty space around it.`;
  }

  const tall = box.bottom - box.top;
  const middle = Math.round(((box.left + box.right) / 2) * scale);

  return `Exactly ${tall} pixels tall (${tall * scale} px in the ${big} image): the top at y = ${box.top * scale}, the bottom at y = ${box.bottom * scale - 1}, centred at x = ${middle}.`;
}

// The prompt that makes an AI image fit: the grid, the size and place of the art, the colours.
export function promptText(state, direction, task) {
  const { width, height, scale } = state.project.canvas;
  const ref = referenceSprite(state);
  const colours = characterColors(state).map(toHex);
  const outline = outlineColour(ref);

  return [
    request(state, direction, task),
    '',
    `Pixel art on a ${width}×${height} pixel grid, upscaled ${scale}× to ${width * scale}×${height * scale} with no smoothing, so every pixel is an exact ${scale}×${scale} square.`,
    sizeLine(state, bounds(ref)),
    colours.length ? `Use only these ${colours.length} colours: ${colours.join(' ')}.` : null,
    outline
      ? `A 1-pixel outline in ${toHex(outline)}. No anti-aliasing, no gradients, no soft edges.`
      : 'No anti-aliasing, no gradients, no soft edges.',
    `A flat magenta (${KEY_BACKGROUND}) background, nothing else in the picture.`,
    hasMarks(state.project) ? 'The red marks and notes on the sheet show what to change.' : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
