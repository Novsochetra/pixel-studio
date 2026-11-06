import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../../src/', import.meta.url));

// which top folders of src/ may import each folder, as "Where a file goes" in CLAUDE.md says
const IMPORTED_ONLY_BY = {
  ui: ['ui'],
  store: ['store', 'ui'],
  io: ['io', 'store', 'ui', 'worker'],
};
const KEEPS_TO_ITSELF = ['clean', 'art'];

function sourceFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(full);
    }

    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const topFolder = (file) => path.relative(src, file).split(path.sep)[0];

function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  const found = [...text.matchAll(/from '(\.[^']+)'/g)].map((match) => match[1]);

  return found.map((specifier) => topFolder(path.resolve(path.dirname(file), specifier)));
}

const allImports = sourceFiles(src).flatMap((file) =>
  importsOf(file).map((imported) => ({
    file: path.relative(src, file),
    from: topFolder(file),
    imported,
  })),
);

test('ui, store and io are imported only where CLAUDE.md allows', () => {
  const wrong = allImports.filter(
    ({ from, imported }) =>
      IMPORTED_ONLY_BY[imported] && !IMPORTED_ONLY_BY[imported].includes(from),
  );

  assert.deepEqual(wrong, []);
});

test('the cleaner and the art import nothing outside themselves', () => {
  const wrong = allImports.filter(
    ({ from, imported }) => KEEPS_TO_ITSELF.includes(from) && imported !== from,
  );

  assert.deepEqual(wrong, []);
});

test('every import is seen, so the checks above are not passing on nothing', () => {
  assert.ok(allImports.some(({ from, imported }) => from === 'ui' && imported === 'store'));
  assert.ok(allImports.some(({ from, imported }) => from === 'store' && imported === 'io'));
});
