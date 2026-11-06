import { node, replace } from './dom.js';
import { changeStructure, referenceSprite } from './actions.js';
import { guideRow } from './guide-row.js';
import { measureGuide, newGuide } from '../views/guides.js';
import { viewName } from '../model/kinds.js';
import { referenceOf } from '../model/reference.js';

function addGuide(app) {
  const { state } = app.store;
  const ref = referenceSprite(state);
  const guide = newGuide('Guide', 0, 'fixed');

  guide.row = ref ? Math.floor(ref.height / 2) : 0;
  state.project.guides.push(guide);
  changeStructure(app, 'guides');
}

// every guide that checks the art moves to the row the reference view has it at
function matchReference(app) {
  const { state } = app.store;
  const ref = referenceSprite(state);

  state.project.guides.forEach((guide) => {
    const row = ref ? measureGuide(ref, guide) : null;

    guide.row = row ?? guide.row;
  });
  changeStructure(app, 'guides');
}

function heading(app) {
  const show = node('input', {
    type: 'checkbox',
    id: 'show-guides',
    checked: app.store.state.showGuides,
    onchange: (event) => app.store.set({ showGuides: event.target.checked }),
  });

  return node(
    'h2',
    { tabindex: '0' },
    'Guide lines',
    node('label.group', { for: 'show-guides' }, show, 'Show'),
  );
}

const ABOUT =
  'A guide that marks the top or bottom of the art, or the top of a colour, checks every view and says how many rows off it is.';

export function renderGuidesPanel(el, app) {
  const { state } = app.store;
  const reference = viewName(state.project, referenceOf(state.project)).toLowerCase();

  replace(
    el,
    heading(app),
    state.project.guides.map((guide) => guideRow(app, guide)),
    node(
      'div.group',
      { style: { gap: '6px' } },
      node('button.btn', { onclick: () => addGuide(app) }, 'Add guide'),
      node(
        'button.btn',
        {
          onclick: () => matchReference(app),
          title: `Move each checked guide to where the ${reference} view has it`,
        },
        `Match the ${reference}`,
      ),
    ),
    node('p.hint', {}, ABOUT),
  );
}
