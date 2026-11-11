import { icon, node, toast } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { chooseFiles } from '../choose-file.js';
import { openBatchSheet } from '../batch-sheet.js';
import { animationTabs } from './tabs.js';
import { pinControls } from './pin-controls.js';
import { setGridOpen } from './all-views.js';
import { viewsMenu } from './views-menu.js';
import { togglePlayback } from './playback.js';
import { wholeNumber } from '../../model/numbers.js';

// a finger has no pointer to hover for what a bare picture means: switched, it says
function switched(app, { key, label, said }, on) {
  app.store.set({ [key]: on });

  if (app.store.state.layout === 'compact') {
    toast(on ? `${label}: ${said}` : `${label} off`);
  }
}

// said: what the switch says when a finger turns it on, where its title names a key
function toggle(app, { key, iconName, label, title, said = title }) {
  const pressed = Boolean(app.store.state[key]);

  return node(
    `button.btn.quiet.icon-toggle${pressed ? '.on' : ''}`,
    {
      'aria-pressed': String(pressed),
      'aria-label': label,
      title,
      onclick: () => switched(app, { key, label, said }, !pressed),
    },
    icon(iconName),
  );
}

function fpsField(app) {
  const animation = currentAnimation(app.store.state);

  // the frame rate is tuned while watching, so playing goes on at the new rate
  const setFps = (event) => {
    const playback = app.playback;

    restructure(app, 'Frame rate', (draft) => {
      // what cannot be read keeps the rate there was, not a rate nobody asked for
      currentAnimation(draft).fps = wholeNumber(event.target.value, {
        min: 1,
        max: 30,
        fallback: animation.fps,
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
  return node(
    'div.grid-bar',
    {},
    animationTabs(app),
    node('span.spacer'),
    viewsMenu(app),
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
