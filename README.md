# Pixel Clean Studio

Turns AI-made "fake" pixel art (ChatGPT images) into true pixel art, then lets you edit, animate and
export it for a game. Everything runs in the browser; the build makes one self-contained HTML page.

- **Clean**: finds the image's pixel grid, removes the background and fringe, and matches each view
  to your reference view's size, palette and feet line.
- **Edit**: pencil, eraser, fill, colour swap, selection, outlines, guides, layers, pictures to trace.
- **Animate**: animations with frames shared by every view (drag to reorder), onion skin, pins.
- **Projects**: several characters, each with its own views, colours, history and versions.
- **Export**: sprite sheet + Aseprite-style JSON (Phaser, Godot, Unity), separate frames, GIFs, and
  the Naga Eleven game pack.

## Run it

Needs Python 3 (for the build) and Node 20+ (for the tests).

```bash
python3 build/build.py                         # writes dist/index.html
python3 test/wrap.py                           # dist/wrapped.html: the page with <html> around it
python3 -m http.server 8811 --directory dist   # open http://localhost:8811/wrapped.html
```

Or `npm run serve` for all three. Outside claude.ai the page saves to the browser (IndexedDB).

## Test it

```bash
npm test             # unit tests (node --test)
npm install          # once: Playwright, for the browser flows
npm run test:all     # build, unit tests, then every browser flow, monkey tests included
```

Browser flows save screenshots in `shots/`.

## Layout

- `src/clean/`: the cleaner, a pixel-exact port of `tools/pixel_clean.py`, run in a worker
- `src/model/`: projects, animations, frames, layers, sprites
- `src/editor/`, `src/palette/`, `src/export/`, `src/io/`, `src/store/`: tools, colours, exports,
  file formats, saving
- `src/ui/`: the page; `src/ui/page.html` and `src/ui/styles.css` are its shell
- `build/build.py`: joins the modules into one page and refuses import cycles, missing exports and
  calls to functions that were never imported
- `assets/`: the sample character and the pitch; `build/game-kits.json`: Naga Eleven's kits
- `test/`: unit tests (`*.test.js`), browser flows (`*.mjs`), `test/images/` the ChatGPT images they
  clean, `fixtures/` the pixels `pixel_clean.py` makes from them (`test/make_fixtures.py` remakes them)

## The command-line cleaner

`tools/pixel_clean.py` does the same cleaning from a terminal (`pip install -r tools/requirements.txt`):

```bash
python3 tools/pixel_clean.py side.webp --like front.png
```
