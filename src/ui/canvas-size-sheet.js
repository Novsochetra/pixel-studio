import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { keepVersion } from './versions-sheet.js';
import { restoreProject } from './session.js';
import { numberInput } from './number-input.js';
import { CANVAS_LIMITS, canvasShift, withCanvasSize } from '../model/canvas-size.js';
import { wholeNumber } from '../model/numbers.js';
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

async function resize(app, { size, anchor }) {
  const { project } = app.store.state;
  const [across] = canvasShift(project.canvas, size, anchor);

  await keepVersion(app, `Before the canvas became ${size.width}×${size.height}`);
  await restoreProject(app, withCanvasSize(project, size, anchor));

  // the mirror line is counted from the canvas's left edge, which may have moved
  const { symmetry } = app.store.state;

  app.store.set({ symmetry: { ...symmetry, axisSum: symmetry.axisSum + 2 * across } });
  app.fitCanvas();
  toast(`The canvas is now ${size.width}×${size.height}. The one before is kept in History.`);
}

function sizeField(label, id, value) {
  const input = numberInput({ id, label, max: CANVAS_LIMITS.max, value });

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

const sizeOf = ({ width, height }) => ({
  width: wholeNumber(width.input.value, { ...CANVAS_LIMITS, fallback: CANVAS_LIMITS.min }),
  height: wholeNumber(height.input.value, { ...CANVAS_LIMITS, fallback: CANVAS_LIMITS.min }),
});

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
  const apply = () => {
    const size = sizeOf(fields);

    sheet.close();

    if (size.width !== canvas.width || size.height !== canvas.height) {
      resize(app, { size, anchor: job.anchor }).catch((error) => toast(error.message));
    }
  };

  draw();
  sheet.body.append(
    node(
      'p.hint',
      {},
      `Now ${canvas.width}×${canvas.height}. Every view, frame and layer takes the new size; art left outside a smaller canvas is cut off. The project as it is now is kept in History first.`,
    ),
    node('div.compare.canvas-size-fields', {}, fields.width.field, fields.height.field),
    node('div.field', {}, node('span', {}, 'Keep the art at'), anchors),
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: sheet.close }, 'Cancel'),
      node('button.btn.primary', { onclick: apply }, 'Change the size'),
    ),
  );
}
