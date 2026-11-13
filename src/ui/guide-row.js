import { icon, node } from './dom.js';
import { changeGuides } from './guide-changes.js';
import { characterColors } from './character-colours.js';
import { GUIDE_RULES } from '../views/guides.js';
import { guideChips } from './guide-chips.js';
import { toHex } from '../model/sprite.js';
import { wholeNumber } from '../model/numbers.js';
import { afterPress } from './after-press.js';
import { fieldRow } from './list-group.js';
import { freeName } from '../model/free-name.js';

function checks(app, guide) {
  const { state } = app.store;

  if (guide.rule === 'fixed') {
    return null;
  }

  return node('div.list-row.guide-checks', {}, guideChips(state, guide));
}

// A change to a guide, made after the press that took the focus from its field: the panel is
// drawn again, and "Add guide" must still be there for its click.
const updater = (app, guide) => (patch) =>
  afterPress(() => changeGuides(app, `Change ${guide.name}`, () => Object.assign(guide, patch)));

function ruleField(guide, update) {
  return fieldRow(
    'Marks',
    node(
      'select.list-select',
      {
        'aria-label': `What ${guide.name} marks`,
        id: `guide-rule-${guide.id}`,
        onchange: (event) => update({ rule: event.target.value }),
      },
      Object.entries(GUIDE_RULES).map(([value, label]) =>
        node('option', { value, selected: guide.rule === value }, label),
      ),
    ),
  );
}

function colourField(app, guide, update) {
  if (guide.rule !== 'colour-top') {
    return null;
  }

  return fieldRow(
    'Colour',
    node(
      'select.list-select.mono',
      {
        'aria-label': `Colour ${guide.name} follows`,
        id: `guide-colour-${guide.id}`,
        onchange: (event) =>
          update({ colour: event.target.value === '' ? null : Number(event.target.value) }),
      },
      node('option', { value: '' }, 'Pick a colour'),
      characterColors(app.store.state).map((option) =>
        node('option', { value: String(option), selected: guide.colour === option }, toHex(option)),
      ),
    ),
    { swatch: Number.isFinite(guide.colour) ? toHex(guide.colour) : null },
  );
}

// the row the line is on: a whole row of the canvas, whatever is typed
function rowField(project, guide, update) {
  const last = project.canvas.height - 1;

  return node('input.list-field.mono.guide-at', {
    type: 'number',
    min: '0',
    max: String(last),
    value: String(guide.row),
    'aria-label': `${guide.name} row`,
    id: `guide-row-${guide.id}`,
    onchange: (event) =>
      update({ row: wholeNumber(event.target.value, { min: 0, max: last, fallback: guide.row }) }),
  });
}

// one guide, a group of its own: its name and row, what it marks, and how far off each view is

// A name typed that another guide has is numbered, as a new guide's is: two guides of one name
// had two Remove buttons of one name.
function freeGuideName(project, guide, typed) {
  const others = project.guides.filter((other) => other !== guide).map(({ name }) => name);

  return freeName(typed.trim() || 'Guide', others);
}

export function guideRow(app, guide) {
  const { project } = app.store.state;
  const update = updater(app, guide);
  const remove = () =>
    changeGuides(app, `Remove ${guide.name}`, (guides) => guides.splice(guides.indexOf(guide), 1));

  return node(
    'div.list-rows.guide-row',
    {},
    node(
      'div.list-row',
      {},
      node('input.list-field.guide-name', {
        value: guide.name,
        'aria-label': 'Guide name',
        id: `guide-name-${guide.id}`,
        onchange: (event) => update({ name: freeGuideName(project, guide, event.target.value) }),
      }),
      rowField(project, guide, update),
      node(
        'button.btn.quiet.icon-only.acts',
        { 'aria-label': `Remove ${guide.name}`, title: 'Remove guide', onclick: remove },
        icon('close'),
      ),
    ),
    ruleField(guide, update),
    colourField(app, guide, update),
    checks(app, guide),
  );
}
