import { icon, node } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { openMenu } from '../menu.js';
import { removeAnimation } from '../../model/structure.js';
import { duplicateAnimation } from '../../model/animations.js';
import { kindOf } from '../../model/kinds.js';
import { openNewAnimationSheet } from './new-animation-sheet.js';

const select = (app, id) =>
  app.store.set({ at: { ...app.store.state.at, animation: id, layer: null }, selection: null });

// the tab turns into a text field; Enter or leaving it renames, Escape keeps the name
function rename(app, tabButton, animation) {
  const field = node('input.input.tab-rename', { value: animation.name, 'aria-label': 'Name' });
  const done = (keep) => {
    const name = field.value.trim();

    if (keep && name && name !== animation.name) {
      restructure(app, 'Rename animation', (draft) => {
        currentAnimation(draft).name = name;
      });
    } else {
      app.store.touch('animations');
    }
  };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      field.onblur = null;
      done(event.key === 'Enter');
    }
  });
  field.onblur = () => done(true);
  tabButton.replaceWith(field);
  field.select();
}

function tabMenu(app, anchor, tabButton, animation) {
  const { project } = app.store.state;
  const item = kindOf(project).itemName;

  openMenu(anchor, [
    ['Rename', () => rename(app, tabButton, animation)],
    [
      'Duplicate',
      () =>
        restructure(app, `Duplicate ${animation.name}`, (draft) => ({
          animation: duplicateAnimation(draft.project, currentAnimation(draft)).id,
        })),
    ],
    null,
    [
      `Delete ${animation.name}`,
      () =>
        restructure(app, `Delete ${animation.name}`, (draft) => {
          const at = draft.project.animations.indexOf(animation);
          removeAnimation(draft.project, animation.id);
          // the tab beside the deleted one opens, as closing a tab does
          const next = draft.project.animations[Math.max(0, at - 1)];

          return { animation: next.id, frame: 0, layer: null };
        }),
      { danger: true, disabled: project.animations.length < 2, title: `Keep at least one ${item}` },
    ],
  ]);
}

function tab(app, animation, active) {
  const button = node(
    'button.grid-tab',
    {
      role: 'tab',
      'aria-selected': String(active),
      title: active ? 'Double-click to rename' : animation.name,
      onclick: () => !active && select(app, animation.id),
      ondblclick: () => rename(app, button, animation),
    },
    animation.name,
  );
  const more = node(
    'button.btn.quiet.tab-more',
    {
      'aria-label': `More for ${animation.name}`,
      title: 'Rename, duplicate or delete',
      onclick: (event) => tabMenu(app, event.currentTarget, button, animation),
    },
    icon('more'),
  );

  return active ? node('span.grid-tab-group', {}, button, more) : button;
}

// the animations (or tiles, or icons) of the project, one tab each, and + to start another
export function animationTabs(app) {
  const { state } = app.store;
  const current = currentAnimation(state);
  const item = kindOf(state.project).itemName;

  return node(
    'div.grid-tabs',
    { role: 'tablist', 'aria-label': `${item[0].toUpperCase()}${item.slice(1)}s` },
    state.project.animations.map((animation) => tab(app, animation, animation === current)),
    node(
      'button.btn.quiet.grid-tab-add',
      {
        'aria-label': `New ${item}`,
        title: `New ${item}`,
        onclick: () => openNewAnimationSheet(app),
      },
      icon('plus'),
    ),
  );
}
