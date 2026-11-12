import { node, replace, toast } from './dom.js';
import { referenceSprite } from './actions.js';
import { changeGuides } from './guide-changes.js';
import { guideRow } from './guide-row.js';
import { actionRow, listGroup, switchRow } from './list-group.js';
import { measureGuide, newGuide } from '../views/guides.js';
import { viewName } from '../model/kinds.js';
import { referenceOf } from '../model/reference.js';
import { freeName } from '../model/free-name.js';

// the free row nearest the middle, below it first, then above: down to the last row alone,
// two guides stood on it on a canvas whose top half was free
function freeRow(guides, height) {
  const taken = new Set(guides.map((guide) => guide.row));
  const middle = Math.floor(height / 2);

  for (let step = 0; step < height; step++) {
    const row = middle + (step % 2 ? -Math.ceil(step / 2) : step / 2);

    if (row >= 0 && row < height && !taken.has(row)) {
      return row;
    }
  }

  return middle;
}

// A new guide has a name of its own, and a row no other guide is on: two added one after the
// other were both "Guide" on one row, the second hidden under the first.
function addGuide(app) {
  const { state } = app.store;
  const ref = referenceSprite(state);
  const guides = state.project.guides ?? [];
  const name = freeName(
    'Guide',
    guides.map((guide) => guide.name),
  );
  const guide = newGuide(name, freeRow(guides, ref?.height ?? 1), 'fixed');

  changeGuides(app, 'Add guide', (list) => list.push(guide));
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
