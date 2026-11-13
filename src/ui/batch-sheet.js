import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { currentAnimation } from './actions.js';
import { keepVersion } from './versions-sheet.js';
import { keepFocus } from './keep-focus.js';
import { batchItems, placeAll } from './batch/batch-items.js';
import { batchRow } from './batch/batch-row.js';
import { batchGrowOffer } from './batch/batch-grow.js';
import { cleanEach } from './batch/batch-clean.js';
import { cancelGrowth } from './import/keep-size.js';
import { decodeImage } from '../io/images.js';
import { referenceOf } from '../model/reference.js';
import { viewName } from '../model/kinds.js';

function hintText(state) {
  const fill = `each view's images fill frames from frame ${state.at.frame + 1} on, in the order of their names.`;

  if (state.project.kind !== 'character') {
    return `The images fill frames from frame ${state.at.frame + 1} on, in the order of their names.`;
  }

  const reference = viewName(state.project, referenceOf(state.project)).toLowerCase();

  return `Each image is cleaned to match the ${reference} view. A name with side, back or front says its view, and one that says none goes to the next view; ${fill}`;
}

// Several AI images at once, each cleaned into its own view and frame, placed together in one step.
// Only pictures the browser can open are planned. One that cannot took a frame's place all the
// same: its frame was left empty and the next picture pushed on to a new one.
async function readable(files) {
  const tried = await Promise.all(
    [...files].map((file) =>
      decodeImage(file).then(
        () => file,
        () => null,
      ),
    ),
  );

  return tried.filter(Boolean);
}

const leftOutText = (count) =>
  count === 1
    ? '1 file is not a picture the browser can open, and was left out.'
    : `${count} files are not pictures the browser can open, and were left out.`;

export async function openBatchSheet(app, files) {
  const images = await readable(files);
  const leftOut = files.length - images.length;

  if (images.length) {
    showBatch(app, images, leftOut);
  } else {
    toast(leftOutText(leftOut));
  }
}

function drawRows(job) {
  const animation = currentAnimation(job.state);

  keepFocus(job.list, () =>
    replace(
      job.list,
      job.items.map((item) => batchRow(item, job.state.project, animation)),
    ),
  );
}

function runBatch(job) {
  const { app, items, outcome } = job;

  return cleanEach(job.state, items, job).then(() =>
    replace(job.offer, batchGrowOffer(app, items, { outcome, cleanAgain: () => cleanAgain(job) })),
  );
}

// on the larger canvas, every picture is cleaned again from the start
function cleanAgain(job) {
  job.items.forEach((item) => Object.assign(item, { sprite: null, result: null, status: null }));
  job.scales = { ...job.app.store.state.project.cleanScales };
  job.accept.disabled = true;
  replace(job.offer);
  job.draw();
  runBatch(job);
}

function acceptAll(job) {
  const { app, files, items } = job;

  job.outcome.used = true;
  keepVersion(app, `Before cleaning ${files.length} images`);
  // before the step, so it is saved with it
  app.store.state.project.cleanScales = job.scales;
  placeAll(
    app,
    items.filter((item) => item.sprite),
  );
  toast('Cleaned images placed. A version from just before is in History.');
  job.sheet.close();
}

function showBatch(app, files, leftOut) {
  const { state } = app.store;
  const title = `Clean ${files.length === 1 ? '1 image' : `${files.length} images`}`;
  const outcome = { grew: false, used: false };
  // the keys start on the window, and come to Use them all when the cleaning is done: on the
  // first row, they fell to nothing as the rows were drawn again, and Tab then Enter closed the
  // window and threw the cleaning away
  const sheet = openSheet(title, () => cancelGrowth(app, outcome), {
    wide: true,
    focusField: 'window',
  });
  const job = {
    app,
    state,
    files,
    outcome,
    sheet,
    list: node('div.view-list'),
    offer: node('div'),
    items: batchItems(state, files),
    accept: node('button.btn.primary', { disabled: true }, 'Use them all'),
    scales: { ...state.project.cleanScales },
  };

  job.draw = () => drawRows(job);
  job.accept.addEventListener('click', () => acceptAll(job));
  // the browser's own append writes a null out as the word: only what is there is appended
  sheet.body.append(
    ...[
      node('p.hint', {}, hintText(state)),
      leftOut ? node('p.hint', {}, leftOutText(leftOut)) : null,
      job.offer,
      job.list,
      node(
        'div.sheet-actions',
        {},
        node('button.btn', { onclick: sheet.close }, 'Cancel'),
        job.accept,
      ),
    ].filter(Boolean),
  );
  job.draw();
  runBatch(job);
}
