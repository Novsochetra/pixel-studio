import { frameCount } from './frames.js';

// A frame can be hidden from play to watch the animation without it: it stays in the grid and in
// every download. Hiding is a moment in time, so it holds in every view at once.

const entriesOf = (animation) => Object.values(animation.directions);

export function isFrameHidden(animation, index) {
  return entriesOf(animation).some((entry) => entry.frames[index]?.hidden);
}

export function setFrameHidden(animation, index, hidden) {
  for (const entry of entriesOf(animation)) {
    const frame = entry.frames[index];

    if (frame && hidden) {
      frame.hidden = true;
    } else if (frame) {
      delete frame.hidden;
    }
  }

  return index;
}

// the frames a play goes through, in order; with every frame hidden there is nothing to skip to
export function playedFrames(animation) {
  const all = Array.from({ length: frameCount(animation) }, (_, index) => index);
  const shown = all.filter((index) => !isFrameHidden(animation, index));

  return shown.length ? shown : all;
}

// The frame on show `elapsed` ms into a play that began at frame `from`, going round the frames
// played. A screen frame's time can come just before the play's start, which must not step back
// before `from`; a hidden `from` starts at the next frame shown.
export function frameAtTime({ from, fps, order }, elapsed) {
  const step = Math.floor((Math.max(0, elapsed) / 1000) * fps);
  const start = Math.max(
    0,
    order.findIndex((index) => index >= from),
  );

  return order[(start + step) % order.length];
}
