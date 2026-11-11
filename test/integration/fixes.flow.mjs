// Bugs found by using every part of the studio by hand, each kept fixed: what went wrong is said
// above its check.
import { openStudio } from './harness.mjs';
import {
  createProject,
  download,
  frameAction,
  openPanel,
  projectsPage,
  selectFrame,
  status,
  waitSaved,
} from './studio.mjs';

const { page, check, finish } = await openStudio();
const canvas = page.getByLabel('Pixel canvas');
const artWidth = async () =>
  Number((await page.locator('#statusbar span').nth(1).textContent()).match(/\d+/)[0]);
const at = async (x, y) => {
  const art = await canvas.boundingBox();
  const zoom = art.width / (await artWidth());

  return [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
};
const drag = async (from, to) => {
  await page.mouse.move(...(await at(...from)));
  await page.mouse.down();
  await page.mouse.move(...(await at(...to)), { steps: 5 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
};
// how many art pixels have this colour, read from the middle of each
const count = async (hex) => {
  const size = await artWidth();

  return canvas.evaluate(
    (element, { colour, across }) => {
      const scale = element.width / across;
      const pen = element.getContext('2d');
      const wanted = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16));
      let found = 0;

      for (let y = 0; y < element.height / scale; y++) {
        for (let x = 0; x < across; x++) {
          const { data } = pen.getImageData(
            Math.floor((x + 0.5) * scale),
            Math.floor((y + 0.5) * scale),
            1,
            1,
          );

          found += wanted.every((value, i) => data[i] === value) ? 1 : 0;
        }
      }

      return found;
    },
    { colour: hex, across: size },
  );
};
const tool = (name) => page.locator('#rail').getByRole('button', { name }).click();
const RED = '#df2321';

// an empty size on the start screen made an 8×8 canvas (a 0 is refused: start.flow.mjs)
await page.getByRole('radio', { name: /^Icon/ }).click();
await page.fill('#project-width', '');
await page.fill('#project-height', '');
await page.getByRole('button', { name: 'Create', exact: true }).click();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(300);
check(
  (await status(page)).includes('32×32 canvas'),
  'an empty size starts at the size of its kind',
);

// Palette lock on a blank canvas left the pencil with no colour, and Fill then never ended
await openPanel(page, 'Drawing');
await page.locator('#palette-lock').check();
await page.locator('#palette-lock').uncheck();
await tool('Fill');
await page.mouse.click(...(await at(3, 3)));
await page.mouse.move(2, 2);
check((await count(RED)) === 32 * 32, 'Fill fills after Palette lock was on over a blank canvas');
await page.keyboard.press('Meta+z');

// the brush slider kept the keys: E, ] and undo did nothing after it was used
await tool('Pencil');
await drag([2, 2], [5, 2]);
await page.locator('#brush-size').focus();
await page.keyboard.press('e');
check(
  (await page.locator('#rail [aria-pressed="true"]').first().getAttribute('aria-label')) ===
    'Eraser',
  'a tool key works with the brush slider in focus',
);
await page.keyboard.press('b');

// a paste landed on its own original and dragging it took the original along
await tool(/^Select and move/);
await drag([1, 1], [6, 3]);
await page.keyboard.press('Meta+c');
await page.keyboard.press('Escape');
await page.keyboard.press('Meta+v');
await drag([3, 2], [3, 12]);
check((await count(RED)) === 8, 'a pasted piece dragged away leaves the original: two lines');

// undo put the pixels back and left the selection where they had been
await page.keyboard.press('Meta+z');
await page.keyboard.press('Delete');
check(
  (await count(RED)) === 4 && (await page.locator('.selection-bar').isVisible()),
  'undo brings the selection back with the pixels, so Delete still means them',
);
await page.keyboard.press('Meta+z');
await page.keyboard.press('Meta+z');
await page.keyboard.press('Escape');

// with an animation playing, a press drew on the frame selected, not the one showing
await page.locator('.cell-add').click();
await page.locator('.cell-add').click();
await selectFrame(page, 0);
await tool('Pencil');
const before = await count(RED);
await page.locator('.grid-play').click();
await page.waitForTimeout(250);
await page.mouse.click(...(await at(20, 20)));
await page.mouse.move(2, 2);
check(
  (await page.locator('.grid-play').getAttribute('aria-label')) === 'Play' &&
    (await count(RED)) === before,
  'a press on the canvas while the animation plays stops it and draws nothing',
);

// a layer named in one frame, the name kept by a click on another frame, named that frame's layer
await selectFrame(page, 0);
await frameAction(page, 'Duplicate frame');
await selectFrame(page, 0);
await openPanel(page, 'Layers');
await page.locator('.layer-row .layer-name').first().dblclick();
await page.locator('.layer-rename').fill('Skin');
await page.locator('.grid-row.current .cell').nth(1).click();
await page.waitForTimeout(250);
const second = await page.locator('.layer-row .layer-name').allTextContents();
await selectFrame(page, 0);
check(
  JSON.stringify(second) === '["Art"]' &&
    JSON.stringify(await page.locator('.layer-row .layer-name').allTextContents()) === '["Skin"]',
  'a layer name ended by a click on another frame goes to the layer it was typed for',
);
check(
  (await page.locator('.grid-row.current .cell.selected').getAttribute('aria-label')).includes(
    'frame 1',
  ),
  'and that click still did its own work first',
);

// a frame dropped on itself left an undo step that undid nothing
await page.locator('.grid-row.current .cell.selected').focus();
await page.keyboard.press('Alt+ArrowLeft');
await page.keyboard.press('Meta+z');
check(
  (await page.locator('.toast').textContent()).includes('Rename layer'),
  'a move that moved nothing is no undo step',
);
await page.keyboard.press('Meta+Shift+z');

// a project name with no Latin letters made a file called ".json"
await page.locator('button.wordmark').click();
await projectsPage(page, 'This project');
await page.fill('#current-project-name', 'សុជាតិ');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await download(page, async () => {
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Save project file/ }).click();
});
// read from what the studio says it saved: this browser renames a download it has no letters for
check(
  (await page.locator('.toast').textContent()) === 'Saved សុជាតិ.json',
  'a name in any script names its files',
);

// a frame size typed and Download clicked at once downloaded at the size before; 100000 broke
// the window for good
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
await page.fill('#frame-width', '100000');
const sheet = await download(page, () =>
  page.getByRole('button', { name: /^Download .*png$/ }).click(),
);
check(
  Boolean(sheet) && (await page.inputValue('#frame-width')) === '1024',
  'a frame width typed just before Download is used at once, and kept to a size that can be',
);

// a width typed, then the height's field pressed and typed in: the height typed went nowhere,
// as the window was drawn again under the press
await page.fill('#frame-width', '64');
await page.locator('#frame-height').click();
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.type('100');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
check(
  (await page.inputValue('#frame-width')) === '64' &&
    (await page.inputValue('#frame-height')) === '100',
  'a second size field takes what is typed in it right after the first',
);
await page.keyboard.press('Escape');

// an edit made just before a reload was lost
await tool('Pencil');
await drag([10, 28], [14, 28]);
const drawn = await count(RED);
page.once('dialog', (dialog) => dialog.accept());
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(500);
check((await count(RED)) === drawn, 'an edit made a moment before a reload is still there');
check(/^Saved/.test(await waitSaved(page)), 'and the project is saved');

// an animation opened from a view it does not have went to no view at all, and the editor died
await createCharacterWithTwoAnimations();
check(
  (await page.locator('.grid-row.current').count()) === 1 &&
    (await page.locator('.layer-row').count()) >= 1,
  'an animation without the view being edited opens on a view it has',
);

// a tab's menu duplicated the animation that was open, not its own
await page.locator('.grid-tab', { hasText: 'Idle' }).click({ button: 'right' });
await page.getByRole('menuitem', { name: 'Duplicate' }).click();
await page.waitForTimeout(250);
check(
  (await page.locator('.grid-tab').allTextContents()).join() === 'Idle,Idle copy,Run',
  'a tab’s menu acts on its own animation, open or not',
);
await finish();

async function createCharacterWithTwoAnimations() {
  await page.locator('button.wordmark').click();
  await page.locator('.start-section').evaluate((details) => {
    details.open = true;
  });
  await createProject(page, { kind: 'Character', name: 'Hero', width: 32 });
  await page.getByRole('button', { name: 'New animation' }).click();
  await page.fill('#new-animation-name', 'Run');
  await page.getByRole('button', { name: 'Create animation' }).click();
  await page.waitForTimeout(250);
  // Run loses its Back view, and Idle is left open on Back
  await page.locator('.grid-row', { hasText: 'Back' }).locator('.grid-view-more').click();
  await page.getByRole('menuitem', { name: /^Remove Back/ }).click();
  await page.locator('.grid-tab', { hasText: 'Idle' }).click();
  await page.locator('.grid-view', { hasText: /^Back$/ }).click();
  await page.locator('.grid-tab', { hasText: 'Run' }).click();
}
