import { compositeFrame } from '../model/composite.js';
import { flipHorizontal } from '../model/sprite.js';
import { flippedSides } from '../model/directions.js';
import { heldFrame } from '../model/frames.js';

// the views an animation plays as: each drawn one, then the sides the game makes by flipping one
export function playedViews(project, animation) {
  const drawn = Object.keys(animation.directions).map((direction) => ({
    direction,
    source: direction,
    flip: false,
  }));
  const mirrored = flippedSides(project, animation).map(([direction, source]) => ({
    direction,
    source,
    flip: true,
  }));

  return [...drawn, ...mirrored];
}

export function playedSprite(project, animation, view, tick) {
  const frames = animation.directions[view.source].frames;
  const sprite = compositeFrame(
    heldFrame(frames, tick),
    project.canvas.width,
    project.canvas.height,
  );

  return view.flip ? flipHorizontal(sprite) : sprite;
}
