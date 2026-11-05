import { h, replace } from './dom.js';
import { currentAnimation, currentFrames, selectFrame } from './actions.js';
import { moveFrame } from '../model/frames.js';
import { compositeFrame } from '../model/composite.js';
import { VIEW_FILTERS } from '../views/filters.js';
import { drawThumbnail } from './views-panel.js';
import { bounds } from '../model/sprite.js';
import { bindFrameDrag } from './frame-drag.js';
import { frameButtons, frameStructure, playButtons } from './timeline-controls.js';
import { animationPicker, newAnimationForm } from './animation-panel.js';

function unionBounds(boxes) {
  const found = boxes.filter(Boolean);

  if (!found.length) {
    return null;
  }

  return {
    left: Math.min(...found.map((b) => b.left)),
    top: Math.min(...found.map((b) => b.top)),
    right: Math.max(...found.map((b) => b.right)),
    bottom: Math.max(...found.map((b) => b.bottom)),
  };
}

function frameButton(app, sprite, box, i, index) {
  const thumb = h('canvas', { 'aria-hidden': 'true' });
  drawThumbnail(thumb, sprite, 48, box);
  const empty = !bounds(sprite);

  return h(`button.frame${empty ? '.empty' : ''}`, {
    role: 'option',
    'aria-selected': String(i === index),
    title: `Frame ${i + 1}${empty ? ', empty' : ''}. Drag to move it`,
    onclick: () => selectFrame(app, i),
  }, thumb, h('span', {}, empty ? `${i + 1} · empty` : String(i + 1)));
}

// The animation's frames, in order, seen in the view being edited; every view has the same frames.
export function mountTimeline(app) {
  const strip = h('div.frames', { role: 'listbox', 'aria-label': 'Frames', title: 'Every view has these frames. Drag a frame to move it.' });
  const controls = h('div.timeline-controls');
  const player = h('canvas.player', { 'aria-label': 'Animation preview' });
  const playback = h('div.timeline-controls.playback');
  const el = h('div.timeline', {}, h('div.timeline-main', {}, controls, h('div.timeline-row', {}, strip, playback)), player);
  let playing = false;
  let shown = 0;
  let last = 0;
  let box = null;
  // the strip and the player show the art as the canvas does: colour, silhouette or grey
  const frameSprite = (frame) => VIEW_FILTERS[app.store.state.viewFilter](compositeFrame(frame, app.store.state.project.canvas.width, app.store.state.project.canvas.height));

  function tick(time) {
    if (!playing || !el.isConnected) {
      playing = false;

      return;
    }

    const frames = currentFrames(app.store.state);

    if (time - last >= 1000 / currentAnimation(app.store.state).fps) {
      last = time;
      shown = (shown + 1) % frames.length;
      drawThumbnail(player, frameSprite(frames[shown]), 96, box);
    }

    requestAnimationFrame(tick);
  }

  bindFrameDrag(strip, (from, to) => frameStructure(app, 'Move frame', (s) => moveFrame(currentAnimation(s), from, to)));

  function render() {
    const { state } = app.store;
    const animation = currentAnimation(state);
    const frames = currentFrames(state);
    const index = Math.min(state.at.frame, frames.length - 1);
    const sprites = frames.map(frameSprite);
    const togglePlay = () => {
      playing = !playing;
      shown = index;
      render();

      if (playing) {
        requestAnimationFrame(tick);
      }
    };
    box = unionBounds(sprites.map(bounds));

    replace(strip, sprites.map((sprite, i) => frameButton(app, sprite, box, i, index)));
    replace(controls, animationPicker(app), newAnimationForm(app), h('span.sep'), ...frameButtons(app, index));
    replace(playback, ...playButtons(app, playing, togglePlay));

    if (!playing) {
      drawThumbnail(player, sprites[index], 96, box);
    }
  }

  return { el, render };
}
