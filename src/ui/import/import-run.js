import { node, replace } from '../dom.js';
import { previewCanvas } from '../sheet.js';
import { referenceSprite } from '../actions.js';
import { cleanImage } from '../../io/cleaner.js';
import { isPose, referenceOf } from '../../model/reference.js';
import { placementOf, standsOn, viewName } from '../../model/kinds.js';
import { artHeight, reportText } from './import-report.js';
import { cleanAtViewScale, scaleOf } from './view-scale.js';
import { keepSizeOffer } from './keep-size.js';
import { inWords } from '../../model/told.js';

const FAILED =
  'Use a PNG or WebP of one subject on a flat background (an AI image’s magenta works best).';

// A picture of the cleaning window says how wide it is for its height: in a short window it
// keeps to a share of the height (60-sheets.css), and is as wide as that makes it.
export function shaped(picture, { width, height }) {
  picture.style.setProperty('--ratio', String(width / height));

  return picture;
}

function figure(sprite, guides, caption) {
  return node(
    'figure',
    {},
    shaped(previewCanvas(sprite, guides), sprite),
    node('figcaption', {}, caption),
  );
}

function showResult(job, result, ref, alone) {
  const { project } = job.app.store.state;
  const sprite = {
    width: result.width,
    height: result.height,
    pixels: new Uint8ClampedArray(result.pixels),
  };
  const refName = viewName(project, referenceOf(project));
  const text = reportText(result.report, {
    place: placementOf(project).place,
    stands: standsOn(project),
    refHeight: artHeight(ref),
    refName: refName.toLowerCase(),
  });

  replace(
    job.slot,
    node(
      'div.compare.cleaning',
      {},
      alone ? null : figure(ref, project.guides, `${refName} (reference)`),
      figure(sprite, project.guides, `${viewName(project, job.direction)}, cleaned`),
    ),
    keepSizeOffer(job, result.report, () => runClean(job, job.asked)),
    node('pre.report', {}, text),
  );
  job.result = sprite;
  job.report = result.report;
  job.accept.disabled = false;
  readyForKeys(job.accept);
}

// The result ready, the keys go to Use when they were on nothing or on the window's ×: Enter
// there closed the window and threw the clean away without a word. Someone typing a height is
// left in the field.
export function readyForKeys(accept) {
  const held = document.activeElement;
  const idle = !held || held === document.body || Boolean(held.matches?.('.sheet-close, .sheet'));

  if (idle && accept.isConnected) {
    accept.focus({ preventScroll: true });
  }
}

// cleans the picture with the options asked for and shows it beside the reference
export async function runClean(job, options) {
  const { state } = job.app.store;
  const ref = referenceSprite(state);

  // what was cleaned before is not what is being asked for now
  job.asked = options;
  job.result = null;
  job.accept.disabled = true;
  replace(job.slot, node('p.report', {}, 'Cleaning… this takes a second or two.'));
  // an empty reference, or a few pixels sketched in it, has nothing to match
  const alone = job.alone || !isPose(ref);
  const placement = placementOf(state.project);

  const like = { width: ref.width, height: ref.height, data: ref.pixels };
  const factor = scaleOf(state.project.cleanScales, job.direction);

  try {
    const result = await cleanAtViewScale(
      (asked) => cleanImage(job.image, like, asked),
      { ...options, ...placement, alone },
      factor,
    );

    showResult(job, result, ref, alone);
  } catch (error) {
    replace(
      job.slot,
      node(
        'p.report',
        {},
        `This image could not be cleaned (${inWords(error, 'no subject could be told from its background')}). ${FAILED}`,
      ),
    );
  }
}
