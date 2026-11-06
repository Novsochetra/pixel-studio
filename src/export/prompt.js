import { outlineColour } from '../editor/outline.js';
import { directionLabel } from '../model/project.js';
import { bounds, toHex } from '../model/sprite.js';
import { KINDS, isSingleView, placementOf } from '../model/kinds.js';
import { KEY_BACKGROUND } from '../art/editor-colours.js';

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

function request(project, { animation, direction, task }) {
  const subject = KINDS[project.kind] ? project.kind : 'character';
  const single = isSingleView(project);

  if (task === 'more') {
    return `Draw another ${subject} in the same style as the attached reference sheet.`;
  }

  const what =
    task === 'frame'
      ? `the next frame of the "${animation}" animation${single ? '' : `, ${viewWords(direction)}`}`
      : `the ${viewWords(direction)}`;

  return `Draw ${what} of the same ${subject} as the attached reference sheet. Keep the same shapes, colours and proportions.`;
}

// where the art sits on the grid, in the numbers of the big copy the AI is shown
function sizeLine(project, box) {
  const { width, height, scale } = project.canvas;
  const { place } = placementOf(project);
  const bigSize = `${width * scale}×${height * scale}`;

  if (place === 'fill') {
    return `One tile, ${width}×${height} pixels, drawn as a solid square in the middle of the picture. It must be seamless: its left edge continues its right edge, its top edge its bottom.`;
  }

  if (place === 'centre') {
    return `Centred, no wider than ${width - 2} and no taller than ${height - 2} pixels (in the ${bigSize} image: ${(width - 2) * scale}×${(height - 2) * scale}), with empty space around it.`;
  }

  const tall = box.bottom - box.top;
  const middle = Math.round(((box.left + box.right) / 2) * scale);

  return `Exactly ${tall} pixels tall (${tall * scale} px in the ${bigSize} image): the top at y = ${box.top * scale}, the bottom at y = ${box.bottom * scale - 1}, centred at x = ${middle}.`;
}

// The prompt that makes an AI image fit: the grid, the size and place of the art, the colours.
// ask: { animation, direction, task, pose, reference, colours, marked }, where reference is the
// sprite everything is matched to and marked says the sheet carries marks.
export function promptText(project, ask) {
  const { width, height, scale } = project.canvas;
  const outline = outlineColour(ask.reference);
  const colours = ask.colours.map(toHex);
  const pose = ask.pose?.trim() ?? '';

  return [
    request(project, ask),
    '',
    `Pixel art on a ${width}×${height} pixel grid, upscaled ${scale}× to ${width * scale}×${height * scale} with no smoothing, so every pixel is an exact ${scale}×${scale} square.`,
    sizeLine(project, bounds(ask.reference)),
    colours.length ? `Use only these ${colours.length} colours: ${colours.join(' ')}.` : null,
    outline
      ? `A 1-pixel outline in ${toHex(outline)}. No anti-aliasing, no gradients, no soft edges.`
      : 'No anti-aliasing, no gradients, no soft edges.',
    `A flat magenta (${KEY_BACKGROUND}) background, nothing else in the picture.`,
    ask.marked ? 'The red marks and notes on the sheet show what to change.' : null,
    ask.task === 'frame' && pose ? `Pose: ${pose}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
