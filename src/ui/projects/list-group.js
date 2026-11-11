import { icon, node } from '../dom.js';

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

// a row that is pressed; one that leads to another window shows where it goes and that it does
export function actionRow(label, onclick, { title = null, value = null } = {}) {
  return node(
    `button.list-row.list-action${value ? '.leads' : ''}`,
    { title, onclick },
    node('span.list-label', {}, label),
    value ? [node('span.list-value', {}, value), icon('chevron-right')] : null,
  );
}
