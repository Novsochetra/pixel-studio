import { blankFrame, copyOfFrame } from './structure.js';

// An animation's frames are its moments in time: frame 2 is the same moment seen from the front,
// the side and the back. Adding and moving change every view at once. Deleting can take one view's
// frame alone, which leaves that view short: past its end it holds its last frame, in play and in
// every export.

const entriesOf = (animation) => Object.values(animation.directions);

export function frameCount(animation) {
  return Math.max(0, ...entriesOf(animation).map((entry) => entry.frames.length));
}

export const heldFrame = (frames, index) => frames[Math.min(index, frames.length - 1)];

// a new frame after `after` in every view: empty, or each view's copy of its own frame, layers and all
export function addFrame(project, animation, after, duplicate = false) {
  for (const entry of entriesOf(animation)) {
    const at = Math.min(after, entry.frames.length - 1);

    entry.frames.splice(
      at + 1,
      0,
      duplicate
        ? copyOfFrame(entry.frames[at], project.canvas)
        : blankFrame(animation, project.canvas),
    );
  }

  return after + 1;
}

// the + at the end of a view: a short view catches up alone, so it can get back what it lost
export function addFrameAtEnd(project, animation, direction) {
  const { frames } = animation.directions[direction];

  if (frames.length === frameCount(animation)) {
    return addFrame(project, animation, frames.length - 1);
  }

  frames.push(blankFrame(animation, project.canvas));

  return frames.length - 1;
}

// frame `index` of a view, which grows with empty frames when it is too short to have it
export function reachFrame(project, animation, direction, index) {
  const { frames } = animation.directions[direction];

  while (frames.length <= index) {
    frames.push(blankFrame(animation, project.canvas));
  }

  return frames[index];
}

export function removeFrame(animation, index) {
  if (frameCount(animation) < 2) {
    return index;
  }

  for (const { frames } of entriesOf(animation)) {
    if (frames.length > 1) {
      frames.splice(index, 1);
    }
  }

  return Math.min(index, frameCount(animation) - 1);
}

// Hiding belongs to a moment, not to a drawing, so the marks stay in their places while this
// view's later frames move up: otherwise a mark would hide a different moment in every other view.
export function removeViewFrame(animation, direction, index) {
  const { frames } = animation.directions[direction];

  if (frames.length < 2) {
    return index;
  }

  // with one view a moment is its frame: the mark goes with the drawing
  if (Object.keys(animation.directions).length === 1) {
    return removeFrame(animation, index);
  }

  const hidden = frames.map((frame) => frame.hidden);

  frames.splice(index, 1);
  frames.forEach((frame, place) => {
    if (hidden[place]) {
      frame.hidden = true;
    } else {
      delete frame.hidden;
    }
  });

  return Math.min(index, frames.length - 1);
}

// the frame at `from` taken out and put back in at `to`, in every view that has it; returns where
// it went
export function moveFrame(animation, from, to) {
  const last = frameCount(animation) - 1;
  const target = Math.max(0, Math.min(last, to));

  if (from < 0 || from > last || target === from) {
    return from;
  }

  for (const { frames } of entriesOf(animation)) {
    if (from < frames.length) {
      const [frame] = frames.splice(from, 1);

      frames.splice(target, 0, frame);
    }
  }

  return target;
}

// whether any layer but a picture to trace has a pixel drawn
export function hasArt(frame) {
  return frame.layers.some(
    (layer) =>
      layer.kind !== 'reference' && layer.sprite?.pixels.some((value, i) => i % 4 === 3 && value),
  );
}
