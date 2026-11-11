import { watchMore } from './more-behind.js';

// A row of choices wider than the screen scrolls sideways: the one picked is brought in sight,
// and the row is marked while more waits past its edge. Without either, a choice cut off by the
// screen ("Cus" for Custom) stayed cut off even once it was the one picked.
export function keepInReach(control) {
  const picked = control.querySelector(':scope > [aria-pressed="true"]');

  if (picked && control.scrollWidth > control.clientWidth) {
    const past = picked.offsetLeft + picked.offsetWidth - control.scrollLeft - control.clientWidth;
    const before = picked.offsetLeft - control.scrollLeft;

    control.scrollLeft += past > 0 ? past + 2 : Math.min(0, before - 2);
  }

  watchMore(control);
}
