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
await page.locator('#inspector').screenshot({ path: `${shots}/inspector.png` });

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
await showViews(page, 'All views');
check((await rows()) === every, 'All views brings the rows back');

await page.locator('.wordmark').click();
await page.waitForTimeout(400);
await projectsPage(page, 'New project');
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
check((await pick.count()) === 0, 'art with one view has no views to choose between');
await finish();
