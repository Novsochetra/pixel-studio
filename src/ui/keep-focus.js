import { focusables } from './focus.js';

// fields the person is done with (Enter, in a field they clicked into): the keys go back to the
// editor's shortcuts, not to the field drawn in its place
const done = new WeakSet();

export const letGoOf = (field) => done.add(field);

const stepsTo = (control, within) => {
  const steps = [];

  for (let at = control; at !== within; at = at.parentElement) {
    steps.unshift([...at.parentElement.children].indexOf(at));
  }

  return steps;
};

// what a control is known by when its bar is drawn again: the part of the page it stands in,
// its name or its words, and where in that part it stood
function placeOf(control, root) {
  const region = control.closest('[id]');
  const within = region && root.contains(region) ? region : root;

  return {
    id: control.id,
    region: within === root ? '' : within.id,
    tag: control.tagName,
    label: control.getAttribute('aria-label'),
    words: control.textContent.trim(),
    index: focusables(within).indexOf(control),
    steps: stepsTo(control, within),
  };
}

const isNamed = (control, place) =>
  control.tagName === place.tag &&
  (place.label
    ? control.getAttribute('aria-label') === place.label
    : Boolean(place.words) && control.textContent.trim() === place.words);

// the one of them that stands nearest to where the control stood
const nearest = (matches, controls, index) =>
  matches.reduce(
    (best, control) =>
      Math.abs(controls.indexOf(control) - index) < Math.abs(controls.indexOf(best) - index)
        ? control
        : best,
    matches[0],
  );

// A control whose name changes as it is used (Play to Pause, Hide to Show) is found where it
// stood: by its words alone, the keys went to another row's button, or to nothing.
function nowAt(place, root) {
  if (place.id) {
    return document.getElementById(place.id);
  }

  const within = (place.region && document.getElementById(place.region)) || root;
  const controls = focusables(within);
  const named = controls.filter((control) => isNamed(control, place));
  const inPlace = place.steps.reduce((at, step) => at?.children[step], within);
  const stood = controls.includes(inPlace) && inPlace.tagName === place.tag ? inPlace : null;

  return (
    nearest(named, controls, place.index) ??
    stood ??
    controls[Math.min(place.index, controls.length - 1)]
  );
}

// The bars are drawn again at every change, and the control that made the change goes with the
// old ones: the keys are handed to the one now in its place, so Enter, the arrows and Tab go on
// from there. Only for someone using the keys (:focus-visible): after a click the keys stay the
// editor's own, and Space pans.
export function keepFocus(root, draw) {
  const held = document.activeElement;
  const keeps = held && root.contains(held) && held.matches(':focus-visible') && !done.has(held);
  const place = keeps ? placeOf(held, root) : null;

  draw();

  if (place && !held.isConnected && !root.contains(document.activeElement)) {
    nowAt(place, root)?.focus({ preventScroll: true });
  }
}
