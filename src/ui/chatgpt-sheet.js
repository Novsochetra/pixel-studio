import { h, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { currentAnimation, referenceSprite } from './actions.js';
import { boardCanvas, boardPreview } from './board-canvas.js';
import { characterColors } from './character-colours.js';
import { directionLabel } from '../model/project.js';
import { drawableDirections } from '../model/profiles.js';
import { bounds, toHex } from '../model/sprite.js';
import { canvasToBlob } from '../io/images.js';
import { saveFile } from './save-file.js';
import { outlineColour } from '../editor/outline.js';
import { hasMarks } from './markup.js';
import { referenceOf } from '../model/reference.js';

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

const viewWords = (direction) => VIEW_WORDS[direction] ?? `${directionLabel(direction).toLowerCase()} view`;

// the numbers that make a new view fit: canvas, scale, height, feet and top rows, colours
export function promptText(state, direction, task) {
  const { width, height, scale } = state.project.canvas;
  const ref = referenceSprite(state);
  const box = bounds(ref);
  const tall = box.bottom - box.top;
  const colours = characterColors(state).map(toHex);
  const outline = outlineColour(ref);
  const animation = currentAnimation(state);
  const what = task === 'frame' ? `the next frame of the "${animation.name}" animation, ${viewWords(direction)}` : `the ${viewWords(direction)}`;

  return [
    `Draw ${what} of the same character as the attached reference sheet. Keep the same face, hair, clothes, colours and proportions.`,
    '',
    `Pixel art on a ${width}×${height} pixel grid, upscaled ${scale}× to ${width * scale}×${height * scale} with no smoothing, so every pixel is an exact ${scale}×${scale} square.`,
    `The character is exactly ${tall} pixels tall (${tall * scale} px in the ${width * scale}×${height * scale} image): the top of the hair at y = ${box.top * scale}, the bottom of the feet at y = ${box.bottom * scale - 1}, centred at x = ${Math.round(((box.left + box.right) / 2) * scale)}.`,
    `Use only these ${colours.length} colours: ${colours.join(' ')}.`,
    outline ? `A 1-pixel outline in ${toHex(outline)}. No anti-aliasing, no gradients, no soft edges.` : 'No anti-aliasing, no gradients, no soft edges.',
    'A flat magenta (#FF00FF) background, nothing else in the picture.',
    ...(hasMarks(state.project) ? ['The red marks and notes on the sheet show what to change.'] : []),
  ].join('\n');
}

export function openChatgptSheet(app) {
  const { state } = app.store;
  const sheet = openSheet('Ask ChatGPT for a new view');
  const ref = referenceSprite(state);

  // the prompt is made of the reference view's numbers, so that view has to be drawn first
  if (!ref || !bounds(ref)) {
    sheet.body.append(
      h('p.hint', {}, `The ${directionLabel(referenceOf(state.project)).toLowerCase()} view, which every other view is matched to, is empty. Clean or draw it first: every other view is asked for at its size, with its colours.`),
      h('div.sheet-actions', {}, h('button.btn.primary', { onclick: sheet.close }, 'OK')),
    );

    return;
  }

  const slot = h('div', { style: { display: 'grid', gap: '12px' } });
  let direction = Object.keys(currentAnimation(state).directions).find((d) => d !== referenceOf(state.project)) ?? 'east';
  let task = 'view';
  const scale = state.project.canvas.scale;

  const draw = () => {
    const board = boardCanvas(state, scale, { overlay: null, mapping: null });
    const preview = boardPreview(state, 860, { overlay: null, mapping: null });
    const text = promptText(state, direction, task);
    const box = h('textarea.input.mono', { rows: 9, id: 'prompt-text', 'aria-label': 'Prompt', readonly: true }, text);
    const copy = () => navigator.clipboard.writeText(text).then(() => toast('Prompt copied'), () => { box.select(); toast('Press ⌘C to copy'); });

    replace(
      slot,
      h('div.group', { style: { gap: '8px', flexWrap: 'wrap' } },
        h('select.input', { id: 'ask-direction', 'aria-label': 'Which view to ask for', onchange: (event) => { direction = event.target.value; draw(); } }, drawableDirections(state.project).map((id) => h('option', { value: id, selected: id === direction }, directionLabel(id)))),
        h('div.segmented', { role: 'group', 'aria-label': 'Ask for' }, [['view', 'A new view'], ['frame', 'An animation frame']].map(([id, label]) => h('button', { 'aria-pressed': String(task === id), onclick: () => { task = id; draw(); } }, label)))),
      h('div', { style: { overflowX: 'auto' } }, preview),
      h('p.hint', {}, `Attach the reference sheet (${board.width}×${board.height}, ${scale}× pixels${hasMarks(state.project) ? ', with your marks' : ''}) and paste the prompt. Then drop ChatGPT's answer on the canvas to clean it.`),
      box,
      h('div.sheet-actions', {},
        h('button.btn', { onclick: sheet.close }, 'Close'),
        h('button.btn', { onclick: copy }, 'Copy the prompt'),
        h('button.btn.primary', { onclick: async () => saveFile('reference-sheet.png', await canvasToBlob(board)) }, 'Download the reference sheet')),
    );
  };

  sheet.body.append(slot);
  draw();
}
