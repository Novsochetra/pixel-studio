import { node, replace, toast } from './dom.js';
import { currentAnimation, restructure } from './actions.js';
import { directionLabel } from '../model/project.js';
import { drawableDirections, mirrorsOf } from '../model/profiles.js';
import {
  addAnimation,
  addDirection,
  removeAnimation,
  removeDirection,
} from '../model/structure.js';
import { compositeFrame } from '../model/composite.js';

// Naga Eleven's animations (src/data/sprites.js), offered as names for new ones
const PRESETS = ['Idle', 'Run', 'Kick', 'Slide', 'Fall', 'Dive', 'Celebrate'];

function toggleDirection(state, id) {
  const animation = currentAnimation(state);

  if (animation.directions[id]) {
    removeDirection(animation, id);

    return null;
  }

  addDirection(state.project, animation, id);

  return { direction: id };
}

function directionChips(app, animation) {
  const drawn = Object.keys(animation.directions);
  const toggle = (id) => {
    if (drawn.length === 1 && drawn.includes(id)) {
      toast('An animation needs at least one direction.');

      return;
    }

    restructure(app, drawn.includes(id) ? 'Remove direction' : 'Add direction', (state) =>
      toggleDirection(state, id),
    );
  };

  return node(
    'div.guide-checks',
    { role: 'group', 'aria-label': 'Directions drawn' },
    drawableDirections(app.store.state.project).map((id) =>
      node(
        `button.btn${drawn.includes(id) ? '.on' : ''}`,
        { 'aria-pressed': String(drawn.includes(id)), onclick: () => toggle(id) },
        directionLabel(id),
      ),
    ),
  );
}

// a new animation starts from the current one's first frame in each direction
function startAnimation(state, name) {
  const from = currentAnimation(state);
  const animation = addAnimation(state.project, name, Object.keys(from.directions));

  for (const [direction, entry] of Object.entries(animation.directions)) {
    entry.frames[0].layers[0].sprite = compositeFrame(
      from.directions[direction].frames[0],
      state.project.canvas.width,
      state.project.canvas.height,
    );
  }

  return { animation: animation.id, frame: 0, layer: null };
}

function newAnimationForm(app) {
  const { state } = app.store;
  const used = new Set(state.project.animations.map((animation) => animation.name));
  const choice = node(
    'select.input',
    { id: 'new-animation', 'aria-label': 'New animation' },
    node('option', { value: '' }, 'New animation…'),
    PRESETS.filter((name) => !used.has(name)).map((name) => node('option', { value: name }, name)),
    node('option', { value: '*' }, 'Another name…'),
  );
  choice.addEventListener('change', () => {
    const name =
      choice.value === '*' ? `Animation ${state.project.animations.length + 1}` : choice.value;

    if (name) {
      restructure(app, `New animation: ${name}`, (draft) => startAnimation(draft, name));
    }
  });

  return choice;
}

export function renderAnimationPanel(el, app) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  let confirmDelete = false;
  const pick = node(
    'select.input',
    {
      id: 'animation',
      'aria-label': 'Animation',
      onchange: (event) =>
        app.store.set({
          at: { ...state.at, animation: event.target.value, frame: 0, layer: null },
          selection: null,
        }),
    },
    state.project.animations.map((candidate) =>
      node(
        'option',
        { value: candidate.id, selected: candidate.id === animation.id },
        candidate.name,
      ),
    ),
  );
  const rename = node('input.input', {
    value: animation.name,
    id: 'animation-name',
    'aria-label': 'Animation name',
    onchange: (event) =>
      restructure(app, 'Rename animation', (draft) => {
        currentAnimation(draft).name = event.target.value.trim() || currentAnimation(draft).name;
      }),
  });
  const remove = node(
    'button.btn.quiet',
    {
      disabled: state.project.animations.length < 2,
      title: 'Undo brings it back',
      onclick: (event) => {
        if (!confirmDelete) {
          confirmDelete = true;
          event.currentTarget.textContent = `Delete ${animation.name}? Click again`;

          return;
        }

        restructure(app, `Delete ${animation.name}`, (draft) => {
          removeAnimation(draft.project, animation.id);

          return { animation: draft.project.animations[0].id, frame: 0, layer: null };
        });
      },
    },
    'Delete',
  );

  replace(
    el,
    node('h2', {}, 'Animation'),
    node('div.compare', { style: { gridTemplateColumns: '1fr 1fr' } }, pick, newAnimationForm(app)),
    node('div.group', { style: { gap: '6px' } }, rename, remove),
    node(
      'div.field',
      {},
      node(
        'span',
        {},
        Object.keys(mirrorsOf(state.project)).length
          ? 'Directions drawn (the left side is mirrored from the right)'
          : 'Directions drawn',
      ),
      directionChips(app, animation),
    ),
  );
}
