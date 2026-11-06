# Project rules

Pixel Clean Studio: turns AI pixel art into true pixel art, then edits, animates and exports it for
any game. One page, built from `src/` by `build/build.py`. The rules follow the fighting-games repo.

## Commands

| Command          | What it runs                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `npm run serve`  | builds the page and serves it on http://localhost:8811/wrapped.html    |
| `npm run check`  | lint, format check, unit and regression tests, the build, every flow   |
| `npm run lint`   | ESLint (`eslint.config.js`, local rules in `tools/eslint-rules/`)      |
| `npm run format` | Prettier, writes files                                                 |
| `npm test`       | the unit and regression tests (`node --test`)                          |
| `npm run build`  | `dist/index.html`; the build refuses import cycles and missing exports |

## Coding

- Simplest solution that works. Small files and functions with one job each. Lint enforces 150
  lines a file, 40 lines a function, complexity 10, depth 3 and 4 parameters: split code instead
  of raising limits. Group related arguments into one object (`{ x, y }`, `{ width, height }`).
- Names say what a thing is: no one-letter names except `x`, `y`, `i`, `j`.
- Comments only say why something non-obvious is done. Lint rejects `/* */` blocks, banners and
  `TODO`s.
- No raw hex colours in the page's code: the page's colours are tokens in
  `src/ui/styles/00-tokens.css`, read with `cssVar()`; colours painted as pixel art (the example's
  palette, the checkerboard, pins) live in `src/art/`.
- Logic lives in plain functions under `src/model`, `src/clean`, `src/editor`, `src/palette`,
  `src/export`, `src/store` and `src/io`, with unit tests. `src/ui` stays thin: it builds elements
  with `node()` and calls those functions.
- What a project makes is data: kinds in `src/model/kinds.js`, game presets in
  `src/model/presets.js`. Nothing outside them names a game.
- Never install packages without asking.

## Testing

- **unit** (`test/unit/`): plain functions. The cleaner must stay pixel for pixel the same as
  `tools/pixel_clean.py` (`clean.test.js`, fixtures from `test/make_fixtures.py`).
- **integration** (`test/integration/*.flow.mjs`): the built page in a browser, each flow stating
  what must be true with `check()`; `run.mjs` runs them all, the monkey runs click everything.
- **regression** (`test/regression/`): one test per fixed bug, saying what went wrong.
- Fixing a bug: first a test that fails, then the fix.
- Look at UI changes in a browser (the flows save screenshots in `shots/`).
