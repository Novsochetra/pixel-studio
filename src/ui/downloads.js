import { h, toast } from './dom.js';
import { directionSprite, directionsInUse } from './actions.js';
import { canvasToBlob, checkerPainter, spritePng } from '../io/images.js';
import { zipFiles } from '../io/zip.js';
import { directionLabel } from '../model/project.js';
import { saveFile } from './save-file.js';
import { boardCanvas } from './board-canvas.js';
import { projectFileText, readProjectBundle } from '../store/project-file.js';
import { backgroundUrl } from './preview-background.js';
import { chooseFile } from './views-panel.js';
import { openExportSheet } from './export-sheet.js';
import { openChatgptSheet } from './chatgpt-sheet.js';

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function names(state, direction) {
  return `${slug(state.project.name)}-${slug(directionLabel(direction))}`;
}

async function saveView(app, scale, checker = false) {
  const { state } = app.store;
  const sprite = directionSprite(state, state.at.direction);
  const size = sprite.width * scale;
  const blob = await spritePng(sprite, scale, checker ? checkerPainter(scale * 2) : null);
  await saveFile(`${names(state, state.at.direction)}-${size}${checker ? '-checker' : ''}.png`, blob);
}

async function saveAllViews(app) {
  const { state } = app.store;
  const scale = state.project.canvas.scale;
  const files = [];

  for (const direction of directionsInUse(state)) {
    const sprite = directionSprite(state, direction);

    for (const factor of scale > 1 ? [1, scale] : [1]) {
      const suffix = sprite.width * factor;
      const blob = await spritePng(sprite, factor);
      files.push({ name: `${names(state, direction)}-${suffix}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
  }

  await saveFile(`${slug(state.project.name)}-views.zip`, zipFiles(files));
}

async function saveBoard(app) {
  const { state } = app.store;
  const blob = await canvasToBlob(boardCanvas(state, state.project.canvas.scale, { overlay: null, mapping: null }));
  await saveFile(`${slug(state.project.name)}-views-board.png`, blob);
}

export async function saveProject(app) {
  const { project } = app.store.state;
  const text = projectFileText(project, await backgroundUrl(app));
  await saveFile(`${slug(project.name)}.json`, new Blob([text], { type: 'application/json' }));
}

export function openProjectFile(app, onOpened = () => {}) {
  chooseFile(async (file) => {
    try {
      const { project, background } = await readProjectBundle(await file.text());
      await app.addProject(project, background);
      onOpened();
      toast(`Opened ${project.name} as a project of its own. Switch projects from its name, top left.`);
    } catch (error) {
      toast(error.message);
    }
  }, '.json,application/json');
}

function menuItems(app) {
  const { state } = app.store;
  const scale = state.project.canvas.scale;
  const { width, height } = state.project.canvas;
  const label = directionLabel(state.at.direction);
  const big = `${width * scale}×${height * scale}`;

  return [
    ['Sprite sheet for the game…', async () => openExportSheet(app)],
    ['Reference and prompt for ChatGPT…', async () => openChatgptSheet(app)],
    null,
    [`${label} · ${width}×${height} for editing`, () => saveView(app, 1)],
    ...(scale > 1 ? [[`${label} · ${big}, transparent`, () => saveView(app, scale)]] : []),
    [`${label} · ${big} on the checkerboard`, () => saveView(app, scale, true)],
    null,
    ['All views · zip with both sizes', () => saveAllViews(app)],
    ['Views board · PNG with guide lines and marks', () => saveBoard(app)],
    null,
    ['Save project file (.json)', () => saveProject(app)],
    ['Open a project file…', () => openProjectFile(app)],
  ];
}

// called straight from the click, so a file picker it opens still counts as the viewer's doing
function run(action) {
  const fail = (error) => toast(`Could not make the file: ${error.message}`);

  try {
    Promise.resolve(action()).catch(fail);
  } catch (error) {
    fail(error);
  }
}

export function openDownloadMenu(app, anchor) {
  document.querySelector('.menu')?.remove();
  const box = anchor.getBoundingClientRect();
  const menu = h('div.menu', { role: 'menu', style: { top: `${box.bottom + 6}px`, right: `${Math.max(16, window.innerWidth - box.right)}px`, position: 'fixed' } });
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
  };
  const outside = (event) => {
    if (!menu.contains(event.target) && event.target !== anchor) {
      close();
    }
  };

  for (const item of menuItems(app)) {
    menu.append(
      item
        ? h('button', { role: 'menuitem', onclick: () => { close(); run(item[1]); } }, item[0])
        : h('hr'),
    );
  }

  document.body.append(menu);

  // the whole menu stays on screen, wherever the button has wrapped to
  if (menu.getBoundingClientRect().left < 16) {
    menu.style.left = '16px';
    menu.style.right = 'auto';
  }

  menu.style.maxWidth = 'calc(100vw - 32px)';
  menu.style.maxHeight = `${Math.max(160, window.innerHeight - box.bottom - 22)}px`;
  menu.style.overflowY = 'auto';
  document.addEventListener('pointerdown', outside, true);
  menu.querySelector('button')?.focus();
}
