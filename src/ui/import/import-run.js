import { node, replace } from '../dom.js';
import { previewCanvas } from '../sheet.js';
import { referenceSprite } from '../actions.js';
import { cleanImage } from '../../io/cleaner.js';
import { referenceOf } from '../../model/reference.js';
import { placementOf, viewName } from '../../model/kinds.js';
import { artHeight, reportText } from './import-report.js';

const FAILED =
  'Use a PNG or WebP of one subject on a flat background (an AI image’s magenta works best).';

function figure(sprite, guides, caption) {
  return node('figure', {}, previewCanvas(sprite, guides), node('figcaption', {}, caption));
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
    refHeight: artHeight(ref),
    refName: refName.toLowerCase(),
  });

  replace(
    job.slot,
    node(
      'div.compare',
      {},
      alone ? null : figure(ref, project.guides, `${refName} (reference)`),
      figure(sprite, project.guides, `${viewName(project, job.direction)}, cleaned`),
    ),
    node('pre.report', {}, text),
  );
  job.result = sprite;
  job.accept.disabled = false;
}

// cleans the picture with the options asked for and shows it beside the reference
export async function runClean(job, options) {
  const { state } = job.app.store;
  const ref = referenceSprite(state);

  // what was cleaned before is not what is being asked for now
  job.result = null;
  job.accept.disabled = true;
  replace(job.slot, node('p.report', {}, 'Cleaning… this takes a second or two.'));
  // an empty reference has nothing to match
  const alone = job.alone || !artHeight(ref);
  const placement = placementOf(state.project);

  try {
    const result = await cleanImage(
      job.image,
      { width: ref.width, height: ref.height, data: ref.pixels },
      { ...options, ...placement, alone },
    );

    showResult(job, result, ref, alone);
  } catch (error) {
    replace(
      job.slot,
      node('p.report', {}, `This image could not be cleaned (${error.message}). ${FAILED}`),
    );
  }
}
