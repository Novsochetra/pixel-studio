import { toast } from '../dom.js';
import { forHands } from '../platform-keys.js';
import { isPosedBody } from '../../model/body/body-kind.js';

// What is done to a hidden layer cannot be seen. The brushes and Move said so; a selection's
// edits, a paste and a flip changed it unseen. A change to many layers at once (every frame and
// view) takes the hidden ones along.
function refusesUnseen(layers) {
  const unseen = layers.length === 1 && !layers[0].visible;

  if (unseen) {
    toast(`${layers[0].name} is hidden, so you would not see it change. Show it in Layers first.`);
  }

  return unseen;
}

// Painting on a Body drawn from its parts would be lost at its next pose, so it is posed instead.
export function refusesPaint(layers) {
  if (refusesUnseen(layers)) {
    return true;
  }

  if (!layers.some(isPosedBody)) {
    return false;
  }

  toast(
    `Body is drawn from its parts: pick a part with the Pose tool${forHands(' (O)', '')} to draw on it, paint on a layer above, or turn this frame into pixels.`,
  );

  return true;
}
