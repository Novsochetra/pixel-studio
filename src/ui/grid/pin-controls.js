import { node } from '../dom.js';
import { restructure } from '../actions.js';
import { PIN_NAMES, pinsOf, removePin } from '../../model/pins.js';
import { frameAt } from '../../model/project.js';
import { kindOf } from '../../model/kinds.js';

function pinNames(app) {
  const { state } = app.store;

  return node(
    'select.input',
    {
      id: 'pin-name',
      'aria-label': 'Pin to place',
      onchange: (event) => app.store.set({ pinName: event.target.value }),
    },
    PIN_NAMES.map((name) =>
      node('option', { value: name, selected: state.pinName === name }, name),
    ),
  );
}

// Alt-click takes a pin away where there is a keyboard; this takes the named one away anywhere
function removeButton(app) {
  const { state } = app.store;
  const name = state.pinName;
  const placed = pinsOf(frameAt(state.project, state.at)).some((mark) => mark.name === name);

  return node(
    'button.btn.quiet',
    {
      disabled: !placed,
      title: placed ? `Take the ${name} pin off this frame` : `This frame has no ${name} pin`,
      onclick: () =>
        restructure(app, `Remove pin ${name}`, (draft) =>
          removePin(frameAt(draft.project, draft.at), name),
        ),
    },
    'Remove pin',
  );
}

// pins are for what stands on its feet; `toggle` is the frames bar's own icon switch
export function pinControls(app, toggle) {
  const { state } = app.store;

  if (kindOf(state.project).place !== 'feet') {
    return null;
  }

  return [
    toggle(app, {
      key: 'showPins',
      iconName: 'pin',
      label: 'Pins',
      title: 'Pins mark the head, hands, hips and feet in each frame (tool P)',
      said: 'they mark the head, hands, hips and feet in each frame. Place them with the Pin tool',
    }),
    state.tool === 'pin' ? [pinNames(app), removeButton(app)] : null,
  ];
}
