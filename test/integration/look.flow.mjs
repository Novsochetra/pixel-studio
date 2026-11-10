// The look and the motion the studio shares with the arcade: pill buttons that give under the
// press, a thumb that slides, windows and menus that play their way in and out, and none of that
// motion for someone who asked for less.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const style = (selector, property, pseudo = null) =>
  page.evaluate(
    ([of, name, part]) => getComputedStyle(document.querySelector(of), part)[name],
    [selector, property, pseudo],
  );

check((await style('body', 'fontFamily')).startsWith('Inter'), 'the page is set in Inter');
const undo = await page.getByRole('button', { name: 'Undo' }).boundingBox();
check(
  undo.width === undo.height && parseFloat(await style('#toolbar .btn', 'borderRadius')) > 100,
  'a button that is only its picture is a circle of glass',
);
check(
  (await style('.toolbar-download', 'backgroundColor')) === (await style('body', 'color')),
  'the main button is the page’s ink, as the arcade’s Play',
);

const download = page.getByRole('button', { name: 'Download' });
const spot = await download.boundingBox();
await page.mouse.move(spot.x + spot.width / 2, spot.y + spot.height / 2);
await page.mouse.down();
await page.waitForTimeout(300);
check((await style('.toolbar-download', 'scale')) === '0.96', 'a button gives under the press');
await page.mouse.up();
await page.waitForTimeout(100);
check((await style('.menu', 'backdropFilter')) !== 'none', 'its menu is frosted glass');
await page.screenshot({ path: `${shots}/look-menu.png` });
await page.keyboard.press('Escape');
check(
  (await page.locator('.menu').count()) === 0 && (await page.locator('.menu-out').count()) === 1,
  'a menu closed is gone for the page while it fades',
);
await page.waitForTimeout(700);
check((await page.locator('.menu-out').count()) === 0, 'and is taken away once it has');

// the thumb's place, and the picked option's, across the control
const thumb = () =>
  page.evaluate(() => {
    const control = document.querySelector('.segmented[aria-label="Workspace"]');
    const picked = control.querySelector('[aria-pressed="true"]');

    return {
      at: parseFloat(getComputedStyle(control, '::before').translate),
      option: picked.offsetLeft,
      plain: getComputedStyle(picked).backgroundColor === 'rgba(0, 0, 0, 0)',
    };
  });
const before = await thumb();
check(
  before.plain && before.at === before.option,
  'a segmented control’s thumb lies under its pick',
);
await page.getByRole('button', { name: 'Views board', exact: true }).click();
const sliding = await page.evaluate(
  () =>
    new Promise((resolve) => {
      requestAnimationFrame(() =>
        resolve(
          document
            .getAnimations()
            .some(
              (animation) =>
                animation.transitionProperty === 'translate' &&
                animation.effect.target.matches('.segmented'),
            ),
        ),
      );
    }),
);
check(sliding, 'picking another option slides the thumb to it');
await page.waitForTimeout(500);
const after = await thumb();
check(after.at === after.option && after.at > before.at, 'and it comes to rest under the new pick');
await page.getByRole('button', { name: 'Edit', exact: true }).click();

await page.getByRole('button', { name: 'History' }).click();
await page.waitForTimeout(600);
check(
  (await style('.sheet', 'borderRadius')) === '28px',
  'a window has the arcade’s round corners',
);
await page.screenshot({ path: `${shots}/look-sheet.png` });
await page.keyboard.press('Escape');
check(
  (await page.locator('.sheet, .sheet-backdrop').count()) === 0 &&
    (await page.locator('.sheet-out').count()) === 1,
  'a window closed is gone for the page while it eases away',
);
await page.keyboard.press('e');
check(
  (await page.getByRole('button', { name: 'Eraser' }).getAttribute('aria-pressed')) === 'true',
  'so the keys work at once behind it',
);
await page.waitForTimeout(700);
check((await page.locator('.sheet-out').count()) === 0, 'and it is taken away once it has');

await page.emulateMedia({ reducedMotion: 'reduce' });
await page.getByRole('button', { name: 'History' }).click();
check(
  (await style('.sheet', 'animationName')) === 'none',
  'asked for less motion, a window is simply there',
);
await page.keyboard.press('Escape');
check(
  (await page.locator('.sheet, .sheet-out').count()) === 0,
  'and simply gone when it is closed',
);
await finish();
