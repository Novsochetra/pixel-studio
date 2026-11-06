import { node } from './dom.js';
import { changeStructure } from './actions.js';
import { characterColors } from './character-colours.js';
import { GUIDE_RULES } from '../views/guides.js';
import { guideChips } from './guide-chips.js';
import { toHex } from '../model/sprite.js';

function checks(app, guide) {
  const { state } = app.store;

  if (guide.rule === 'fixed') {
    return null;
  }

  return node('div.guide-checks', {}, guideChips(state, guide));
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

// one guide: its name, row and rule, and how far off each view is
export function guideRow(app, guide) {
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
