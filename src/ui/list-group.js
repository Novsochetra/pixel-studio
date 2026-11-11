import { icon, node } from './dom.js';

// Rows on one rounded ground, as a phone's Settings has them: a heading above, a note below.
export function listGroup({ title = null, note = null }, ...rows) {
  return node(
    'section.list-group',
    {},
    title ? node('h4.list-title', {}, title) : null,
    node('div.list-rows', {}, rows),
    note ? node('p.list-note', {}, note) : null,
  );
}

export const valueRow = (label, value) =>
  node('div.list-row', {}, node('span.list-label', {}, label), node('span.list-value', {}, value));

// A row with a control at its end: a field, or a choice, which shows the chevron of a menu.
// `swatch` is the colour a choice of colours stands at, shown beside its code.
export const fieldRow = (label, control, { title = null, swatch = null } = {}) =>
  node(
    'label.list-row',
    { title },
    node('span.list-label', {}, label),
    swatch ? node('span.list-swatch', { style: { background: swatch } }) : null,
    control,
    control.matches('select') ? icon('chevron-down') : null,
  );

// `hint` says what the switch does: a pointer hovers for it, and where there is none to hover
// it is a line under the name (56-lists.css)
export function switchRow(label, { id, checked, hint = null }, onChange) {
  return node(
    'label.list-row',
    { for: id, title: hint },
    node('span.list-label.grows', {}, label, hint ? node('small.list-hint', {}, hint) : null),
    node('input.switch', {
      type: 'checkbox',
      role: 'switch',
      id,
      checked,
      onchange: (event) => onChange(event.target.checked),
    }),
  );
}

// A row that is pressed. `value` is said at its end; one that `leads` to another window ends in
// a chevron. `props` are the button's own: disabled, a title, what happens as it is pointed at.
export function actionRow(label, onclick, { value = null, leads = Boolean(value), ...props } = {}) {
  return node(
    `button.list-row.list-action${leads ? '.leads' : ''}`,
    { ...props, onclick },
    node('span.list-label', {}, label),
    value === null ? null : node('span.list-value', {}, value),
    leads ? icon('chevron-right') : null,
  );
}
