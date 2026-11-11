import { node, replace } from '../dom.js';
import { currentAnimation, goTo } from '../actions.js';
import { backgroundOf } from '../preview-background.js';
import { cast } from '../preview-scene.js';
import { drawScene } from './scene-draw.js';
import { drawCentred, drawTiles } from './flat-draw.js';
import { sceneOptions } from './scene-controls.js';
import { roomFor, zoomButtons, zoomOf } from './preview-zoom.js';
import { frameAtTick } from '../../model/frame-play.js';
import { hasArt } from '../../model/frames.js';
import { kindOf, viewName } from '../../model/kinds.js';

const FEET_ROOM = 24;

function animationPicker(app) {
  const { state } = app.store;
  // through goTo: the animation picked may lack the view being edited
  const choose = (event) => goTo(app, { animation: event.target.value, frame: 0, layer: null });

  return node(
    'select.input',
    { id: 'pitch-animation', 'aria-label': 'Animation', onchange: choose },
    state.project.animations.map((animation) =>
      node(
        'option',
        { value: animation.id, selected: animation === currentAnimation(state) },
        animation.name,
      ),
    ),
  );
}

function noteText(state, mode) {
  const animation = currentAnimation(state);
  const speed = `at ${animation.fps} fps`;

  if (!viewFrames(state).some(hasArt)) {
    return `Nothing is drawn in ${animation.name} yet: draw in Edit, and it shows here as it will be used.`;
  }

  if (mode !== 'scene') {
    return `${animation.name}, ${speed}. ${mode === 'tiled' ? 'Laid edge to edge: a seam shows where the sides do not meet.' : 'At 1×, 2× and 4×, on light and dark.'}`;
  }

  const views = cast(state.project, animation, state.game.mirrored).map((member) =>
    viewName(state.project, member.direction),
  );

  return `${animation.name}: ${views.join(', ')}, ${speed}. At 1×, one art pixel is one pixel of the scene.`;
}

function viewFrames(state) {
  const animation = currentAnimation(state);

  return (animation.directions[state.at.direction] ?? Object.values(animation.directions)[0])
    .frames;
}

// A scene larger than the window opened on its top left corner, the art being previewed out of
// sight: the window is scrolled across to the cast, and down only as far as its feet need.
function showSubject(canvas, subject) {
  const stage = canvas.closest('.stage');
  const scene = canvas.getBoundingClientRect();
  const room = stage.getBoundingClientRect();
  const scale = scene.width / canvas.width;
  const feet = scene.top + subject.bottom * scale + FEET_ROOM;

  stage.scrollLeft += scene.left + subject.x * scale - (room.left + room.width / 2);
  stage.scrollTop += Math.max(0, feet - room.bottom);
}

function paintPreview(canvas, app, { clock, time }) {
  const { state } = app.store;
  const mode = kindOf(state.project).preview;
  const seconds = clock.started === null ? null : (time - clock.started) / 1000;
  const animation = currentAnimation(state);
  const tick =
    seconds === null
      ? Math.min(state.at.frame, 99)
      : frameAtTick(animation, Math.floor(seconds * animation.fps));
  const flat = mode === 'tiled' ? drawTiles : drawCentred;
  const size =
    mode === 'scene'
      ? drawScene(canvas, state, { background: clock.background, clock: { tick, seconds } })
      : flat(canvas, state.project, { frames: viewFrames(state), tick });
  const zoom = zoomOf(state, mode, roomFor(canvas));
  // the ground line too: it moves when the scene's own picture arrives, after the first look
  const shown = `${size.width}×${size.height} at ${zoom} on ${size.subject?.bottom}`;

  canvas.style.width = `${size.width * zoom}px`;
  canvas.style.maxWidth = zoom === 1 ? '100%' : 'none';

  if (size.subject && clock.shown !== shown) {
    clock.shown = shown;
    showSubject(canvas, size.subject);
  }
}

const playButton = (playing, onclick) =>
  node('button.btn.primary', { onclick }, playing ? 'Pause' : 'Play');

// The art where it will be used: in a scene, laid as tiles, or at icon sizes. It plays on its own
// clock, independent of the frames' Play.
export function mountPreview(container, app) {
  const canvas = node('canvas', { 'aria-label': 'The art where it will be used' });
  const bar = node('div.group.preview-bar');
  const note = node('p.hint.preview-note');

  container.replaceChildren(
    node('div.stage-inner.preview', {}, node('div.preview-bar-place', {}, bar), canvas, note),
  );
  const clock = { started: null, background: null, shown: null, more: false };

  const paint = (time) => paintPreview(canvas, app, { clock, time });
  const loop = (time) => {
    if (clock.started !== null && canvas.isConnected) {
      paint(time);
      requestAnimationFrame(loop);
    }
  };

  function render() {
    const { state } = app.store;
    const mode = kindOf(state.project).preview;
    const set = (patch) => app.store.set({ game: { ...state.game, ...patch } });
    const togglePlay = () => {
      clock.started = clock.started === null ? performance.now() : null;
      render();
      requestAnimationFrame(loop);
    };
    const play = playButton(clock.started !== null, togglePlay);
    const own = mode === 'scene' ? sceneOptions(app, set, clock) : null;
    const zooms = zoomButtons(mode, zoomOf(state, mode, roomFor(canvas)), set);

    replace(bar, animationPicker(app), play, zooms, own);
    note.textContent = noteText(state, mode);
    backgroundOf(app).then((image) => {
      clock.background = image;
      paint(performance.now());
    });
    paint(performance.now());
  }

  return { render };
}
