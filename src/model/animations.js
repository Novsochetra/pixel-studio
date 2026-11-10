import { newId } from './project.js';
import { compositeFrame } from './composite.js';
import { addFrame, hasArt } from './frames.js';
import { kindOf } from './kinds.js';
import { gameOf } from './presets.js';
import { addAnimation, copyOfLayer, uniqueName } from './structure.js';
import { bodyKey } from './body/body.js';

// a deep copy whose animation, frames and layers have ids of their own, so both are saved
function copyFrames(frames) {
  return frames.map((frame) => ({
    ...frame,
    id: newId('f'),
    marks: structuredClone(frame.marks ?? []),
    layers: frame.layers.map(copyOfLayer),
  }));
}

export function duplicateAnimation(project, animation, name = `${animation.name} copy`) {
  const copy = {
    ...animation,
    id: newId('a'),
    name: uniqueName(project, name),
    directions: Object.fromEntries(
      Object.entries(animation.directions).map(([direction, entry]) => [
        direction,
        { ...entry, frames: copyFrames(entry.frames) },
      ]),
    ),
  };
  const at = project.animations.indexOf(animation);

  project.animations.splice(at + 1, 0, copy);

  return copy;
}

// a frame to start a new animation from: its art and pose, shown in play, with no pins yet
function freshCopy(frame) {
  const [copy] = copyFrames([frame]);

  delete copy.hidden;

  return { ...copy, marks: [] };
}

// a body cut into parts stays in parts: every frame is a copy of the first, Body and all
function copyFirstFrames(animation, from) {
  animation.directions = Object.fromEntries(
    Object.entries(animation.directions).map(([direction, entry]) => {
      const source = from.directions[direction];

      return [
        direction,
        { ...source, frames: entry.frames.map(() => freshCopy(source.frames[0])) },
      ];
    }),
  );
}

// every frame of a view starts as that view's first frame of `from`, flattened to one layer
function fillFromPose(project, animation, from) {
  const { width, height } = project.canvas;

  if (bodyKey(from)) {
    copyFirstFrames(animation, from);

    return;
  }

  for (const [direction, entry] of Object.entries(animation.directions)) {
    const pose = from.directions[direction]?.frames[0];

    if (pose) {
      entry.frames.forEach((frame) => {
        frame.layers[0].sprite = compositeFrame(pose, width, height);
      });
    }
  }
}

// A new animation with the views of `like`: { name, frames, fps, start }, where start is 'empty',
// or 'pose' to start every frame from the first frame of `like`.
export function startAnimation(project, like, { name, frames = 1, fps = 8, start = 'empty' }) {
  const animation = addAnimation(project, name, Object.keys(like.directions));

  animation.fps = fps;

  for (let i = 1; i < frames; i++) {
    addFrame(project, animation, i - 1);
  }

  if (start === 'pose') {
    fillFromPose(project, animation, like);
  }

  return animation;
}

// names a new animation is offered: the game's, then the kind's, less those already taken
export function nameSuggestions(project) {
  const used = new Set(project.animations.map((animation) => animation.name));
  const names = [...(gameOf(project).names ?? []), ...kindOf(project).names];

  return [...new Set(names)].filter((name) => !used.has(name));
}

// the animations a new one can start from: those with a first frame drawn, the open one first
export function posesToStartFrom(project, open) {
  const others = project.animations.filter((animation) => animation !== open);

  return [open, ...others].filter((animation) =>
    Object.values(animation.directions).some(({ frames }) => hasArt(frames[0])),
  );
}

// one place earlier (-1) or later (1) in the project's order, which is the order of its tabs and
// its sheets; false at either end, where there is nowhere to go
export function moveAnimation(project, animation, step) {
  const from = project.animations.indexOf(animation);
  const to = from + step;

  if (from < 0 || to < 0 || to >= project.animations.length) {
    return false;
  }

  project.animations.splice(from, 1);
  project.animations.splice(to, 0, animation);

  return true;
}
