import { currentAnimation, currentFrames } from '../actions.js';
import { frameAtTime } from '../../model/frames.js';

// Play runs the animation on the canvas itself: app.playback.frame is the frame on show, and
// onFrame repaints whatever shows it. Any edit, or a click on a frame, stops it.

// each play has its own loop, which ends once that play is stopped or another takes its place
function tick(app, playback, time) {
  if (app.playback !== playback) {
    return;
  }

  if (!playback.isShown()) {
    app.playback = null;

    return;
  }

  const { state } = app.store;
  const frame = frameAtTime(
    { from: playback.from, fps: currentAnimation(state).fps, count: currentFrames(state).length },
    time - playback.start,
  );

  if (frame !== playback.frame) {
    playback.frame = frame;
    playback.onFrame();
  }

  requestAnimationFrame((next) => tick(app, playback, next));
}

export function isPlaying(app) {
  return Boolean(app.playback);
}

export function stopPlayback(app) {
  if (app.playback) {
    app.playback = null;

    return true;
  }

  return false;
}

export function togglePlayback(app, { isShown, onFrame }) {
  if (stopPlayback(app)) {
    onFrame();

    return;
  }

  const from = app.store.state.at.frame;
  const playback = { start: performance.now(), from, frame: from, isShown, onFrame };
  app.playback = playback;
  onFrame();
  requestAnimationFrame((time) => tick(app, playback, time));
}
