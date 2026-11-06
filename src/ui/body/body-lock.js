import { toast } from '../dom.js';
import { isPosedBody } from '../../model/body/body-kind.js';

// Painting on a Body drawn from its parts would be lost at its next pose, so it is posed instead.
export function refusesPaint(layers) {
  if (!layers.some(isPosedBody)) {
    return false;
  }

  toast(
    'Body is drawn from its parts: pose them with the Pose tool (O), paint on a layer above, or turn this frame into pixels.',
  );

  return true;
}
