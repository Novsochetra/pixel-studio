// Every button in every workspace, panel and dialog clicked in turn, for each kind of project: the
// page must never throw. Shared by the desktop and phone runs.
import { createProject, openExample } from './studio.mjs';

const SKIP = /Delete|Clear marks|Go back|Wear it|Apply to|Use them all|Use for|Forget|Remove/;
// the workspace buttons are left alone, so each workspace's own panels are clicked through
const TOOLBAR_SKIP = /Download|History|^\?$|PIXEL|^Edit$|Views board|On the pitch|^Preview$/;
const DIALOGS = [
  ['Swap colours…', null],
  ['Team kits…', null],
  ['History', null],
  ['Keyboard shortcuts', null],
  ['Download', /Sprite sheet/],
  ['Download', /Prompt and reference/],
  ['New animation', null],
];

async function closeAll(page) {
  for (let i = 0; i < 3; i++) {
    if (await page.locator('.sheet-backdrop').count()) {
      await page.keyboard.press('Escape');
    }
  }

  await page.locator('.menu').evaluateAll((menus) => menus.forEach((menu) => menu.remove()));
}

async function clickAll(run, scope, skip = SKIP) {
  const { page } = run;
  const buttons = page.locator(`${scope} button:visible`);
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    if (!(await button.count())) {
      break;
    }

    const name = (
      (await button.getAttribute('aria-label')) ||
      (await button.textContent()) ||
      ''
    ).trim();

    if (skip.test(name) || (await button.isDisabled().catch(() => true))) {
      continue;
    }

    await button.click({ timeout: 2000 }).catch(() => {});
    run.clicks += 1;
    await page.waitForTimeout(50);

    if (scope !== '.sheet') {
      await closeAll(page);
    }
  }
}

async function everyWorkspace(run) {
  const { page } = run;
  const modes = await page
    .locator('#toolbar .segmented[aria-label="Workspace"] button')
    .allTextContents();

  await page
    .locator('.section[data-collapsed="true"] > h2')
    .evaluateAll((titles) => titles.forEach((title) => title.click()));

  for (const mode of modes) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.waitForTimeout(250);

    for (const scope of ['#toolbar', '#rail', '#stage', '#inspector']) {
      await clickAll(run, scope, scope === '#toolbar' ? TOOLBAR_SKIP : SKIP);
    }
  }

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
}

async function everyDialog(run) {
  const { page } = run;

  for (const [opener, item] of DIALOGS) {
    await page
      .getByRole('button', { name: opener })
      .first()
      .click({ timeout: 2000 })
      .catch(() => {});

    if (item) {
      await page
        .getByRole('menuitem', { name: item })
        .click({ timeout: 2000 })
        .catch(() => {});
    }

    await page.waitForTimeout(250);
    await clickAll(
      run,
      '.sheet',
      /Delete|Go back|Wear it|Apply to|Close|Cancel|Done|OK|Create|Forget/,
    );
    await closeAll(page);
  }
}

async function newKind(page, kind) {
  await page.locator('button.wordmark').click();
  await page.locator('.start-section').evaluate((details) => {
    details.open = true;
  });
  await createProject(page, { kind });
}

export async function monkey({ page, check }) {
  const run = { page, clicks: 0 };
  await openExample(page);

  for (const kind of [null, 'Tiles', 'Effect', 'Character']) {
    if (kind) {
      await newKind(page, kind);
    }

    await everyWorkspace(run);
    await everyDialog(run);
  }

  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Meta+Shift+z');
  check(run.clicks > 300, `${run.clicks} clicks across every kind, workspace and dialog`);
}
