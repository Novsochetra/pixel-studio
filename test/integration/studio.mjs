import { readFileSync } from 'node:fs';

// What a person does in the studio, as steps the flows share.

export async function openExample(page) {
  await page.getByRole('button', { name: 'Try the example character' }).click();
  await page.waitForSelector('.grid-panel', { state: 'attached' });
  await page.waitForTimeout(400);
}

// a project from the start screen (or the projects sheet's New project): kind is a card's label
export async function createProject(page, { kind = 'Character', name, width, height, directions }) {
  await page.getByRole('radio', { name: new RegExp(`^${kind}`) }).click();

  if (name) {
    await page.fill('#project-name', name);
  }

  if (width) {
    await page.fill('#project-width', String(width));
    await page.fill('#project-height', String(height ?? width));
  }

  if (directions) {
    await page.selectOption('#project-directions', directions);
  }

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForSelector('.grid-panel', { state: 'attached' });
  await page.waitForTimeout(400);
}

export const isCompact = (page) =>
  page.evaluate(() => document.documentElement.dataset.layout === 'compact');

// on a phone the frames and the inspector's panels open from the dock; a wide window has no dock
export async function openDock(page, name) {
  const tab = page.locator('.dock-tab', { hasText: name });

  if ((await tab.count()) && (await tab.getAttribute('aria-pressed')) !== 'true') {
    await tab.click();
    await page.waitForTimeout(200);
  }
}

// Edit, Views board or the preview: buttons in a wide toolbar, one button's menu on a phone
export async function openWorkspace(page, name) {
  if (await isCompact(page)) {
    await page.getByRole('button', { name: /^Workspace/ }).click();
    await page.getByRole('menuitemcheckbox', { name, exact: true }).click();
  } else {
    await page.getByRole('button', { name, exact: true }).click();
  }

  await page.waitForTimeout(300);
}

export async function showAllViews(page) {
  const all = page.getByRole('button', { name: 'All views' });

  if (await all.count()) {
    await all.click();
    await page.waitForTimeout(200);
  }
}

// the frames of the view being edited, as "1", "2 · empty"
export async function frameLabels(page) {
  const labels = await page
    .locator('.grid-row.current .cell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));

  return labels.map((label) => {
    const [, number, empty] = label.match(/frame (\d+)(, empty)?/);

    return empty ? `${number} · empty` : number;
  });
}

export async function selectView(page, name) {
  await showAllViews(page);
  await page.locator('.grid-view', { hasText: new RegExp(`^${name}$`) }).click();
  await page.waitForTimeout(200);
}

export async function selectFrame(page, index) {
  await page.locator('.grid-row.current .cell').nth(index).click();
  await page.waitForTimeout(150);
}

// one of the selected frame's actions, from its menu
export async function frameAction(page, name) {
  await page.locator('.grid-row.current .cell.selected .cell-more').click();
  await page.getByRole('menuitem', { name }).click();
  await page.waitForTimeout(250);
}

// onto: what the image is dropped on, the stage unless a frame in the grid is named
export async function dropImage(page, path, name = 'picture.webp', onto = '#stage') {
  const transfer = await page.evaluateHandle(
    ([bytes, fileName]) => {
      const data = new DataTransfer();

      data.items.add(new File([new Uint8Array(bytes)], fileName, { type: 'image/webp' }));

      return data;
    },
    [[...readFileSync(path)], name],
  );

  await page.dispatchEvent(onto, 'drop', { dataTransfer: transfer });
}

export async function cleanReport(page) {
  await page.waitForSelector('pre.report', { timeout: 25000 });
  await page
    .waitForFunction(
      () => document.querySelector('pre.report')?.textContent.startsWith('Grid'),
      null,
      { timeout: 25000 },
    )
    .catch(() => null);

  return page.locator('pre.report').first().textContent();
}

export const status = (page) => page.locator('#statusbar').textContent();

export async function waitSaved(page) {
  await page
    .waitForFunction(
      () => /^Saved/.test(document.querySelector('.save-status')?.textContent ?? ''),
      null,
      { timeout: 8000 },
    )
    .catch(() => null);

  return page.locator('.save-status').textContent();
}

export async function download(page, click) {
  const [file] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    click(),
  ]);

  return file;
}

export const imageFile = (path, name) => ({
  name,
  mimeType: 'image/webp',
  buffer: readFileSync(path),
});

export async function chooseFiles(page, click, files) {
  const chooser = page.waitForEvent('filechooser', { timeout: 5000 });

  await click();
  await (await chooser).setFiles(files);
}

// Layers, Outline and Guide lines start folded; a click on the title opens one
export async function openPanel(page, name) {
  const section = page.locator('.section', { has: page.locator('h2', { hasText: name }) });

  if ((await section.getAttribute('data-collapsed')) === 'true') {
    await section.locator('h2').click({ position: { x: 4, y: 6 } });
  }
}

// the art pixels of a square canvas that are not clear, as "x,y", read from the middle of each
export const paintedPixels = (canvas, size) =>
  canvas.evaluate((element, across) => {
    const scale = element.width / across;
    const pen = element.getContext('2d');
    const found = [];

    for (let y = 0; y < across; y++) {
      for (let x = 0; x < across; x++) {
        const [red, green, blue] = pen.getImageData(
          Math.floor((x + 0.5) * scale),
          Math.floor((y + 0.5) * scale),
          1,
          1,
        ).data;

        // the checkerboard behind clear pixels is grey: red, green and blue nearly the same
        if (Math.abs(red - green) > 40 || Math.abs(green - blue) > 40) {
          found.push(`${x},${y}`);
        }
      }
    }

    return found;
  }, size);

// A visit with nothing saved: the saved work is deleted from a page that does not hold it open,
// and waited for. Safari drops a delete still waiting on the page that asked for it when that
// page loads again.
export async function forgetSavedWork(page, url) {
  await page.goto(new URL('manifest.webmanifest', url).href);
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('pixel-clean-studio');

        request.onsuccess = resolve;
        request.onerror = reject;
      }),
  );
  await page.goto(url);
  await page.waitForSelector('.start-screen');
}
