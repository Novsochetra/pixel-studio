// a press that ends without a click (a drag, a press on nothing) still does what waited on it
const NO_CLICK_MS = 120;
// A finger's tap blurs the field only after its pointerup, with the mouse events the browser makes
// from it: for this long after a finger lifts, a press still counts as under way.
const TAP_MS = 700;
let pressed = false;
let fingerLifted = -Infinity;
let watching = false;

function watchPresses() {
  if (!watching) {
    watching = true;
    document.addEventListener('pointerdown', () => (pressed = true), true);
    document.addEventListener(
      'pointerup',
      (event) => {
        pressed = false;
        fingerLifted = event.pointerType === 'touch' ? performance.now() : -Infinity;
      },
      true,
    );
    document.addEventListener('pointercancel', () => (pressed = false), true);
  }
}

const pressUnderWay = () => pressed || performance.now() - fingerLifted < TAP_MS;

const CONTROL = 'button, a, label, select, input, [role]';
const TYPED_IN = 'input:not([type="checkbox"], [type="radio"], [type="range"]), select, textarea';

const nameOf = (control) => control.getAttribute('aria-label') ?? control.textContent.trim();

// The control the click was for may have been drawn again by the change, with what it does made
// anew from the new value: the click goes to the one now standing in its place. Left to the old
// one, a typed frame width followed by Download would download at the width before.
function passOn(click) {
  const old = click.target.closest?.(CONTROL);
  const now = document.elementFromPoint(click.clientX, click.clientY)?.closest(CONTROL);
  const same = old && now && now.tagName === old.tagName && nameOf(now) === nameOf(old);

  if (old && !old.isConnected && same) {
    click.stopImmediatePropagation();
    click.preventDefault();
    // a field pressed is a field to type in: a click on the new one would not put the caret there
    now.matches(TYPED_IN) ? now.focus() : now.click();
  }
}

// A field says it has changed as it loses focus, in the middle of a press on something else. What
// the change leads to (a list or a window drawn again) waits until that press's click arrives,
// and is done just before the click's own work. Done sooner, the button under the pointer would
// be replaced and the click would land on nothing; done later, the click would have gone to
// another frame or project first and the change would follow it there.
export function afterPress(then) {
  watchPresses();

  if (!pressUnderWay()) {
    then();

    return;
  }

  let waiting = true;
  const once = (click) => {
    if (waiting) {
      waiting = false;
      window.removeEventListener('click', once, true);
      then();

      if (click?.type === 'click') {
        passOn(click);
      }
    }
  };

  window.addEventListener('click', once, true);

  // a finger has lifted already: its click is on its way, or never comes
  if (pressed) {
    window.addEventListener('pointerup', () => setTimeout(once, NO_CLICK_MS), {
      once: true,
      capture: true,
    });
  } else {
    setTimeout(once, TAP_MS);
  }
}

// to be called once as the page starts, so the first press of all is seen
export const watchPressesFromStart = watchPresses;
