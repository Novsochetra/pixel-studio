import { h, replace, toast } from './dom.js';
import { openSheet, previewCanvas } from './sheet.js';
import { currentAnimation, referenceSprite, restructure } from './actions.js';
import { cleanImage } from '../io/cleaner.js';
import { decodeImage } from '../io/images.js';
import { directionLabel } from '../model/project.js';
import { addFrame, frameCount } from '../model/frames.js';
import { keepVersion } from './versions-sheet.js';
import { referenceOf } from '../model/reference.js';

// most specific first: "south-west" must not be read as "south"
const NAME_HINTS = [
  ['north-west', /north.?west|back.?side.?left|left.?back.?side/i],
  ['south-west', /south.?west|front.?side.?left|left.?front.?side/i],
  ['west', /\bwest\b|side.?left|left.?side|\bleft\b/i],
  ['north-east', /back.?side|north.?east|three.?quarter.?back/i],
  ['south-east', /front.?side|south.?east|three.?quarter/i],
  ['north', /back|north|rear/i],
  ['east', /side|east|profile/i],
  ['south', /front|south/i],
];

// the direction a file's name points at (side.webp, sochetra-back-2.png), else the first other view
function guessDirection(name, animation, reference) {
  const hit = NAME_HINTS.find(([, pattern]) => pattern.test(name));
  const drawn = Object.keys(animation.directions);

  return hit && drawn.includes(hit[0]) ? hit[0] : drawn.find((d) => d !== reference) ?? drawn[0];
}

function rowView(item, animation) {
  const direction = h('select.input', { 'aria-label': `View for ${item.file.name}`, onchange: (event) => { item.direction = event.target.value; } },
    Object.keys(animation.directions).map((d) => h('option', { value: d, selected: item.direction === d }, directionLabel(d))));
  const placement = h('select.input', { 'aria-label': `Where ${item.file.name} goes`, onchange: (event) => { item.placement = event.target.value; } },
    Array.from({ length: frameCount(animation) }, (_, i) => h('option', { value: String(i), selected: item.placement === String(i) }, `Frame ${i + 1}`)),
    h('option', { value: 'new', selected: item.placement === 'new' }, 'A new frame at the end'));

  return h('div.batch-row', {}, h('img', { src: item.url, alt: item.file.name }), h('div', { style: { display: 'grid', gap: '6px', minWidth: '0' } }, h('div.view-name', {}, item.file.name), h('div.group', { style: { gap: '6px', flexWrap: 'wrap' } }, direction, placement), item.status), item.result ?? h('div'));
}

// The frame each image goes into. Images for new frames fill them in order, per view: three side
// and three back images make three new frames, each with a side and a back.
function frameIndexes(items, count) {
  const fresh = {};

  return items.map((item) => {
    if (item.placement !== 'new') {
      return Number(item.placement);
    }

    fresh[item.direction] = (fresh[item.direction] ?? 0) + 1;

    return count + fresh[item.direction] - 1;
  });
}

// every cleaned image into its view and frame, as one step that undo takes back
function place(app, items) {
  restructure(app, `Clean ${items.length} images`, (state) => {
    const animation = currentAnimation(state);
    const indexes = frameIndexes(items, frameCount(animation));

    while (frameCount(animation) <= Math.max(...indexes)) {
      addFrame(state.project, animation, frameCount(animation) - 1);
    }

    items.forEach((item, i) => {
      const frame = animation.directions[item.direction].frames[indexes[i]];
      frame.layers.find((l) => l.kind !== 'reference').sprite = item.sprite;
    });

    return { frame: indexes[0] };
  });
}

export function openBatchSheet(app, files) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const sheet = openSheet(`Clean ${files.length} images`);
  const list = h('div.view-list');
  const seen = {};
  // run-2 before run-10, so numbered images become frames in their order
  const ordered = [...files].sort((first, second) => first.name.localeCompare(second.name, undefined, { numeric: true }));
  const items = ordered.map((file) => {
    const direction = guessDirection(file.name, animation, referenceOf(state.project));
    // each view's images fill frames from the one being edited on, then new ones
    const at = state.at.frame + (seen[direction] ?? 0);
    const placement = at < frameCount(animation) ? String(at) : 'new';
    seen[direction] = (seen[direction] ?? 0) + 1;

    return { file, url: URL.createObjectURL(file), direction, placement, status: h('span.hint', {}, 'Waiting'), result: null, sprite: null };
  });
  const accept = h('button.btn.primary', { disabled: true }, 'Use them all');
  const draw = () => replace(list, items.map((item) => rowView(item, animation)));

  const run = async () => {
    const ref = referenceSprite(state);

    for (const item of items) {
      item.status = h('span.hint', {}, 'Cleaning…');
      draw();

      try {
        const result = await cleanImage(await decodeImage(item.file), { width: ref.width, height: ref.height, data: ref.pixels }, {});
        item.sprite = { width: result.width, height: result.height, pixels: new Uint8ClampedArray(result.pixels) };
        item.result = previewCanvas(item.sprite, state.project.guides, 1);
        item.status = h('span.hint', {}, `${result.report.size[0]}×${result.report.size[1]} px, feet on row ${result.report.feetRow}${result.report.scaled ? `, scaled ${result.report.scaled.fy.toFixed(2)}×` : ''}`);
      } catch (error) {
        item.status = h('span.hint', { style: { color: 'var(--bad)' } }, `Could not clean: ${error.message}`);
      }

      draw();
    }

    accept.disabled = !items.some((item) => item.sprite);
  };

  accept.addEventListener('click', () => {
    keepVersion(app, `Before cleaning ${files.length} images`);
    place(app, items.filter((item) => item.sprite));
    toast('Cleaned images placed. A version from just before is in History.');
    sheet.close();
  });
  sheet.body.append(
    h('p.hint', {}, `Each image is matched to the ${directionLabel(referenceOf(state.project)).toLowerCase()} view. Names with side, back or front pick their view; each view's images fill frames from frame ${state.at.frame + 1} on, in the order of their names.`),
    list,
    h('div.sheet-actions', {}, h('button.btn', { onclick: sheet.close }, 'Cancel'), accept),
  );
  draw();
  run();
}

