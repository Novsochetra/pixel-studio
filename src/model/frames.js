import { cloneSprite } from './sprite.js';
import { newFrame, newLayer } from './project.js';
import { frameLike } from './structure.js';

// An animation's frames are its moments in time, and every view has each of them: frame 2 is the
// same moment seen from the front, the side and the back. So frames are added, removed and moved
// in every view at once.

const entriesOf = (animation) => Object.values(animation.directions);

export function frameCount(animation) {
  return Math.max(0, ...entriesOf(animation).map((entry) => entry.frames.length));
}

// a new frame after `after` in every view: empty, or each view's copy of its own frame
export function addFrame(project, animation, after, duplicate = false) {
  for (const entry of entriesOf(animation)) {
    const at = Math.min(after, entry.frames.length - 1);

    entry.frames.splice(
      at + 1,
      0,
      frameLike(animation, project.canvas, duplicate ? entry.frames[at] : null),
    );
  }

  return after + 1;
}

export function removeFrame(animation, index) {
  if (frameCount(animation) < 2) {
    return index;
  }

  for (const entry of entriesOf(animation)) {
    entry.frames.splice(index, 1);
  }

  return Math.min(index, frameCount(animation) - 1);
}

// the frame at `from` taken out and put back in at `to`, in every view; returns where it went
export function moveFrame(animation, from, to) {
  const last = frameCount(animation) - 1;
  const target = Math.max(0, Math.min(last, to));

  if (from < 0 || from > last || target === from) {
    return from;
  }

  for (const entry of entriesOf(animation)) {
    const [frame] = entry.frames.splice(from, 1);

    entry.frames.splice(target, 0, frame);
  }

  return target;
}

function copyOfFrame(frame, canvas) {
  const layers = frame.layers.map((layer) => ({
    ...newLayer(canvas.width, canvas.height, {
      name: layer.name,
      sprite: layer.sprite ? cloneSprite(layer.sprite) : undefined,
      key: layer.key,
      kind: layer.kind,
    }),
    visible: layer.visible,
    opacity: layer.opacity,
  }));

  return newFrame(canvas.width, canvas.height, layers);
}

// Projects from before frames were shared could give one view more frames than another; the
// shorter views hold their last frame, as their exports always did. Returns the layers added.
export function evenFrames(project) {
  const added = [];

  for (const animation of project.animations) {
    const count = frameCount(animation);

    for (const entry of entriesOf(animation)) {
      while (entry.frames.length < count) {
        const frame = copyOfFrame(entry.frames[entry.frames.length - 1], project.canvas);

        entry.frames.push(frame);
        added.push(...frame.layers.map((layer) => layer.id));
      }
    }
  }

  return added;
}

// whether any layer but a picture to trace has a pixel drawn
export function hasArt(frame) {
  return frame.layers.some(
    (layer) =>
      layer.kind !== 'reference' && layer.sprite?.pixels.some((value, i) => i % 4 === 3 && value),
  );
}
