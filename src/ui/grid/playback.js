import { currentAnimation } from '../actions.js';
import { frameAtTime, playedFrames } from '../../model/frame-play.js';

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

  const animation = currentAnimation(app.store.state);
  const frame = frameAtTime(
    { from: playback.from, fps: animation.fps, order: playedFrames(animation) },
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

// A phone's sheet pulled tall leaves the canvas a strip: Play there showed a picture the size
// of a stamp, or none. The sheet goes back to its height, and the play is seen.
function lowerTallSheet() {
  const frame = globalThis.document?.querySelector?.('.app[data-sheet="tall"]');

  if (frame) {
    frame.dataset.sheet = '';
  }
}

export function togglePlayback(app, { isShown, onFrame }) {
  if (stopPlayback(app)) {
    onFrame();

    return;
  }

  lowerTallSheet();
  const animation = currentAnimation(app.store.state);
  const from = app.store.state.at.frame;
  const first = frameAtTime({ from, fps: animation.fps, order: playedFrames(animation) }, 0);
  const playback = { start: performance.now(), from, frame: first, isShown, onFrame };
  app.playback = playback;
  onFrame();
  requestAnimationFrame((time) => tick(app, playback, time));
}
