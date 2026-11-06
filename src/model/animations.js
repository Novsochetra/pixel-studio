import { cloneSprite } from './sprite.js';
import { newId } from './project.js';
import { compositeFrame } from './composite.js';
import { addFrame } from './frames.js';
import { addAnimation } from './structure.js';

// a deep copy whose animation, frames and layers have ids of their own, so both are saved
function copyFrames(frames) {
  return frames.map((frame) => ({
    id: newId('f'),
    layers: frame.layers.map((layer) => ({
      ...layer,
      id: newId('l'),
      sprite: layer.sprite ? cloneSprite(layer.sprite) : null,
    })),
  }));
}

export function duplicateAnimation(project, animation, name = `${animation.name} copy`) {
  const copy = {
    ...animation,
    id: newId('a'),
    name,
    directions: Object.fromEntries(
      Object.entries(animation.directions).map(([direction, entry]) => [
        direction,
        { frames: copyFrames(entry.frames) },
      ]),
    ),
  };
  const at = project.animations.indexOf(animation);
  project.animations.splice(at + 1, 0, copy);

  return copy;
}

// every frame of a view starts as that view's first frame of `from`, flattened to one layer
function fillFromPose(project, animation, from) {
  const { width, height } = project.canvas;

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
