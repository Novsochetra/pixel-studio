import { node } from '../dom.js';
import { previewCanvas } from '../sheet.js';
import { referenceSprite } from '../actions.js';
import { cleanAtViewScale, scaleOf, scalesAfter } from '../import/view-scale.js';
import { readyForKeys } from '../import/import-run.js';
import { cleanImage } from '../../io/cleaner.js';
import { decodeImage } from '../../io/images.js';
import { isPose, referenceOf } from '../../model/reference.js';
import { placementOf } from '../../model/kinds.js';
import { inWords } from '../../model/told.js';

// characters are matched to the reference, later frames keeping their own pixel size; anything
// else is cleaned on its own and placed as its kind stands
function cleanOptions(project, item) {
  if (project.kind !== 'character') {
    return { alone: true, ...placementOf(project) };
  }

  return { keepScale: item.placement !== '0' };
}

// With no reference drawn yet, the batch's own image of the reference view is cleaned first, and
// the others are matched to it; otherwise each would come out at its own size.
function referenceFirst(state, items) {
  const own = items.find((item) => item.direction === referenceOf(state.project));

  if (isPose(referenceSprite(state)) || !own) {
    return items;
  }

  return [own, ...items.filter((item) => item !== own)];
}

const becomesReference = (state, item, ref) =>
  !isPose(ref) && Boolean(item.sprite) && item.direction === referenceOf(state.project);

function statusText(report) {
  const scaled = report.scaled ? `, scaled ${report.scaled.fy.toFixed(2)}×` : '';

  return `${report.size[0]}×${report.size[1]} px${scaled}`;
}

// scales: each view's scale so far, this picture's own added to it when it was matched
async function cleanOne(state, item, { ref, scales }) {
  const { project } = state;

  try {
    const image = await decodeImage(item.file);
    const like = { width: ref.width, height: ref.height, data: ref.pixels };
    const result = await cleanAtViewScale(
      (asked) => cleanImage(image, like, asked),
      // an empty reference, or a sketch of a few pixels, has nothing to match: the image is
      // cleaned alone, as its kind stands
      isPose(ref)
        ? cleanOptions(state.project, item)
        : { alone: true, ...placementOf(state.project) },
      scaleOf(scales, item.direction),
    );

    Object.assign(scales, scalesAfter(scales, item.direction, result.report));
    item.report = result.report;
    item.alone = !isPose(ref) || project.kind !== 'character';
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
      `Could not clean: ${inWords(error, 'this picture could not be read')}`,
    );
  }
}

// each image cleaned in turn, the list drawn again as each is done
export async function cleanEach(state, items, { draw, accept, scales }) {
  let ref = referenceSprite(state);

  for (const item of referenceFirst(state, items)) {
    item.status = node('span.hint', {}, 'Cleaning…');
    draw();
    await cleanOne(state, item, { ref, scales });
    ref = becomesReference(state, item, ref) ? item.sprite : ref;
    draw();
  }

  accept.disabled = !items.some((item) => item.sprite);
  readyForKeys(accept);
}
