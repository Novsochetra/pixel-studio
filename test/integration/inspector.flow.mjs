// The inspector's sections are grouped rows, as a phone's Settings are: few words, one kind of
// picture, and a fold that plays out. The frames' bar names the views it shows.
import { openStudio } from './harness.mjs';
import { createProject, openExample, openPanel, projectsPage, showViews } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const section = (name) => page.locator(`.section[data-name="${name}"]`);
const heightOf = async (name) => (await section(name).boundingBox()).height;

await openPanel(page, 'Outline');
await openPanel(page, 'Guide');
check(
  (await section('outline').locator('.list-row').count()) === 5 &&
    (await section('outline').locator('.btn').count()) === 0,
  'Outline is rows in groups: its colour, where it acts, and what it does, with no loose buttons',
);
check(
  /^\d+$/.test(await section('outline').locator('.list-action .list-value').first().textContent()),
  'each thing it does says at its end how many pixels it would change',
);
check(
  (await section('guides').locator('.guide-row .list-row').count()) >= 8 &&
    (await page.locator('#show-guides').isVisible()),
  'a guide is a group of rows, under the switch that shows them all',
);
check(
  !/[▸▾×]/.test(await page.locator('#inspector').textContent()),
  'no arrow or cross is a letter of the font: they are drawn as the other pictures are',
);
check(
  await page.locator('#inspector').evaluate((bar) => bar.scrollWidth <= bar.clientWidth),
  'every row fits the inspector: a guide’s rows ran past its edge, their × out of sight',
);
check(
  (await section('guides').locator('h2').getAttribute('aria-expanded')) === 'true',
  'a section’s title says it folds, and that it is open',
);
await page.locator('#inspector').screenshot({ path: `${shots}/inspector.png` });

// Chrome said the change again as the field went at a Tab: a guide moved was two steps to undo
const row = section('guides').locator('.guide-at').first();
const was = await row.inputValue();

await row.click();
await row.fill('40');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(
  (await section('guides').locator('.guide-at').first().inputValue()) === was,
  'a guide’s row typed and left with Tab is one step to undo',
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(
  !(await page.locator('.toast').textContent()).includes('Change'),
  'with no second step behind it',
);

// shut at once, a section's rows vanished and the ones under it jumped up
const open = await heightOf('outline');

await section('outline').locator('h2').click();
await page.waitForTimeout(70);
const between = await heightOf('outline');

await page.waitForTimeout(500);
const shut = await heightOf('outline');

check(
  between < open && between > shut && shut < 60,
  `a section folds with its height led shut (${Math.round(open)}, ${Math.round(between)}, ${Math.round(shut)})`,
);
check(
  (await section('outline').getAttribute('class')) === 'section' &&
    (await section('outline').getAttribute('style')) === '',
  'and is left as it was when the fold is done',
);

// The fold's height was led as the height inside its padding: a section grew by it as it began
// to shut and snapped by it at the end. Pressed again as it played, it snapped; and with the
// panel scrolled, the title pressed jumped from under the pointer.
const foldFrames = async (press) => {
  await page.evaluate(() => {
    window.foldFrames = [];

    const tick = () => {
      const title = document.querySelector('.section[data-name="outline"] > h2');

      window.foldFrames.push({
        height: title.parentElement.offsetHeight,
        top: title.getBoundingClientRect().top,
      });

      if (window.foldFrames.length < 40) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  });
  await press();
  await page.waitForTimeout(800);

  return page.evaluate(() => window.foldFrames);
};
const pressTitle = async () => {
  const title = await section('outline').locator('h2').boundingBox();

  await page.mouse.click(title.x + 30, title.y + title.height / 2);
};
const steps = (frames) =>
  frames.slice(1).map((frame, i) => Math.abs(frame.height - frames[i].height));
const opened = await foldFrames(pressTitle);
const closed = await foldFrames(pressTitle);
const reversed = await foldFrames(async () => {
  await pressTitle();
  await page.waitForTimeout(60);
  await pressTitle();
});

check(
  Math.max(...opened.map(({ height }) => height)) <= opened.at(-1).height + 1 &&
    Math.max(...closed.map(({ height }) => height)) <= closed[0].height + 1,
  'a fold neither overshoots nor snaps at its ends',
);
// a fold's own steps are up to some 70px a frame; turned back by a snap, one was 186px
check(
  Math.max(...steps(reversed)) < 100,
  `pressed again as it plays, it turns back from where it stood (largest step ${Math.max(...steps(reversed))}px)`,
);
await section('outline').locator('h2').click();
await page.waitForTimeout(500);
await page.locator('#inspector').evaluate((panel) => (panel.scrollTop = 120));
await page.waitForTimeout(100);
const scrolledFold = await foldFrames(pressTitle);

check(
  Math.abs(scrolledFold.at(-1).top - scrolledFold[0].top) <= 1,
  'with the panel scrolled, the title pressed stays under the pointer',
);

// "This view" and "All views" named no view, and stood there with one view to show
const pick = page.locator('.views-pick');
const rows = () => page.locator('.grid-row[data-direction]').count();

check((await pick.textContent()) === 'All views', 'the frames’ bar names the views it shows');
const every = await rows();

await showViews(page, 'Side only');
check(
  (await pick.textContent()) === 'Side only' && (await rows()) === 1 && every > 1,
  'one view picked from its menu is the only row',
);
check(
  (await page.locator('#statusbar').textContent()).startsWith('Side'),
  'and is the view being edited',
);
check(
  await page.getByRole('button', { name: 'Add a view' }).isVisible(),
  'with one view in sight a view can still be added',
);
await page.locator('.cell-add').click();
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(300);
await showViews(page, 'Side only');
check(
  (await page.getByRole('button', { name: 'Pause' }).count()) === 1,
  'picking the view already in sight leaves what is playing alone',
);
await page.getByRole('button', { name: 'Pause' }).click();
await showViews(page, 'All views');
check((await rows()) === every, 'All views brings the rows back');

await page.locator('.wordmark').click();
await page.waitForTimeout(400);
await projectsPage(page, 'New project');
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
check((await pick.count()) === 0, 'art with one view has no views to choose between');
await finish();
