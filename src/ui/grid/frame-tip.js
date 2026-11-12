import { toast } from '../dom.js';
import { hasKeyboard } from '../platform-keys.js';
import { readSetting, keepSetting } from '../remembered.js';

const SAID = 'pixel-clean-frame-hold-said';

// A finger's drag on the frames scrolls them, so a frame is held a moment before it moves: the
// tip that said so was a tooltip, which a finger never sees, and moving a frame took a trip to
// its menu for each place. Said once, the first time a finger picks a frame.
export function tipForFingers() {
  if (hasKeyboard() || readSetting(SAID, false)) {
    return;
  }

  keepSetting(SAID, true);
  toast('Tip: hold a frame, then drag it, to move it. Tap it again for its actions.');
}
