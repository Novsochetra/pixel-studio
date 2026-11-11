import { node, replace } from './dom.js';
import { canTurnLayers, layersAngle, turnLayersTo } from './layer-turn.js';
import { angleField } from './selection-bar.js';

export function renderLayerTurnBar(el, app) {
  const { state } = app.store;

  el.hidden = !canTurnLayers(state);

  if (el.hidden) {
    replace(el);

    return;
  }

  const typing = el.contains(document.activeElement);

  replace(
    el,
    node('span', {}, 'Turn'),
    angleField({
      id: 'layer-angle',
      name: 'Layer angle',
      title: 'How far the picked layers are turned, in degrees: or drag the handle above them',
      angle: layersAngle(state),
      turnTo: (angle) => turnLayersTo(app, angle),
    }),
  );

  // typing an angle keeps the keyboard when the bar is drawn again
  if (typing) {
    el.querySelector('input').focus();
  }
}
