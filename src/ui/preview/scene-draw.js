import { currentAnimation, referenceSprite } from '../actions.js';
import { cssVar } from '../draw.js';
import { isPitch } from '../preview-background.js';
import {
  PLAIN_SIZE,
  cast,
  drawPlainGround,
  drawStanding,
  frameSprite,
  standingSpots,
} from '../preview-scene.js';
import { bounds } from '../../model/sprite.js';
import { gameOf } from '../../model/presets.js';
import { artAnchor } from '../../export/anchor.js';

const RUN_SPEED = 70;

// where the art's feet are, and how much to scale it: at the game's own size when asked
function standing(state) {
  const { project } = state;
  const ref = referenceSprite(state);
  const box = ref && bounds(ref);
  const anchor = box
    ? artAnchor(ref)
    : { x: Math.floor(project.canvas.width / 2), y: Math.round(project.canvas.height * 0.8) };
  const gameHeight = gameOf(project).spriteHeight;
  const factor =
    state.game.size === 'game' && box && gameHeight ? gameHeight / (box.bottom - box.top) : 1;
  const wide = box ? box.right - box.left : project.canvas.width / 2;

  return { anchor, factor, spacing: (wide + 16) * factor };
}

function groundOf(project, background) {
  const own = project.preview?.ground;

  if (own !== undefined && own !== null) {
    return own;
  }

  return isPitch(background) ? (gameOf(project).ground ?? 0.85) : 0.85;
}

function backdrop(context, background, { width, height, groundY }) {
  if (background) {
    context.drawImage(background, 0, 0, width, height);
  } else {
    drawPlainGround(
      context,
      { width, height, groundY },
      { sky: cssVar('--well'), ground: cssVar('--chrome-raised') },
    );
  }
}

// Every drawn view standing side by side on the ground line (and the mirrored ones if asked), plus
// one running across when asked. clock: { tick, seconds } of the animation playing, or still.
export function drawScene(canvas, state, { background, clock }) {
  const { project } = state;
  const view = state.game;
  const animation = currentAnimation(state);
  const { width, height } = background
    ? { width: background.naturalWidth, height: background.naturalHeight }
    : PLAIN_SIZE;
  const groundY = Math.round(height * groundOf(project, background));
  const { anchor, factor, spacing } = standing(state);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  backdrop(context, background, { width, height, groundY });
  const members = cast(project, animation, view.mirrored);
  const stand = (member, x) =>
    drawStanding(context, frameSprite(project, animation, member, clock.tick), {
      x,
      groundY,
      anchor,
      factor,
    });

  standingSpots(members.length, width, spacing).forEach((x, i) => stand(members[i], x));

  if (view.runAcross) {
    const runner = animation.directions.east ? 'east' : Object.keys(animation.directions)[0];
    const x = clock.seconds === null ? 60 : ((clock.seconds * RUN_SPEED) % (width + 100)) - 50;
    stand({ source: runner, flip: false }, x);
  }

  return { width, height };
}
