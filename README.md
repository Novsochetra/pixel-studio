# Pixel Clean Studio

Turns AI-made "fake" pixel art into true pixel art, then lets you edit, animate and export it for
any game. Everything runs in the browser; the build makes one self-contained HTML page.

- **Start**: pick what you are making (a character, an object, tiles, an effect, an icon) or a game
  preset such as Naga Eleven; save any project as a preset of your own.
- **Clean**: finds the image's pixel grid, removes the background and fringe, and fits it as its
  kind stands: a character matched to its reference view, a tile filling its canvas, an effect
  centred. Later animation frames keep their own pixel size.
- **Edit**: pencil, eraser, fill, colour swap, selection, outlines, guides, layers, pictures to trace.
- **Animate**: each animation is a grid, views down and frames across, as the sheet will be: drag
  frames to reorder them, play them on the canvas, see the mirrored side.
- **Preview**: characters in a scene (the pitch for Naga Eleven), tiles laid as a floor, effects and
  icons at 1×, 2× and 4×.
- **Cast**: every project in Projects (the name, top left) with its picture, sorted into folders
  (one per game, or heroes, enemies, tiles). "New character like this" sets up the next character
  of a game as the open one is: the same canvas, views, animations, frames, layers and guide lines,
  with nothing drawn, in the same folder. "Line them up" stands every project, or a folder's,
  side by side at one pixel size, to check heights agree, and downloads it as a PNG.
- **Export**: sprite sheet + Aseprite-style JSON (Phaser, Godot, Unity), separate frames, GIFs, and
  the Naga Eleven game pack.

## Run it

Needs Python 3 (for the build) and Node 20+ (for the checks).

```bash
npm run serve
```

Then open http://localhost:8811/wrapped.html. Outside claude.ai the page saves to the browser.

## Check it

```bash
npm install
```

```bash
npm run check
```

That runs ESLint and Prettier, the unit and regression tests, the build, and every browser flow
(`test/integration/`), which save screenshots in `shots/`. `npm test` runs only the fast tests.

## Layout

- `src/clean/`: the cleaner, a pixel-exact port of `tools/pixel_clean.py`, run in a worker
- `src/model/`: projects, kinds, presets, animations, frames, layers, sprites
- `src/editor/`, `src/palette/`, `src/export/`, `src/io/`, `src/store/`: tools, colours, exports,
  file formats, saving
- `src/ui/`: the page, one folder per feature (`grid/`, `start/`, `preview/`, `import/`, …);
  `src/ui/page.html` is its shell and `src/ui/styles/` its stylesheets, tokens first
- `src/art/`: colours painted as pixel art
- `build/build.py`: joins the modules into one page and refuses import cycles, missing exports and
  calls to functions that were never imported
- `test/unit/`, `test/integration/`, `test/regression/`: see `CLAUDE.md`
- `tools/claude-hooks/`: shows Claude Code each comment an edit adds (`.claude/settings.json`)
- `docs/`: plans and design notes

## The command-line cleaner

`tools/pixel_clean.py` does the same cleaning from a terminal (`pip install -r tools/requirements.txt`):

```bash
python3 tools/pixel_clean.py side.webp --like front.png
```
