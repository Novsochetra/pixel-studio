import { node, replace, toast } from './dom.js';
import { changeStructure, currentAnimation, referenceSprite } from './actions.js';
import { backgroundOf, isPitch, removeBackground, setBackground } from './preview-background.js';
import { cssVar } from './draw.js';
import { chooseFile } from './views-panel.js';
import {
  PLAIN_SIZE,
  cast,
  drawPlainGround,
  drawStanding,
  frameSprite,
  standingSpots,
} from './preview-scene.js';
import { bounds } from '../model/sprite.js';
import { directionLabel } from '../model/project.js';
import { profileOf } from '../model/profiles.js';
import { artAnchor } from '../export/anchor.js';

// Naga Eleven draws its footballer 58 px tall today (src/data/sprites.js)
const GAME_SPRITE_HEIGHT = 58;
// where the feet stand on the bundled match screenshot (404 of 432 px)
const PITCH_GROUND = 404 / 432;
const RUN_SPEED = 70;

function controls(app, view, playing, onPlay) {
  const { state } = app.store;
  const set = (patch) => app.store.set({ game: { ...view, ...patch } });
  const naga = profileOf(state.project).gamePack;
  const own = Boolean(state.project.preview?.background);
  const ground = state.project.preview?.ground ?? (own || !naga ? 0.85 : PITCH_GROUND);
  const setGround = (event) => {
    state.project.preview = { ...state.project.preview, ground: Number(event.target.value) };
    changeStructure(app, 'background');
  };

  return [
    node(
      'select.input',
      {
        id: 'pitch-animation',
        'aria-label': 'Animation',
        onchange: (event) =>
          app.store.set({
            at: { ...state.at, animation: event.target.value, frame: 0, layer: null },
          }),
      },
      state.project.animations.map((animation) =>
        node(
          'option',
          { value: animation.id, selected: animation.id === currentAnimation(state).id },
          animation.name,
        ),
      ),
    ),
    node('button.btn', { onclick: onPlay }, playing ? 'Pause' : 'Play'),
    naga
      ? node(
          'div.segmented',
          { role: 'group', 'aria-label': 'Character size' },
          [
            ['match', 'Match size'],
            ['game', `Game size (${GAME_SPRITE_HEIGHT} px)`],
          ].map(([id, label]) =>
            node(
              'button',
              { 'aria-pressed': String(view.size === id), onclick: () => set({ size: id }) },
              label,
            ),
          ),
        )
      : null,
    node(
      'div.segmented',
      { role: 'group', 'aria-label': 'Zoom' },
      [1, 2, 3].map((zoom) =>
        node(
          'button',
          { 'aria-pressed': String(view.zoom === zoom), onclick: () => set({ zoom }) },
          `${zoom}×`,
        ),
      ),
    ),
    node(
      'label.group',
      { style: { gap: '4px' } },
      node('input', {
        type: 'checkbox',
        checked: view.mirrored,
        onchange: (event) => set({ mirrored: event.target.checked }),
      }),
      'Mirrored side',
    ),
    node(
      'label.group',
      { style: { gap: '4px' } },
      node('input', {
        type: 'checkbox',
        checked: view.runAcross,
        onchange: (event) => set({ runAcross: event.target.checked }),
      }),
      'Run across',
    ),
    node(
      'label.group',
      { style: { gap: '4px' }, title: 'Where the feet stand' },
      'Ground',
      node('input', {
        type: 'range',
        min: '0.3',
        max: '1',
        step: '0.005',
        value: String(ground),
        'aria-label': 'Ground line',
        onchange: setGround,
      }),
    ),
    node(
      'button.btn.quiet',
      {
        onclick: () =>
          chooseFile((file) =>
            setBackground(app, file).catch((error) =>
              toast(`That picture could not be used: ${error.message}`),
            ),
          ),
      },
      own ? 'Change background…' : 'Use your own background…',
    ),
    own
      ? node(
          'button.btn.quiet',
          { onclick: () => removeBackground(app) },
          naga ? 'Back to the pitch' : 'No background',
        )
      : null,
  ];
}

export function mountGamePreview(container, app) {
  const canvas = node('canvas', { 'aria-label': 'The character in a game scene' });
  const bar = node('div.group', {
    style: { gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },
  });
  const note = node('p.hint', { style: { maxWidth: '680px', textAlign: 'center', margin: '0' } });
  const inner = node(
    'div.stage-inner',
    { style: { gap: '14px', alignContent: 'center' } },
    bar,
    canvas,
    note,
  );
  container.replaceChildren(inner);
  let playing = false;
  let started = 0;
  let background = null;

  function paint(time = 0) {
    const { state } = app.store;
    const { project } = state;
    const view = state.game;
    const animation = currentAnimation(state);
    const tick = playing
      ? Math.floor(((time - started) / 1000) * animation.fps)
      : Math.min(state.at.frame, 99);
    const ref = referenceSprite(state);
    const box = ref && bounds(ref);
    const anchor = box
      ? artAnchor(ref)
      : { x: Math.floor(project.canvas.width / 2), y: Math.round(project.canvas.height * 0.8) };
    const factor =
      view.size === 'game' && box && profileOf(project).gamePack
        ? GAME_SPRITE_HEIGHT / (box.bottom - box.top)
        : 1;
    const { width, height } = background
      ? { width: background.naturalWidth, height: background.naturalHeight }
      : PLAIN_SIZE;
    const groundY = Math.round(
      height * (project.preview?.ground ?? (isPitch(background) ? PITCH_GROUND : 0.85)),
    );
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width * view.zoom}px`;
    canvas.style.maxWidth = view.zoom === 1 ? '100%' : 'none';
    const context = canvas.getContext('2d');

    if (background) {
      context.drawImage(background, 0, 0, width, height);
    } else {
      drawPlainGround(context, width, height, groundY, {
        sky: cssVar('--well'),
        ground: cssVar('--chrome-raised'),
      });
    }

    const members = cast(project, animation, view.mirrored);
    const spacing = ((box ? box.right - box.left : project.canvas.width / 2) + 16) * factor;
    standingSpots(members.length, width, spacing).forEach((x, i) =>
      drawStanding(
        context,
        frameSprite(project, animation, members[i], tick),
        x,
        groundY,
        anchor,
        factor,
      ),
    );
    const runner = animation.directions.east ? 'east' : Object.keys(animation.directions)[0];

    if (view.runAcross) {
      const x = playing ? ((((time - started) / 1000) * RUN_SPEED) % (width + 100)) - 50 : 60;
      drawStanding(
        context,
        frameSprite(project, animation, { source: runner, flip: false }, tick),
        x,
        groundY,
        anchor,
        factor,
      );
    }
  }

  function loop(time) {
    if (!playing || !canvas.isConnected) {
      return;
    }

    paint(time);
    requestAnimationFrame(loop);
  }

  function render() {
    const { state } = app.store;
    const animation = currentAnimation(state);
    const togglePlay = () => {
      playing = !playing;
      started = performance.now();
      render();

      if (playing) {
        requestAnimationFrame(loop);
      }
    };
    replace(bar, controls(app, state.game, playing, togglePlay));
    note.textContent = `${animation.name}: ${cast(state.project, animation, state.game.mirrored)
      .map((member) => directionLabel(member.direction))
      .join(', ')}, at ${animation.fps} fps. At 1×, one art pixel is one pixel of the scene.`;
    backgroundOf(app).then((image) => {
      background = image;
      paint(performance.now());
    });
    paint(performance.now());
  }

  return { render };
}
