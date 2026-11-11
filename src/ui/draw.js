// Canvas painting shared by the editor and the pictures of every view side by side.

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const nativeCanvases = new WeakMap();

function nativeCanvas(sprite) {
  let entry = nativeCanvases.get(sprite);

  if (!entry) {
    const canvas = document.createElement('canvas');

    canvas.width = sprite.width;
    canvas.height = sprite.height;
    entry = { canvas };
    nativeCanvases.set(sprite, entry);
  }

  entry.canvas
    .getContext('2d')
    .putImageData(
      new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height),
      0,
      0,
    );

  return entry.canvas;
}

// The drawing helpers paint at the context's origin: a caller drawing elsewhere translates first.

export function drawSprite(context, sprite, scale, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.imageSmoothingEnabled = false;
  context.drawImage(nativeCanvas(sprite), 0, 0, sprite.width * scale, sprite.height * scale);
  context.restore();
}

export function drawChecker(context, { width, height }, square) {
  const colors = [cssVar('--checker-a'), cssVar('--checker-b')];

  for (let row = 0; row * square < height; row++) {
    for (let col = 0; col * square < width; col++) {
      context.fillStyle = colors[(row + col) % 2];
      const cellWidth = Math.min(square, width - col * square);
      context.fillRect(
        col * square,
        row * square,
        cellWidth,
        Math.min(square, height - row * square),
      );
    }
  }
}

// lines between the art pixels, one device pixel wide at any zoom
export function drawGrid(context, { cols, rows }, { scale, ratio }) {
  const half = 0.5 / ratio;

  context.save();
  context.strokeStyle = cssVar('--separator');
  context.lineWidth = 1 / ratio;
  context.beginPath();

  for (let col = 0; col <= cols; col++) {
    context.moveTo(col * scale + half, 0);
    context.lineTo(col * scale + half, rows * scale);
  }

  for (let row = 0; row <= rows; row++) {
    context.moveTo(0, row * scale + half);
    context.lineTo(cols * scale, row * scale + half);
  }

  context.stroke();
  context.restore();
}

// a horizontal guide across the art: the line sits on the guide row's top edge for a "top" rule
// and on its bottom edge for a "bottom" rule, so it hugs the pixels it marks
export function drawGuide(context, guide, { width, scale, label = true }) {
  const edge = guide.rule === 'bottom' ? guide.row + 1 : guide.row;
  const lineY = Math.round(edge * scale) + 0.5;

  context.save();
  context.strokeStyle = cssVar('--guide');
  context.setLineDash([6, 4]);
  context.beginPath();
  context.moveTo(0, lineY);
  context.lineTo(width, lineY);
  context.stroke();

  // drawn small, the art has no room beside it for words: they would lie over it
  if (label && scale >= 3) {
    context.setLineDash([]);
    context.font = '700 10px Silkscreen, ui-monospace, monospace';
    context.fillStyle = cssVar('--guide');
    context.fillText(`${guide.name.toUpperCase()} · ${guide.row}`, 6, lineY - 4);
  }

  context.restore();
}

// the symmetry axis, between columns when the two halves are an even width apart
export function drawMirrorLine(context, axisSum, { height, scale }) {
  const lineX = Math.round(((axisSum + 1) / 2) * scale) + 0.5;

  context.save();
  context.strokeStyle = cssVar('--mirror');
  context.setLineDash([3, 3]);
  context.beginPath();
  context.moveTo(lineX, 0);
  context.lineTo(lineX, height);
  context.stroke();
  context.restore();
}

// An iPhone draws nothing on a canvas of more than about 16 million pixels, and other browsers
// have limits of their own: a big canvas zoomed far in is drawn with fewer screen pixels to each
// art pixel instead, which a pixel's hard edges do not show.
const MOST_PIXELS = 16_000_000;
const LONGEST_SIDE = 8192;

function pixelRatio(width, height) {
  return Math.min(
    window.devicePixelRatio || 1,
    Math.sqrt(MOST_PIXELS / (width * height)),
    LONGEST_SIDE / Math.max(width, height),
  );
}

export function sizeCanvas(canvas, width, height) {
  const ratio = pixelRatio(width, height);

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = false;

  return { context, ratio };
}
