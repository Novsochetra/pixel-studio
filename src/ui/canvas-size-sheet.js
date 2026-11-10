import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { keepVersion } from './versions-sheet.js';
import { restoreProject } from './session.js';
import { numberInput } from './number-input.js';
import { CANVAS_LIMITS, canvasShift, withCanvasSize } from '../model/canvas-size.js';
import { isWholeBetween, wholeNumber } from '../model/numbers.js';
import { kindOf } from '../model/kinds.js';

const ANCHORS = [
  ['Top left', 0, 0],
  ['Top', 0.5, 0],
  ['Top right', 1, 0],
  ['Left', 0, 0.5],
  ['Centre', 0.5, 0.5],
  ['Right', 1, 0.5],
  ['Bottom left', 0, 1],
  ['Bottom', 0.5, 1],
  ['Bottom right', 1, 1],
].map(([label, x, y]) => ({ label, x, y }));

// what stands on its feet keeps them on the ground; anything else keeps its middle
const firstAnchor = (project) =>
  ANCHORS.find(({ label }) => label === (kindOf(project).place === 'feet' ? 'Bottom' : 'Centre'));

// Resolves to whether the canvas changed. Cut-off art cannot be undone, so with no version kept
// the canvas is left as it is.
async function resize(app, { size, anchor }) {
  const { project } = app.store.state;
  const [across] = canvasShift(project.canvas, size, anchor);
  const kept = await keepVersion(app, `Before the canvas became ${size.width}×${size.height}`);

  if (!kept) {
    toast('The project as it is could not be kept in History, so the canvas was left alone.');

    return false;
  }

  // read again: the save before it may have waited, and the project is whatever is open now
  await restoreProject(app, withCanvasSize(app.store.state.project, size, anchor));

  // the mirror line is counted from the canvas's left edge, which may have moved
  const { symmetry } = app.store.state;

  app.store.set({ symmetry: { ...symmetry, axisSum: symmetry.axisSum + 2 * across } });
  app.fitCanvas();
  toast(`The canvas is now ${size.width}×${size.height}. The one before is kept in History.`);

  return true;
}

function sizeField(label, id, value) {
  const input = numberInput({ id, label, ...CANVAS_LIMITS, value });

  return { input, field: node('label.field', {}, node('span', {}, label), input) };
}

function anchorGrid(job, draw) {
  return node(
    'div.anchor-grid',
    { role: 'group', 'aria-label': 'Keep the art at' },
    ANCHORS.map((anchor) =>
      node('button.btn', {
        title: anchor.label,
        'aria-label': anchor.label,
        'aria-pressed': String(job.anchor === anchor),
        onclick: () => {
          job.anchor = anchor;
          draw();
        },
      }),
    ),
  );
}

// each field is empty, to keep that size, or a size a canvas can have
const sizesCanBe = ({ width, height }) =>
  [width, height].every(
    ({ input }) => !input.value.trim() || isWholeBetween(input.value, CANVAS_LIMITS),
  );

// a size no canvas can have is said, and nothing is changed
function refuses(fields) {
  if (sizesCanBe(fields)) {
    return false;
  }

  toast(
    `Width and height are whole numbers of art pixels from ${CANVAS_LIMITS.min} to ${CANVAS_LIMITS.max}.`,
  );

  return true;
}

// a field left empty keeps the size the canvas has
const sizeOf = ({ width, height }, canvas) => ({
  width: wholeNumber(width.input.value, { ...CANVAS_LIMITS, fallback: canvas.width }),
  height: wholeNumber(height.input.value, { ...CANVAS_LIMITS, fallback: canvas.height }),
});

// The window stays over the canvas until the change is done: a stroke drawn meanwhile would land
// on the project being replaced.
async function changeSize(app, { fields, job, sheet }, button) {
  const { canvas } = app.store.state.project;

  if (refuses(fields)) {
    return;
  }

  const size = sizeOf(fields, canvas);

  if (size.width !== canvas.width || size.height !== canvas.height) {
    button.disabled = true;
    button.textContent = 'Changing the size…';
    await resize(app, { size, anchor: job.anchor }).catch(() =>
      toast('The canvas size could not be changed. Try again in a moment.'),
    );
  }

  sheet.close();
}

// Grow or shrink the canvas of the whole project: every view, frame and layer, the art kept where
// the anchor says. A version is kept first, as undo cannot bring cut-off art back.
export function openCanvasSizeSheet(app) {
  const { canvas } = app.store.state.project;
  const sheet = openSheet('Canvas size', null, { focusField: false });
  const fields = {
    width: sizeField('Width (art pixels)', 'canvas-width', canvas.width),
    height: sizeField('Height', 'canvas-height', canvas.height),
  };
  const job = { anchor: firstAnchor(app.store.state.project) };
  const anchors = node('div');
  const draw = () => replace(anchors, anchorGrid(job, draw));
  const change = node('button.btn.primary', {}, 'Change the size');
  const apply = () => changeSize(app, { fields, job, sheet }, change);
  const onEnter = (event) => event.key === 'Enter' && apply();

  change.addEventListener('click', apply);
  [fields.width, fields.height].forEach(({ input }) => input.addEventListener('keydown', onEnter));

  draw();
  sheet.body.append(
    node(
      'p.hint',
      {},
      `Now ${canvas.width}×${canvas.height}. Every view, frame and layer takes the new size; art left outside a smaller canvas is cut off. The project as it is now is kept in History first.`,
    ),
    node('div.compare.canvas-size-fields', {}, fields.width.field, fields.height.field),
    node('div.field', {}, node('span', {}, 'Keep the art at'), anchors),
    node('div.sheet-actions', {}, node('button.btn', { onclick: sheet.close }, 'Cancel'), change),
  );
}
