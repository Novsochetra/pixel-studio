import { node, replace, toast } from './dom.js';
import { referenceSprite } from './actions.js';
import { changeGuides } from './guide-changes.js';
import { guideRow } from './guide-row.js';
import { actionRow, listGroup, switchRow } from './list-group.js';
import { measureGuide, newGuide } from '../views/guides.js';
import { viewName } from '../model/kinds.js';
import { referenceOf } from '../model/reference.js';

function addGuide(app) {
  const { state } = app.store;
  const ref = referenceSprite(state);
  const guide = newGuide('Guide', 0, 'fixed');

  guide.row = ref ? Math.floor(ref.height / 2) : 0;
  changeGuides(app, 'Add guide', (guides) => guides.push(guide));
}

// every guide that checks the art moves to the row the reference view has it at
function matchReference(app) {
  const { state } = app.store;
  const ref = referenceSprite(state);

  let moved = 0;

  changeGuides(app, 'Match guides', (guides) =>
    guides.forEach((guide) => {
      const row = (ref ? measureGuide(ref, guide) : null) ?? guide.row;

      moved += row === guide.row ? 0 : 1;
      guide.row = row;
    }),
  );
  // pressed with every guide in place it did nothing, and said nothing
  toast(moved ? `${moved} ${moved === 1 ? 'guide' : 'guides'} moved` : 'Every guide is in place');
}

// a row of its own, not a switch in the title: a phone's sheet shows no title to hold it
const showSwitch = (app) =>
  listGroup(
    {},
    switchRow(
      'Show on the canvas',
      { id: 'show-guides', checked: app.store.state.showGuides },
      (on) => app.store.set({ showGuides: on }),
    ),
  );

const ABOUT = 'A guide on the art’s top, its bottom or a colour checks every view.';

export function renderGuidesPanel(el, app) {
  const { state } = app.store;
  const reference = viewName(state.project, referenceOf(state.project)).toLowerCase();

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Guides'),
    showSwitch(app),
    state.project.guides.map((guide) => guideRow(app, guide)),
    listGroup(
      { note: ABOUT },
      actionRow('Add guide', () => addGuide(app)),
      actionRow(`Match the ${reference}`, () => matchReference(app), {
        title: `Move each checked guide to where the ${reference} view has it`,
      }),
    ),
  );
}
