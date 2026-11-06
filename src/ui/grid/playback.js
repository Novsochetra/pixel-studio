import { currentAnimation, currentFrames } from '../actions.js';

// Play runs the animation on the canvas itself: app.playback.frame is the frame on show, and
// onFrame repaints whatever shows it. Any edit, or a click on a frame, stops it.

function tick(app, time) {
  const playback = app.playback;

  if (!playback || !playback.isShown()) {
    app.playback = null;

    return;
  }

  const { state } = app.store;
  const count = currentFrames(state).length;
  const step = Math.floor(((time - playback.start) / 1000) * currentAnimation(state).fps);
  const frame = (playback.from + step) % count;

  if (frame !== playback.frame) {
    playback.frame = frame;
    playback.onFrame();
  }

  requestAnimationFrame((next) => tick(app, next));
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

// isShown: false once the canvas is gone (another workspace); onFrame: repaint
export function togglePlayback(app, { isShown, onFrame }) {
  if (stopPlayback(app)) {
    onFrame();

    return;
  }

  const from = app.store.state.at.frame;
  app.playback = { start: performance.now(), from, frame: from, isShown, onFrame };
  onFrame();
  requestAnimationFrame((time) => tick(app, time));
}
