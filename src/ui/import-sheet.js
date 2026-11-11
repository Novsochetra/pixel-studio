import { node, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { currentAnimation, replaceDirectionArt } from './actions.js';
import { keepVersion } from './versions-sheet.js';
import { optionFields } from './import/import-options.js';
import { runClean } from './import/import-run.js';
import { scalesAfter } from './import/view-scale.js';
import { decodeImage } from '../io/images.js';
import { referenceOf } from '../model/reference.js';
import { viewName } from '../model/kinds.js';
import { frameAt } from '../model/project.js';
import { hasArt } from '../model/frames.js';
import { inWords } from '../model/told.js';

const NOT_AN_IMAGE = 'This file is not an image the browser can open. Try PNG, WebP or JPEG.';

// what is typed is checked first: a height or grid that cannot be says so, and nothing is cleaned
function cleanAgain(job, fields) {
  try {
    runClean(job, fields.read());
  } catch (error) {
    toast(inWords(error, 'These settings could not be read: check the height and the grid size.'));
  }
}

// where a cleaned image goes: "Side" alone while there is one frame, "Side, frame 2" after
function placeName(state, direction, frame) {
  const frames = currentAnimation(state).directions[direction]?.frames.length ?? 1;
  const view = viewName(state.project, direction);

  return frames > 1 ? `${view}, frame ${frame + 1}` : view;
}

// Characters match every picture to the reference pose (the reference view's first frame of the
// first animation that has it); that pose itself, and anything that is not a character, is
// cleaned on its own and placed as its kind stands.
function cleansAlone(state, direction, frame) {
  const { project } = state;
  const firstWithIt = project.animations.find((animation) => animation.directions[direction]);
  const isPose =
    direction === referenceOf(project) && frame === 0 && firstWithIt === currentAnimation(state);

  return isPose || project.kind !== 'character';
}

function accept(job, place) {
  const { app, direction, frame } = job;
  const { state } = app.store;
  const was = frameAt(state.project, { ...state.at, direction, frame });
  const replaced = Boolean(was && hasArt(was));

  keepVersion(app, `Before cleaning into ${place}`);
  // before the step, so it is saved with it
  state.project.cleanScales = scalesAfter(state.project.cleanScales, direction, job.report);
  replaceDirectionArt(app, { direction, frame }, job.result, `Clean into ${place}`);
  app.store.set({ at: { ...app.store.state.at, direction, frame }, mode: 'edit', selection: null });
  job.close();
  toast(
    replaced
      ? `${place} updated. Undo brings the old one back.`
      : `Cleaned into ${place}. Undo takes it out again.`,
  );
}

function sheetBody(job, file, fields) {
  const source = node('img', {
    src: URL.createObjectURL(file),
    alt: `The image you chose: ${file.name}`,
  });
  const again = node(
    'button.btn',
    { onclick: () => job.image && cleanAgain(job, fields) },
    'Clean again',
  );

  return [
    node(
      'div.compare.cleaning',
      {},
      node('figure', {}, source, node('figcaption', {}, `Your image · ${file.name}`)),
      job.slot,
    ),
    fields.el,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: job.close }, 'Cancel'),
      again,
      job.accept,
    ),
  ];
}

export async function openImport(app, direction, file, frame = app.store.state.at.frame) {
  const { state } = app.store;
  const place = placeName(state, direction, frame);
  // read before the window opens: for a file that is no picture it opened anyway, on a broken
  // picture and a Clean again that did nothing
  const image = await decodeImage(file).catch(() => null);

  if (!image) {
    toast(NOT_AN_IMAGE);

    return;
  }

  const sheet = openSheet(`Clean into ${place}`, null, { wide: true });
  const alone = cleansAlone(state, direction, frame);

  // a later frame of an animation is another pose: by default it keeps its own height
  const job = {
    app,
    direction,
    frame,
    alone,
    image,
    result: null,
    close: sheet.close,
    slot: node('div', { style: { display: 'grid', gap: '12px' } }),
    accept: node('button.btn.primary', { disabled: true }, `Use for ${place}`),
  };
  // What is typed is not what the result on show was cleaned with: Use waits for Clean again,
  // where it placed the old result without a word. Enter in a field cleans again.
  const fields = optionFields({
    matching: !alone,
    keepScale: frame > 0,
    onChange: () => {
      job.accept.disabled = true;
    },
    onEnter: () => job.image && cleanAgain(job, fields),
  });

  job.accept.addEventListener('click', () => accept(job, place));
  sheet.body.append(...sheetBody(job, file, fields));
  runClean(job, fields.read());
}
