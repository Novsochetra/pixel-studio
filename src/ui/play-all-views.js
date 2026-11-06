import { currentAnimation } from './actions.js';
import { cssVar, drawChecker, drawSprite, sizeCanvas } from './draw.js';
import { cast, frameSprite } from './preview-scene.js';
import { isSingleView, viewName } from '../model/kinds.js';

const GAP = 16;
const CAPTION = 22;
const MARGIN = 64;

const playedViews = (state) => cast(state.project, currentAnimation(state), true);

// with All views on, Play shows every view moving together, the mirrored sides as the game flips them
export function playsAllViews(app) {
  const { state } = app.store;

  return (
    Boolean(app.playback) &&
    state.gridAll &&
    !isSingleView(state.project) &&
    playedViews(state).length > 1
  );
}

// every view fits side by side above the frames, never drawn bigger than the zoom being edited at
function sideBySideScale(canvas, { count, width, height }, zoom) {
  const area = canvas.closest('.edit-scroll');

  if (!area) {
    return zoom;
  }

  const across = (area.clientWidth - MARGIN - GAP * (count - 1)) / (count * width);
  const down = (area.clientHeight - MARGIN - CAPTION) / height;

  return Math.max(1, Math.min(zoom, Math.floor(Math.min(across, down))));
}

export function paintAllViews(canvas, app) {
  const { state } = app.store;
  const { project } = state;
  const animation = currentAnimation(state);
  const views = playedViews(state);
  const { width, height } = project.canvas;
  const scale = sideBySideScale(canvas, { count: views.length, width, height }, state.zoom);
  const step = width * scale + GAP;
  const { context } = sizeCanvas(canvas, step * views.length - GAP, height * scale + CAPTION);

  context.font = `600 12px ${cssVar('--font-ui')}`;
  context.fillStyle = cssVar('--label-secondary');

  views.forEach((view, i) => {
    context.fillText(viewName(project, view.direction), i * step, 14);
    context.save();
    context.translate(i * step, CAPTION);
    drawChecker(context, { width: width * scale, height: height * scale }, scale * 2);
    drawSprite(context, frameSprite(project, animation, view, app.playback.frame), scale);
    context.restore();
  });
}
