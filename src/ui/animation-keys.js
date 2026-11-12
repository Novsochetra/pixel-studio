import { duplicateFrame, newFrameAtEnd } from './frame-actions.js';
import { toast } from './dom.js';

// Keys for the animation's own steps, which had none: play and pause, a frame added or copied,
// onion skin, and a save on demand. Alt and a letter is read by the key's place, as a Mac's
// Option types a letter of its own with it.
const WITH_ALT = {
  KeyN: (app) => newFrameAtEnd(app, app.store.state.at.direction),
  KeyD: (app) => duplicateFrame(app, app.store.state.at.frame),
  KeyO: (app) => app.store.set({ onion: !app.store.state.onion }),
};

// the work is kept as it changes: ⌘S, which people press anyway, saves at once and says so
function saveNow(app) {
  app.saver
    .flushNow()
    .then(() => toast('Saved'))
    .catch(() => toast('Could not save just now. Try again in a moment.'));
}

// Enter plays and pauses with the keys on the page or the canvas: on a control it is the
// control's own key
const onPage = () =>
  document.activeElement === document.body || document.activeElement?.tagName === 'CANVAS';

// the key's work, or null: what Enter, ⌘S and Alt with a letter do here
function workOf(app, event, command) {
  if (command) {
    return event.key.toLowerCase() === 's' ? saveNow : null;
  }

  if (event.altKey) {
    return WITH_ALT[event.code] ?? null;
  }

  return event.key === 'Enter' && !app.store.state.selection && onPage()
    ? () => app.togglePlay?.()
    : null;
}

// whether the key was one of these, done
export function handleAnimationKey(app, event, command) {
  const work = workOf(app, event, command);

  if (!work) {
    return false;
  }

  event.preventDefault();
  work(app);

  return true;
}
