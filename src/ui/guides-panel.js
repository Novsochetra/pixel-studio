import { node, replace } from './dom.js';
import { changeStructure, directionSprite, directionsInUse, referenceSprite } from './actions.js';
import { GUIDE_RULES, checkGuide, describeCheck, measureGuide, newGuide } from '../views/guides.js';
import { directionLabel } from '../model/project.js';
import { toHex } from '../model/sprite.js';
import { characterColors } from './character-colours.js';

function checks(app, guide) {
  const { state } = app.store;

  if (guide.rule === 'fixed') {
    return null;
  }

  return node(
    'div.guide-checks',
    {},
    directionsInUse(state).map((direction) => {
      const sprite = directionSprite(state, direction);
      const check = sprite ? checkGuide(sprite, guide) : { state: 'missing' };

      return node(
        'span.chip',
        { 'data-state': check.state },
        `${directionLabel(direction)}: ${describeCheck(check)}`,
      );
    }),
  );
}

function ruleFields(app, guide) {
  const update = (patch) => {
    Object.assign(guide, patch);
    changeStructure(app, 'guides');
  };
  const rule = node(
    'select.input',
    {
      'aria-label': `What ${guide.name} marks`,
      id: `guide-rule-${guide.id}`,
      onchange: (event) => update({ rule: event.target.value }),
    },
    Object.entries(GUIDE_RULES).map(([value, label]) =>
      node('option', { value, selected: guide.rule === value }, label),
    ),
  );
  const colours = characterColors(app.store.state);
  const colour =
    guide.rule === 'colour-top'
      ? node(
          'select.input.mono',
          {
            'aria-label': `Colour ${guide.name} follows`,
            id: `guide-colour-${guide.id}`,
            onchange: (event) => update({ colour: Number(event.target.value) }),
          },
          node('option', { value: '' }, 'Pick a colour'),
          colours.map((option) =>
            node(
              'option',
              { value: String(option), selected: guide.colour === option },
              toHex(option),
            ),
          ),
        )
      : null;

  return [rule, colour];
}

function guideRow(app, guide) {
  const { project } = app.store.state;
  const update = (patch) => {
    Object.assign(guide, patch);
    changeStructure(app, 'guides');
  };
  const remove = () => {
    project.guides = project.guides.filter((other) => other !== guide);
    changeStructure(app, 'guides');
  };

  return node(
    'div.guide-row',
    {},
    node('input.input', {
      value: guide.name,
      'aria-label': 'Guide name',
      id: `guide-name-${guide.id}`,
      onchange: (event) => update({ name: event.target.value || 'Guide' }),
    }),
    node('input.input.mono', {
      type: 'number',
      min: '0',
      max: String(project.canvas.height - 1),
      value: String(guide.row),
      'aria-label': `${guide.name} row`,
      id: `guide-row-${guide.id}`,
      onchange: (event) => update({ row: Number(event.target.value) }),
    }),
    node(
      'button.btn.quiet',
      { 'aria-label': `Remove ${guide.name}`, title: 'Remove guide', onclick: remove },
      '×',
    ),
    ...ruleFields(app, guide).map((field) =>
      field ? node('div', { style: { gridColumn: '1 / -1', display: 'grid' } }, field) : null,
    ),
    checks(app, guide),
  );
}

export function renderGuidesPanel(el, app) {
  const { state } = app.store;
  const add = () => {
    const ref = referenceSprite(state);
    const guide = newGuide('Guide', 0, 'fixed');
    guide.row = ref ? Math.floor(ref.height / 2) : 0;
    state.project.guides.push(guide);
    changeStructure(app, 'guides');
  };
  const snapToReference = () => {
    const ref = referenceSprite(state);
    state.project.guides.forEach((guide) => {
      const row = ref ? measureGuide(ref, guide) : null;
      guide.row = row ?? guide.row;
    });
    changeStructure(app, 'guides');
  };

  replace(
    el,
    node(
      'h2',
      {},
      'Guide lines',
      node(
        'label.group',
        { for: 'show-guides' },
        node('input', {
          type: 'checkbox',
          id: 'show-guides',
          checked: state.showGuides,
          onchange: (event) => app.store.set({ showGuides: event.target.checked }),
        }),
        'Show',
      ),
    ),
    state.project.guides.map((guide) => guideRow(app, guide)),
    node(
      'div.group',
      { style: { gap: '6px' } },
      node('button.btn', { onclick: add }, 'Add guide'),
      node(
        'button.btn',
        {
          onclick: snapToReference,
          title: 'Move each checked guide to where the front view has it',
        },
        'Match the front',
      ),
    ),
    node(
      'p.hint',
      {},
      'A guide that marks the top or bottom of the sprite, or the top of a colour, checks every view and says how many rows off it is.',
    ),
  );
}
