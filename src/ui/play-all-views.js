import { currentAnimation } from './actions.js';
import { cssVar, drawSprite, keepsStill, sizeCanvas } from './draw.js';
import { drawChecker } from './checker.js';
import { showsEveryView } from './grid/views-menu.js';
import { isSingleView, viewName } from '../model/kinds.js';
import { bounds, unionBounds } from '../model/sprite.js';
import { CAPTION, GAP, playLayout } from '../views/play-layout.js';
import { playedSprite, playedViews } from '../views/played-views.js';

const AIR = 2;
const CORNER = 10;

// with every view in sight, Play shows every view moving together, the mirrored sides as the game flips them
export function playsAllViews(app) {
  const { state } = app.store;

  return (
    Boolean(app.playback) &&
    showsEveryView(state) &&
    !isSingleView(state.project) &&
    playedViews(state.project, currentAnimation(state)).length > 1
  );
}

// The part of the canvas the art moves in, over every view and frame: the views are drawn cut
// to it, so they stand close together and a phone has room for them all. One box for all, so
// nothing shifts between frames.
function playedBox(project, animation, views) {
  const { width, height } = project.canvas;
  const longest = Math.max(...views.map((view) => animation.directions[view.source].frames.length));
  const boxes = views.flatMap((view) =>
    Array.from({ length: longest }, (unused, tick) =>
      bounds(playedSprite(project, animation, view, tick)),
    ),
  );
  const box = unionBounds(boxes) ?? { left: 0, top: 0, right: width, bottom: height };

  return {
    left: Math.max(0, box.left - AIR),
    top: Math.max(0, box.top - AIR),
    right: Math.min(width, box.right + AIR),
    bottom: Math.min(height, box.bottom + AIR),
  };
}

// the stage above the frames, less its own padding and the frame the canvas stands in: without
// the frame's few pixels, views fitted to the last pixel made the stage scroll sideways
function roomFor(canvas) {
  const area = canvas.closest('.edit-scroll');
  const padding = getComputedStyle(area.querySelector('.stage-inner') ?? area);
  const holder = canvas.parentElement;
  const frame = {
    across: holder.offsetWidth - canvas.offsetWidth,
    down: holder.offsetHeight - canvas.offsetHeight,
  };

  return {
    width:
      area.clientWidth -
      parseFloat(padding.paddingLeft) -
      parseFloat(padding.paddingRight) -
      frame.across,
    height:
      area.clientHeight -
      parseFloat(padding.paddingTop) -
      parseFloat(padding.paddingBottom) -
      frame.down,
  };
}

function drawView(context, { sprite, name, box, scale }) {
  const [width, height] = [(box.right - box.left) * scale, (box.bottom - box.top) * scale];

  context.fillText(name, 0, 14);
  context.translate(0, CAPTION);
  context.beginPath();

  // Safari before 16 draws no rounded boxes: there the views keep square corners
  if (context.roundRect) {
    context.roundRect(0, 0, width, height, CORNER);
  } else {
    context.rect(0, 0, width, height);
  }

  context.clip();
  // a view drawn very small keeps a checker that can be seen, and drawn
  drawChecker(context, { width, height }, Math.max(2, scale * 2));
  context.translate(-box.left * scale, -box.top * scale);
  drawSprite(context, sprite, scale);
}

// Made once a playback, as its box is: made again at each tick, every view composited and the
// mirrored sides flipped pixel by pixel, playing lagged on a slow phone. A change stops playing.
function spriteAt(app, animation, view) {
  const tick = app.playback.frame;
  const sprites = (app.playback.sprites ??= new Map());
  const key = `${view.direction}:${tick}`;

  if (!sprites.has(key)) {
    sprites.set(key, keepsStill(playedSprite(app.store.state.project, animation, view, tick)));
  }

  return sprites.get(key);
}

export function paintAllViews(canvas, app) {
  const { state } = app.store;
  const { project } = state;
  const animation = currentAnimation(state);
  const views = playedViews(project, animation);

  // found once for a play: the art does not change while it runs
  app.playback.box ??= playedBox(project, animation, views);

  const { box } = app.playback;
  const size = { width: box.right - box.left, height: box.bottom - box.top };
  const { columns, scale } = playLayout(
    { count: views.length, ...size },
    roomFor(canvas),
    state.zoom,
  );
  const step = { x: size.width * scale + GAP, y: size.height * scale + CAPTION + GAP };
  const rows = Math.ceil(views.length / columns);
  const { context } = sizeCanvas(canvas, step.x * columns - GAP, step.y * rows - GAP);

  context.font = `600 12px ${cssVar('--font-ui')}`;
  context.fillStyle = cssVar('--label-secondary');

  views.forEach((view, i) => {
    context.save();
    context.translate((i % columns) * step.x, Math.floor(i / columns) * step.y);
    drawView(context, {
      sprite: spriteAt(app, animation, view),
      name: viewName(project, view.direction),
      box,
      scale,
    });
    context.restore();
  });
}
