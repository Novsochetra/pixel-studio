import { icon, node } from '../dom.js';
import { currentAnimation, goTo, restructure } from '../actions.js';
import { openMenu } from '../menu.js';
import { removeAnimation } from '../../model/structure.js';
import { rename } from './tab-rename.js';
import { duplicateAnimation } from '../../model/animations.js';
import { kindOf } from '../../model/kinds.js';
import { openNewAnimationSheet } from './new-animation-sheet.js';

const openAnimation = (app, id) => goTo(app, { animation: id, layer: null });

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
        restructure(app, `Delete ${animation.name}`, (draft) => ({
          animation: removeAnimation(draft.project, animation.id).id,
          frame: 0,
          layer: null,
        })),
      { danger: true, disabled: project.animations.length < 2, title: `Keep at least one ${item}` },
    ],
  ]);
}

const STEPS = { ArrowLeft: -1, ArrowRight: 1 };

// as tabs do: the arrows open the tab beside, Home and End the first and last; the menu key or
// Shift+F10 opens the tab's menu, as a right-click does
function onTabKey(app, event, animation) {
  const { animations } = app.store.state.project;
  const at = animations.indexOf(animation);
  const to = { Home: 0, End: animations.length - 1 }[event.key] ?? at + (STEPS[event.key] ?? NaN);

  if (animations[to]) {
    event.preventDefault();
    event.stopPropagation();
    openAnimation(app, animations[to].id);
  } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault();
    tabMenu(app, event.currentTarget, event.currentTarget, animation);
  }
}

function tab(app, animation, active) {
  const button = node(
    'button.grid-tab',
    {
      role: 'tab',
      tabindex: active ? '0' : '-1',
      'aria-selected': String(active),
      title: active ? 'Double-click to rename; right-click for more' : animation.name,
      onclick: () => !active && openAnimation(app, animation.id),
      ondblclick: () => rename(app, button, animation),
      oncontextmenu: (event) => {
        event.preventDefault();
        tabMenu(app, button, button, animation);
      },
      onkeydown: (event) => onTabKey(app, event, animation),
    },
    animation.name,
  );

  return button;
}

// the tabs scroll in a strip of their own: the open tab's ⋯ and + to start another stay beside it
export function animationTabs(app) {
  const { state } = app.store;
  const current = currentAnimation(state);
  const item = kindOf(state.project).itemName;
  const tabs = state.project.animations.map((animation) =>
    tab(app, animation, animation === current),
  );
  const open = tabs[state.project.animations.indexOf(current)];

  return node(
    'div.grid-tabs-bar',
    {},
    node(
      'div.grid-tabs',
      { role: 'tablist', 'aria-label': `${item[0].toUpperCase()}${item.slice(1)}s` },
      tabs,
    ),
    node(
      'button.btn.quiet.tab-more',
      {
        'aria-label': `More for ${current.name}`,
        title: `Rename, duplicate or delete ${current.name}`,
        onclick: (event) => tabMenu(app, event.currentTarget, open, current),
      },
      icon('more'),
    ),
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
