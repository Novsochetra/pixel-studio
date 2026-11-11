import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { chooseFile } from '../choose-file.js';
import { removeBackground, setBackground } from '../preview-background.js';
import { mirrorsOf } from '../../model/directions.js';
import { gameOf } from '../../model/presets.js';
import { inWords } from '../../model/told.js';
import { slider } from '../slider.js';
import { askDelete } from '../ask-delete.js';

function checkbox(label, checked, onChange) {
  return node(
    'label.group.switch-label',
    {},
    node('input.switch', {
      type: 'checkbox',
      role: 'switch',
      checked,
      onchange: (event) => onChange(event.target.checked),
    }),
    label,
  );
}

function groundSlider(app) {
  const { project } = app.store.state;
  const setGround = (event) => {
    project.preview = { ...project.preview, ground: Number(event.target.value) };
    changeStructure(app, 'background');
  };
  const own = Boolean(project.preview?.background);
  const fallback = !own && gameOf(project).ground ? gameOf(project).ground : 0.85;

  return node(
    'label.group',
    { style: { gap: '4px' }, title: 'Where the feet stand' },
    'Ground',
    slider({
      min: '0.3',
      max: '1',
      step: '0.005',
      value: String(project.preview?.ground ?? fallback),
      'aria-label': 'Ground line',
      onchange: setGround,
    }),
  );
}

function backgroundButtons(app) {
  const { project } = app.store.state;
  const own = Boolean(project.preview?.background);
  const pick = () =>
    chooseFile((file) =>
      setBackground(app, file).catch((error) =>
        toast(inWords(error, 'That picture could not be used. Try a PNG, WebP or JPEG.')),
      ),
    );

  return [
    node(
      'button.btn.quiet',
      { onclick: pick },
      own ? 'Change background…' : 'Use your own background…',
    ),
    own
      ? node(
          'span.ask-place',
          {},
          node(
            'button.btn.quiet',
            { onclick: (event) => askBackground(app, event.currentTarget.parentElement) },
            gameOf(project).background === 'pitch' ? 'Back to the pitch' : 'No background',
          ),
        )
      : null,
  ];
}

// the picture is taken off the project for good, and undo does not bring it back: it asks first
const askBackground = (app, place) =>
  askDelete(place, {
    question: 'Remove your background?',
    word: 'Remove',
    onDelete: () => removeBackground(app),
  });

// how the scene shows the art: at the game's size, with the mirrored side, running, where the
// ground is, and on which background
export function sceneControls(app, set) {
  const { state } = app.store;
  const view = state.game;
  const gameHeight = gameOf(state.project).spriteHeight;
  const sizes = [
    ['match', 'Match size'],
    ['game', `Game size (${gameHeight} px)`],
  ];

  return [
    gameHeight
      ? node(
          'div.segmented',
          { role: 'group', 'aria-label': 'Size' },
          sizes.map(([id, label]) =>
            node(
              'button',
              { 'aria-pressed': String(view.size === id), onclick: () => set({ size: id }) },
              label,
            ),
          ),
        )
      : null,
    Object.keys(mirrorsOf(state.project)).length
      ? checkbox('Mirrored side', view.mirrored, (mirrored) => set({ mirrored }))
      : null,
    state.project.kind === 'character'
      ? checkbox('Run across', view.runAcross, (runAcross) => set({ runAcross }))
      : null,
    groundSlider(app),
    backgroundButtons(app),
  ];
}

// On a phone the scene's own controls fold under one word, so the bar is short enough to stay at
// the top with Play in it: five rows of them were half the screen, and went up out of sight when
// the scene was scrolled to the art. kept: { more }, whether they are unfolded, across redraws.
export function sceneOptions(app, set, kept) {
  const controls = sceneControls(app, set);

  if (app.store.state.layout !== 'compact') {
    return controls;
  }

  const remember = (event) => {
    kept.more = event.currentTarget.open;
  };

  return node(
    'details.preview-more',
    { open: kept.more, ontoggle: remember },
    node('summary.btn.quiet', {}, 'Scene options'),
    node('div.group.preview-more-body', {}, controls),
  );
}
