import { node } from './dom.js';

// a switch on a row of its own: what it is called, what it does, and the switch
export function toggle({ id, label, hint }, checked, onChange) {
  return node(
    'label.toggle-row',
    { for: id },
    node('span', {}, node('div', {}, label), node('div.hint', {}, hint)),
    node('input.switch', {
      type: 'checkbox',
      id,
      role: 'switch',
      checked,
      onchange: (event) => onChange(event.target.checked),
    }),
  );
}
