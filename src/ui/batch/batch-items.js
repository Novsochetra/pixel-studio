import { node } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { addFrame, frameCount } from '../../model/frames.js';
import { referenceOf } from '../../model/reference.js';
import { isSingleView } from '../../model/kinds.js';
import { clearPosedBody } from '../../model/body/body.js';

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

  return hit && drawn.includes(hit[0])
    ? hit[0]
    : (drawn.find((direction) => direction !== reference) ?? drawn[0]);
}

// One entry per image, in the order of their names (run-2 before run-10), each with the view its
// name points at and the frame it fills: each view's images fill frames from the one being edited
// on, then new ones at the end.
export function batchItems(state, files) {
  const animation = currentAnimation(state);
  const single = isSingleView(state.project);
  const seen = {};
  const ordered = [...files].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { numeric: true }),
  );

  return ordered.map((file) => {
    const direction = single
      ? state.at.direction
      : guessDirection(file.name, animation, referenceOf(state.project));
    const at = state.at.frame + (seen[direction] ?? 0);

    seen[direction] = (seen[direction] ?? 0) + 1;

    return {
      file,
      url: URL.createObjectURL(file),
      direction,
      placement: at < frameCount(animation) ? String(at) : 'new',
      status: node('span.hint', {}, 'Waiting'),
      result: null,
      sprite: null,
    };
  });
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
export function placeAll(app, items) {
  restructure(app, `Clean ${items.length} images`, (state) => {
    const animation = currentAnimation(state);
    const indexes = frameIndexes(items, frameCount(animation));

    while (frameCount(animation) <= Math.max(...indexes)) {
      addFrame(state.project, animation, frameCount(animation) - 1);
    }

    items.forEach((item, i) => {
      const frame = animation.directions[item.direction].frames[indexes[i]];

      frame.layers.find((layer) => layer.kind === 'art').sprite = item.sprite;
      clearPosedBody(frame, state.project.canvas);
    });

    return { frame: indexes[0] };
  });
}
