import { node } from './dom.js';

export function numberInput({ id, label, max, value = '' }) {
  return node('input.input.mono', {
    id,
    type: 'number',
    min: '1',
    max: String(max),
    value: String(value),
    'aria-label': label,
  });
}
