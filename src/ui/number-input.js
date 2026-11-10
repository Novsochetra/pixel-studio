import { node } from './dom.js';

export function numberInput({ id, label, max, min = 1, value = '' }) {
  return node('input.input.mono', {
    id,
    type: 'number',
    min: String(min),
    max: String(max),
    value: String(value),
    'aria-label': label,
  });
}
