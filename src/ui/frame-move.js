import { restructure } from './actions.js';
import { toast } from './dom.js';
import { frameAt } from '../model/project.js';
import { clampShift, shiftFrame } from '../model/frame-shift.js';

export function shiftCurrentFrame(app, [dx, dy]) {
  const { project, at } = app.store.state;
  const [shiftX, shiftY] = clampShift(frameAt(project, at), project.canvas, [dx, dy]);

  if (shiftX || shiftY) {
    restructure(app, 'Move frame', (draft) => {
      shiftFrame(frameAt(draft.project, draft.at), [shiftX, shiftY]);
    });
  }
}

// Art is kept on the canvas, so art that reaches its edges has nowhere to go: a drag that moved
// nothing says so, where it looked as if the tool did not work.
export function saysNoRoom(drag, wanted) {
  if (wanted && drag && !drag.x && !drag.y) {
    toast('There is no room to move it that way: the art reaches the edge of the canvas.');
  }
}

// the frame is drawn moved during the drag, and really moves when it is let go
export function moveFrameDrag(app, start) {
  const { state } = app.store;
  const frame = frameAt(state.project, state.at);
  let wanted = false;

  return {
    move([x, y]) {
      const [dx, dy] = clampShift(frame, state.project.canvas, [x - start[0], y - start[1]]);

      wanted ||= x !== start[0] || y !== start[1];
      app.store.set({ frameDrag: { x: dx, y: dy } });
    },

    end() {
      const drag = app.store.state.frameDrag;

      app.store.set({ frameDrag: null });
      saysNoRoom(drag, wanted);

      if (drag) {
        shiftCurrentFrame(app, [drag.x, drag.y]);
      }
    },

    cancel() {
      app.store.set({ frameDrag: null });
    },
  };
}
