import { node } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { addFrame, frameCount, reachFrame } from '../../model/frames.js';
import { referenceOf } from '../../model/reference.js';
import { isSingleView } from '../../model/kinds.js';
import { clearPosedBody } from '../../model/body/body.js';

// A view's word as a whole word, wherever it stands in the name: knight-back-2, backSide. Read
// inside other words, "back" in "no-background" sent a front view to the back.
const words = (...options) => new RegExp(`(?<![a-z])(?:${options.join('|')})(?![a-z])`, 'i');

// most specific first: "south-west" must not be read as "south"
const NAME_HINTS = [
  ['north-west', words('north.?west', 'back.?side.?left', 'left.?back.?side')],
  ['south-west', words('south.?west', 'front.?side.?left', 'left.?front.?side')],
  ['west', words('west', 'side.?left', 'left.?side', 'left')],
  ['north-east', words('back.?side', 'north.?east', 'three.?quarter.?back')],
  ['south-east', words('front.?side', 'south.?east', 'three.?quarter')],
  ['north', words('back', 'north', 'rear')],
  ['east', words('side', 'east', 'profile')],
  ['south', words('front', 'south')],
];

// the view a file's name says, without its extension, or null
export function namedDirection(name) {
  // knightBack is knight-Back: a capital starts a word too
  const stem = name.replace(/\.[a-z0-9]+$/i, '').replace(/([a-z])([A-Z])/g, '$1-$2');

  return NAME_HINTS.find(([, pattern]) => pattern.test(stem))?.[0] ?? null;
}

// the direction a file's name points at (side.webp, sochetra-back-2.png), else the first other view
function guessDirection(name, animation, reference) {
  const hit = namedDirection(name);
  const drawn = Object.keys(animation.directions);

  return hit && drawn.includes(hit)
    ? hit
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
// and three back images make three new frames, each with a side and a back. An image set to a
// frame another image of its view has taken goes to a new frame too, so neither is lost.
export function frameIndexes(items, count) {
  const fresh = {};
  const taken = new Set();

  return items.map((item) => {
    const asked = `${item.direction}:${item.placement}`;

    if (item.placement !== 'new' && !taken.has(asked)) {
      taken.add(asked);

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
      const frame = reachFrame(state.project, animation, item.direction, indexes[i]);

      frame.layers.find((layer) => layer.kind === 'art').sprite = item.sprite;
      clearPosedBody(frame, state.project.canvas);
    });

    return { frame: indexes[0] };
  });
}
