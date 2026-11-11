const CONTROLS = 'button, input, select';

// where the keys are: a part's row and which of its controls, or a button by its words
function placeOf(control) {
  const row = control.closest('.cut-part');

  return row
    ? { part: row.dataset.part, index: [...row.querySelectorAll(CONTROLS)].indexOf(control) }
    : { words: control.textContent };
}

function controlAt(body, place) {
  if (!place.part) {
    return [...body.querySelectorAll('button')].find(
      (button) => button.textContent === place.words,
    );
  }

  const row =
    body.querySelector(`.cut-part[data-part="${place.part}"]`) ??
    body.querySelector('.cut-part.picked');
  const controls = row ? [...row.querySelectorAll(CONTROLS)] : [];
  const same = controls[place.index];

  return same && !same.disabled ? same : controls[0];
}

// The window is drawn again at every change: the keys stay on the control that made it, on its
// part's row wherever that now stands.
export function keepingFocus(body, draw) {
  const held = body.contains(document.activeElement) ? document.activeElement : null;
  const place = held && placeOf(held);

  draw();

  if (place && !held.isConnected) {
    controlAt(body, place)?.focus();
  }
}
