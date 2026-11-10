import { node } from './dom.js';

// how far along its track the knob stands, for the tint that fills the track up to it
const filled = (field) => {
  const [min, max] = [Number(field.min), Number(field.max)];

  return `${((Number(field.value) - min) / (max - min || 1)) * 100}%`;
};

// A slider drawn as the rest of the page is: a browser's own looks different in each of them.
// Chrome and Safari have no way to tint the track up to the knob, so the field says how far it is.
export function slider(props) {
  const field = node('input.slider', { type: 'range', ...props });
  const fill = () => field.style.setProperty('--filled', filled(field));

  field.addEventListener('input', fill);
  fill();

  return field;
}
