import { toast } from '../dom.js';
import { isPosedBody } from '../../model/body/body-kind.js';

// Painting on a Body drawn from its parts would be lost at its next pose, so it is posed instead.
export function refusesPaint(layers) {
  if (!layers.some(isPosedBody)) {
    return false;
  }

  toast(
    'Body is drawn from its parts: pick a part with the Pose tool (O) to draw on it, paint on a layer above, or turn this frame into pixels.',
  );

  return true;
}
