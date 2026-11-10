import { icon, node, toast } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { chooseFiles } from '../choose-file.js';
import { openBatchSheet } from '../batch-sheet.js';
import { animationTabs } from './tabs.js';
import { pinControls } from './pin-controls.js';
import { setGridAll, setGridOpen } from './all-views.js';
import { togglePlayback } from './playback.js';
import { isSingleView } from '../../model/kinds.js';
import { wholeNumber } from '../../model/numbers.js';

// a finger has no pointer to hover for what a bare picture means: switched, it says
function switched(app, { key, label, title }, on) {
  app.store.set({ [key]: on });

  if (app.store.state.layout === 'compact') {
    toast(on ? `${label}: ${title}` : `${label} off`);
  }
}

function toggle(app, { key, iconName, label, title }) {
  const pressed = Boolean(app.store.state[key]);

  return node(
    `button.btn.quiet.icon-toggle${pressed ? '.on' : ''}`,
    {
      'aria-pressed': String(pressed),
      'aria-label': label,
      title,
      onclick: () => switched(app, { key, label, title }, !pressed),
    },
    icon(iconName),
  );
}

function viewSwitch(app) {
  const all = app.store.state.gridAll;

  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Rows' },
    [
      [false, 'This view'],
      [true, 'All views'],
    ].map(([value, label]) =>
      node(
        'button',
        { 'aria-pressed': String(all === value), onclick: () => setGridAll(app, value) },
        label,
      ),
    ),
  );
}

function fpsField(app) {
  const animation = currentAnimation(app.store.state);

  // the frame rate is tuned while watching, so playing goes on at the new rate
  const setFps = (event) => {
    const playback = app.playback;

    restructure(app, 'Frame rate', (draft) => {
      currentAnimation(draft).fps = wholeNumber(event.target.value, {
        min: 1,
        max: 30,
        fallback: 8,
      });
    });

    if (playback && !app.playback) {
      togglePlayback(app, playback);
    }
  };

  return node(
    'label.grid-fps',
    { title: 'Frames per second' },
    node('input.input.mono', {
      id: 'fps',
      type: 'number',
      min: '1',
      max: '30',
      value: String(animation.fps),
      onchange: setFps,
    }),
    'fps',
  );
}

// many views and animations make a tall panel: folded, only this bar stays, and the canvas fills
// the room
function foldButton(app) {
  const open = app.store.state.gridOpen;

  return node(
    'button.btn.quiet.icon-toggle.grid-fold',
    {
      'aria-expanded': String(open),
      'aria-label': open ? 'Hide the frames' : 'Show the frames',
      title: open ? 'Hide the frames' : 'Show the frames',
      onclick: () => setGridOpen(app, !open),
    },
    icon(open ? 'chevron-down' : 'chevron-up'),
  );
}

export function gridBar(app, { playing, onPlay }) {
  const { state } = app.store;

  return node(
    'div.grid-bar',
    {},
    animationTabs(app),
    node('span.spacer'),
    // a character always has more to show: its other views, the mirrored side, a view to add
    isSingleView(state.project) ? null : viewSwitch(app),
    node(
      'button.btn.quiet.icon-toggle',
      {
        'aria-label': 'Clean several images into frames',
        title: 'Clean several AI images into frames',
        onclick: () => chooseFiles((files) => openBatchSheet(app, files)),
      },
      icon('upload'),
    ),
    toggle(app, {
      key: 'onion',
      iconName: 'onion',
      label: 'Onion skin',
      title: 'Show the frames before and after, faded',
    }),
    pinControls(app, toggle),
    fpsField(app),
    node(
      'button.btn.primary.grid-play',
      {
        'aria-label': playing ? 'Pause' : 'Play',
        title: playing ? 'Pause' : 'Play on the canvas',
        onclick: onPlay,
      },
      icon(playing ? 'pause' : 'play'),
    ),
    foldButton(app),
  );
}
