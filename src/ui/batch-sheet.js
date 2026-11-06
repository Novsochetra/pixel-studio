import { node, replace, toast } from './dom.js';
import { openSheet, previewCanvas } from './sheet.js';
import { currentAnimation, referenceSprite } from './actions.js';
import { keepVersion } from './versions-sheet.js';
import { batchItems, placeAll } from './batch/batch-items.js';
import { batchRow } from './batch/batch-row.js';
import { cleanImage } from '../io/cleaner.js';
import { decodeImage } from '../io/images.js';
import { referenceOf } from '../model/reference.js';
import { placementOf, viewName } from '../model/kinds.js';

// characters are matched to the reference, later frames keeping their own pixel size; anything
// else is cleaned on its own and placed as its kind stands
function cleanOptions(project, item) {
  if (project.kind !== 'character') {
    return { alone: true, ...placementOf(project) };
  }

  return { keepScale: item.placement !== '0' };
}

function statusText(report) {
  const scaled = report.scaled ? `, scaled ${report.scaled.fy.toFixed(2)}×` : '';

  return `${report.size[0]}×${report.size[1]} px${scaled}`;
}

async function cleanOne(state, item, ref) {
  try {
    const result = await cleanImage(
      await decodeImage(item.file),
      { width: ref.width, height: ref.height, data: ref.pixels },
      cleanOptions(state.project, item),
    );
    item.sprite = {
      width: result.width,
      height: result.height,
      pixels: new Uint8ClampedArray(result.pixels),
    };
    item.result = previewCanvas(item.sprite, state.project.guides, 1);
    item.status = node('span.hint', {}, statusText(result.report));
  } catch (error) {
    item.status = node(
      'span.hint',
      { style: { color: 'var(--bad)' } },
      `Could not clean: ${error.message}`,
    );
  }
}

function hintText(state) {
  const fill = `each view's images fill frames from frame ${state.at.frame + 1} on, in the order of their names.`;

  if (state.project.kind !== 'character') {
    return `The images fill frames from frame ${state.at.frame + 1} on, in the order of their names.`;
  }

  const reference = viewName(state.project, referenceOf(state.project)).toLowerCase();

  return `Each image is matched to the ${reference} view. Names with side, back or front pick their view; ${fill}`;
}

// Several AI images at once, each cleaned into its own view and frame, placed together in one step.
export function openBatchSheet(app, files) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const sheet = openSheet(`Clean ${files.length} images`);
  const list = node('div.view-list');
  const items = batchItems(state, files);
  const accept = node('button.btn.primary', { disabled: true }, 'Use them all');
  const draw = () =>
    replace(
      list,
      items.map((item) => batchRow(item, state.project, animation)),
    );
  const run = async () => {
    const ref = referenceSprite(state);

    for (const item of items) {
      item.status = node('span.hint', {}, 'Cleaning…');
      draw();
      await cleanOne(state, item, ref);
      draw();
    }

    accept.disabled = !items.some((item) => item.sprite);
  };

  accept.addEventListener('click', () => {
    keepVersion(app, `Before cleaning ${files.length} images`);
    placeAll(
      app,
      items.filter((item) => item.sprite),
    );
    toast('Cleaned images placed. A version from just before is in History.');
    sheet.close();
  });
  sheet.body.append(
    node('p.hint', {}, hintText(state)),
    list,
    node('div.sheet-actions', {}, node('button.btn', { onclick: sheet.close }, 'Cancel'), accept),
  );
  draw();
  run();
}
