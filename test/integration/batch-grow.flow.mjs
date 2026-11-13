// Several pictures cleaned onto a canvas too small for them were made smaller with only
// "scaled 0.48×" to say so: the window offers the canvas they keep their own pixels on, as one
// picture's does, and cleans them again on it.
import { openStudio } from './harness.mjs';
import { chooseFiles, createProject, imageFile } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const [, images] = process.argv.slice(2);
const cleaned = () =>
  page.waitForFunction(
    () =>
      document.querySelectorAll('.batch-row').length > 0 &&
      ![...document.querySelectorAll('.batch-row .hint')].some((hint) =>
        /Cleaning|Waiting/.test(hint.textContent),
      ) &&
      !document.querySelector('.sheet .btn.primary').disabled,
    null,
    { timeout: 60000 },
  );

await createProject(page, { kind: 'Character', name: 'Runner', width: 64 });
await chooseFiles(
  page,
  () => page.getByRole('button', { name: 'Clean several images into frames' }).click(),
  [
    { ...imageFile(`${images}/front.png`, 'front.png'), mimeType: 'image/png' },
    imageFile(`${images}/side.webp`, 'side.webp'),
  ],
);
await cleaned();
const grow = page.locator('#batch-grow');

check(
  (await grow.count()) === 1 && /^Make the canvas \d+×\d+$/.test(await grow.textContent()),
  `pictures made smaller to fit say so, and offer a canvas (${await grow.textContent().catch(() => 'none')})`,
);
await page.screenshot({ path: `${shots}/batch-grow-offer.png` });

await grow.click();
await page.waitForTimeout(400);
await cleaned();
check(
  !(await page.locator('#statusbar').textContent()).includes('64×64 canvas') &&
    (await page.locator('#batch-grow').count()) === 0,
  'on the larger canvas they are cleaned again, keeping their pixels',
);
await page.getByRole('button', { name: 'Use them all' }).click();
await page.waitForTimeout(400);
check((await page.locator('.sheet').count()) === 0, 'and are placed');

await finish();
