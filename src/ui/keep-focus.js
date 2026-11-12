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

// Still there, but switched off (Undo, with nothing left to undo): it keeps the keys, as a
// button that says it is off and does nothing, until the bar is drawn again. On its neighbour
// the next Enter did the opposite of the last; on nothing, the next Tab began the page again.
function standIn(off) {
  const stand = off.cloneNode(true);

  stand.disabled = false;
  stand.setAttribute('aria-disabled', 'true');
  off.replaceWith(stand);

  return stand;
}

// the control now switched off that the keys were on: the one of its name, or the one in its
// place when what it did named it anew (an outline's row, its count now 0)
function switchedOff(place, within, inPlace) {
  const named = [...within.querySelectorAll(':disabled')].find((off) => isNamed(off, place));
  const stands = inPlace?.tagName === place.tag && inPlace.matches(':disabled');

  return named ?? (stands ? inPlace : null);
}

// A control whose name changes as it is used (Play to Pause, Hide to Show) is found where it
// stood: by its words alone, the keys went to another row's button, or to nothing.
function nowAt(place, root) {
  if (place.id) {
    const known = document.getElementById(place.id);

    return known?.disabled ? standIn(known) : known;
  }

  const within = (place.region && document.getElementById(place.region)) || root;
  const controls = focusables(within);
  const named = controls.filter((control) => isNamed(control, place));

  if (named.length) {
    return nearest(named, controls, place.index);
  }

  const inPlace = place.steps.reduce((at, step) => at?.children[step], within);
  const off = switchedOff(place, within, inPlace);

  if (off) {
    return standIn(off);
  }

  return controls.includes(inPlace) && inPlace.tagName === place.tag
    ? inPlace
    : controls[Math.min(place.index, controls.length - 1)];
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
