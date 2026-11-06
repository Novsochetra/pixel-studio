import { node, replace } from './dom.js';
import { currentAnimation, currentFrames, selectFrame } from './actions.js';
import { moveFrame } from '../model/frames.js';
import { compositeFrame } from '../model/composite.js';
import { directionLabel } from '../model/project.js';
import { drawThumbnail } from './views-panel.js';
import { bounds } from '../model/sprite.js';
import { bindFrameDrag } from './frame-drag.js';
import { frameButtons, frameStructure, playButtons } from './timeline-controls.js';

function unionBounds(boxes) {
  const found = boxes.filter(Boolean);

  if (!found.length) {
    return null;
  }

  return {
    left: Math.min(...found.map((box) => box.left)),
    top: Math.min(...found.map((box) => box.top)),
    right: Math.max(...found.map((box) => box.right)),
    bottom: Math.max(...found.map((box) => box.bottom)),
  };
}

function frameButton(app, sprite, box, i, index) {
  const thumb = node('canvas', { 'aria-hidden': 'true' });
  drawThumbnail(thumb, sprite, 56, box);
  const empty = !bounds(sprite);

  return node(
    `button.frame${empty ? '.empty' : ''}`,
    {
      role: 'option',
      'aria-selected': String(i === index),
      title: `Frame ${i + 1}${empty ? ', empty' : ''}. Drag to move it`,
      onclick: () => selectFrame(app, i),
    },
    thumb,
    node('span', {}, empty ? `${i + 1} · empty` : String(i + 1)),
  );
}

// The animation's frames, in order, seen in the view being edited; every view has the same frames.
export function mountTimeline(app) {
  const title = node('div.timeline-title');
  const strip = node('div.frames', { role: 'listbox', 'aria-label': 'Frames' });
  const controls = node('div.timeline-controls');
  const player = node('canvas.player', { 'aria-label': 'Animation preview' });
  const el = node(
    'div.timeline',
    {},
    node('div.timeline-main', {}, title, controls, strip),
    player,
  );
  let playing = false;
  let shown = 0;
  let last = 0;
  let box = null;
  const frameSprite = (frame) =>
    compositeFrame(
      frame,
      app.store.state.project.canvas.width,
      app.store.state.project.canvas.height,
    );

  function tick(time) {
    if (!playing || !el.isConnected) {
      playing = false;

      return;
    }

    const frames = currentFrames(app.store.state);

    if (time - last >= 1000 / currentAnimation(app.store.state).fps) {
      last = time;
      shown = (shown + 1) % frames.length;
      drawThumbnail(player, frameSprite(frames[shown]), 120, box);
    }

    requestAnimationFrame(tick);
  }

  bindFrameDrag(strip, (from, to) =>
    frameStructure(app, 'Move frame', (draft) => moveFrame(currentAnimation(draft), from, to)),
  );

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

    replace(
      title,
      node('strong', {}, `Frames of ${animation.name}`),
      node(
        'span.hint',
        {},
        `${frames.length} in every view, showing ${directionLabel(state.at.direction)}. Drag a frame to move it.`,
      ),
    );
    replace(
      strip,
      sprites.map((sprite, i) => frameButton(app, sprite, box, i, index)),
    );
    replace(
      controls,
      ...frameButtons(app, index),
      node('span.spacer'),
      ...playButtons(app, playing, togglePlay),
    );

    if (!playing) {
      drawThumbnail(player, sprites[index], 120, box);
    }
  }

  return { el, render };
}
