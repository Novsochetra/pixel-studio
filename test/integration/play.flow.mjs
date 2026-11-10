// Watching an animation: a frame hidden from play, every view playing side by side, and the
// frames folded away to give the canvas the room.
import { openStudio } from './harness.mjs';
import { frameAction, frameLabels, openExample, selectFrame, showAllViews } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const canvas = page.locator('.canvas-holder canvas');
const canvasWidth = async () => (await canvas.boundingBox()).width;

// the frame numbers marked as playing over a few rounds of the animation
const framesPlayed = () =>
  page.evaluate(
    () =>
      new Promise((done) => {
        const seen = new Set();
        const until = performance.now() + 1500;
        const look = () => {
          seen.add(document.querySelector('.grid-number.playing')?.textContent);

          if (performance.now() < until) {
            setTimeout(look, 20);
          } else {
            done([...seen].filter(Boolean).sort());
          }
        };

        look();
      }),
  );

await openExample(page);
await page.getByRole('button', { name: 'This view' }).click();
await page.locator('.cell-add').click();
await page.locator('.cell-add').click();
await page.waitForTimeout(200);
check((await frameLabels(page)).length === 3, 'three frames to play');

await selectFrame(page, 1);
await frameAction(page, 'Hide from play');
check(
  (await page.locator('.cell.selected').getAttribute('aria-label')).includes('hidden from play'),
  'a frame can be hidden from play',
);
check((await frameLabels(page)).length === 3, 'and stays in the grid');

await selectFrame(page, 0);
await page.getByRole('button', { name: 'Play' }).click();
const played = await framesPlayed();
check(JSON.stringify(played) === '["1","3"]', `play skips the hidden frame (played ${played})`);
await page.getByRole('button', { name: 'Pause' }).click();

await page.getByRole('button', { name: 'Unhide frame 2' }).click();
await page.waitForTimeout(200);
check(
  !(await page.locator('.cell.hidden-frame').count()),
  'the mark on a hidden frame shows it again',
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check((await page.locator('.cell.hidden-frame').count()) === 1, 'and undo hides it again');
check(
  (await page.locator('.cell.selected').getAttribute('aria-label')).includes('frame 1'),
  'and goes back to the frame it was shown from',
);
await selectFrame(page, 1);

await showAllViews(page);
const single = await canvasWidth();
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(400);
check(
  !(await page.locator('.empty-frame').isVisible()),
  'the empty frame card steps aside for play',
);
const wide = await canvasWidth();
check(
  wide > single * 1.5,
  `with All views, play shows every view side by side (${single} to ${wide})`,
);
await page.screenshot({ path: `${shots}/play-all-views.png` });
const art = await page.evaluate(() => document.querySelector('.cell canvas').toDataURL());
await canvas.click({ position: { x: 20, y: 40 } });
await page.waitForTimeout(250);
check((await page.getByRole('button', { name: 'Play' }).count()) === 1, 'a press stops play');
check(
  (await page.evaluate(() => document.querySelector('.cell canvas').toDataURL())) === art,
  'without drawing on the frame',
);
const after = await canvasWidth();
check(Math.abs(after - single) < 2, `and the canvas shows one frame again (${after})`);
check(await page.locator('.empty-frame').isVisible(), 'and an empty frame says what to do again');

const room = (await page.locator('.edit-scroll').boundingBox()).height;
await page.getByRole('button', { name: 'Hide the frames' }).click();
await page.waitForTimeout(250);
check(!(await page.locator('.grid-scroll').count()), 'the frames fold away, leaving the bar');
check(
  (await page.locator('.edit-scroll').boundingBox()).height > room + 100,
  'and the canvas gets the room',
);
await page.screenshot({ path: `${shots}/frames-folded.png` });
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(400);
check(!(await page.locator('.grid-scroll').count()), 'folded frames stay folded on the next visit');
await page.getByRole('button', { name: 'Show the frames' }).click();
await page.waitForTimeout(250);
check((await page.locator('.grid-scroll').count()) === 1, 'and unfold again');

await finish();
