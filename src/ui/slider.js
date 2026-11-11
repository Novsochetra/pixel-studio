import { node } from './dom.js';

// how far along its track the knob stands, for the tint that fills the track up to it
const filled = (field) => {
  const [min, max] = [Number(field.min), Number(field.max)];

  return `${((Number(field.value) - min) / (max - min || 1)) * 100}%`;
};

const inItsPlace = (field) =>
  field.id
    ? document.getElementById(field.id)
    : document.querySelector(`input.slider[aria-label="${field.getAttribute('aria-label')}"]`);

// A change may draw the slider's panel again, with a new slider where this one stood: the keys
// go to that one, so the arrows go on moving the knob.
function keepingKeys(field, onchange) {
  return (event) => {
    const held = document.activeElement === field;

    onchange(event);

    if (held && !field.isConnected) {
      inItsPlace(field)?.focus();
    }
  };
}

// A slider drawn as the rest of the page is: a browser's own looks different in each of them.
// Chrome and Safari have no way to tint the track up to the knob, so the field says how far it is.
export function slider({ onchange, ...props }) {
  const field = node('input.slider', { type: 'range', ...props });
  const fill = () => field.style.setProperty('--filled', filled(field));

  field.addEventListener('input', fill);
  fill();

  if (onchange) {
    field.addEventListener('change', keepingKeys(field, onchange));
  }

  return field;
}
