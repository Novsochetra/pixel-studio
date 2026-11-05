// Canvas painting shared by the editor, the views board and the game preview.

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

  entry.canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height), 0, 0);

  return entry.canvas;
}

export function drawSprite(context, sprite, x, y, scale, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.imageSmoothingEnabled = false;
  context.drawImage(nativeCanvas(sprite), x, y, sprite.width * scale, sprite.height * scale);
  context.restore();
}

export function drawChecker(context, x, y, width, height, square) {
  const colors = [cssVar('--checker-a'), cssVar('--checker-b')];

  for (let row = 0; row * square < height; row++) {
    for (let col = 0; col * square < width; col++) {
      context.fillStyle = colors[(row + col) % 2];
      context.fillRect(x + col * square, y + row * square, Math.min(square, width - col * square), Math.min(square, height - row * square));
    }
  }
}

export function drawGrid(context, x, y, cols, rows, scale, ratio) {
  context.save();
  context.strokeStyle = cssVar('--separator');
  context.lineWidth = 1 / ratio;
  context.beginPath();

  for (let col = 0; col <= cols; col++) {
    context.moveTo(x + col * scale + 0.5 / ratio, y);
    context.lineTo(x + col * scale + 0.5 / ratio, y + rows * scale);
  }

  for (let row = 0; row <= rows; row++) {
    context.moveTo(x, y + row * scale + 0.5 / ratio);
    context.lineTo(x + cols * scale, y + row * scale + 0.5 / ratio);
  }

  context.stroke();
  context.restore();
}

// a horizontal guide across the art: the line sits on the guide row's top edge for a "top" rule
// and on its bottom edge for a "bottom" rule, so it hugs the pixels it marks
export function drawGuide(context, guide, x, y, width, scale, label = true) {
  const edge = guide.rule === 'bottom' ? guide.row + 1 : guide.row;
  const lineY = Math.round(y + edge * scale) + 0.5;
  context.save();
  context.strokeStyle = cssVar('--guide');
  context.setLineDash([6, 4]);
  context.beginPath();
  context.moveTo(x, lineY);
  context.lineTo(x + width, lineY);
  context.stroke();

  if (label) {
    context.setLineDash([]);
    context.font = '700 10px Silkscreen, ui-monospace, monospace';
    context.fillStyle = cssVar('--guide');
    context.fillText(`${guide.name.toUpperCase()} · ${guide.row}`, x + 6, lineY - 4);
  }

  context.restore();
}

export function drawMirrorLine(context, axisSum, x, y, height, scale) {
  const lineX = Math.round(x + ((axisSum + 1) / 2) * scale) + 0.5;
  context.save();
  context.strokeStyle = cssVar('--mirror');
  context.setLineDash([3, 3]);
  context.beginPath();
  context.moveTo(lineX, y);
  context.lineTo(lineX, y + height);
  context.stroke();
  context.restore();
}

export function sizeCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = false;

  return { context, ratio };
}
