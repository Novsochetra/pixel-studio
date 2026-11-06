// A small animated GIF writer for pixel art: one shared palette (index 0 is transparent), LZW
// coded frames, looping forever. Pixel art rarely has more than 255 colours; past that, the
// least used colours fall to their nearest kept one.

function paletteOf(frames) {
  const counts = new Map();

  for (const frame of frames) {
    for (let i = 0; i < frame.pixels.length; i += 4) {
      if (frame.pixels[i + 3]) {
        const key = (frame.pixels[i] << 16) | (frame.pixels[i + 1] << 8) | frame.pixels[i + 2];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const kept = [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 255)
    .map(([key]) => key);
  const index = new Map(kept.map((key, i) => [key, i + 1]));
  const nearest = (key) => {
    let best = 1;
    let bestDistance = Infinity;

    kept.forEach((other, i) => {
      const distance =
        Math.abs((key >> 16) - (other >> 16)) +
        Math.abs(((key >> 8) & 255) - ((other >> 8) & 255)) +
        Math.abs((key & 255) - (other & 255));

      if (distance < bestDistance) {
        bestDistance = distance;
        best = i + 1;
      }
    });

    return best;
  };

  return { colours: [0, ...kept], indexOf: (key) => index.get(key) ?? nearest(key) };
}

function lzw(indices, minCodeSize) {
  const out = [];
  let bits = 0;
  let bitCount = 0;
  const write = (code, size) => {
    bits |= code << bitCount;
    bitCount += size;

    while (bitCount >= 8) {
      out.push(bits & 255);
      bits >>>= 8;
      bitCount -= 8;
    }
  };
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let table = new Map();
  let next = end + 1;
  let size = minCodeSize + 1;
  write(clear, size);
  let prefix = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const key = prefix * 256 + indices[i];

    if (table.has(key)) {
      prefix = table.get(key);
      continue;
    }

    write(prefix, size);
    table.set(key, next++);

    if (next > 1 << size && size < 12) {
      size++;
    }

    if (next === 4096) {
      write(clear, size);
      table = new Map();
      next = end + 1;
      size = minCodeSize + 1;
    }

    prefix = indices[i];
  }

  write(prefix, size);
  write(end, size);

  if (bitCount) {
    out.push(bits & 255);
  }

  return out;
}

// appended in place: spreading a big frame's bytes into push() overflows the call stack
function pushAll(target, bytes) {
  for (const byte of bytes) {
    target.push(byte);
  }
}

function pushSubBlocks(target, bytes) {
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    target.push(chunk.length);
    pushAll(target, chunk);
  }

  target.push(0);
}

const word = (value) => [value & 255, (value >> 8) & 255];

// frames: sprites ({ width, height, pixels }) of one size; delay in milliseconds
export function encodeGif(frames, delay) {
  const { width, height } = frames[0];
  const { colours, indexOf } = paletteOf(frames);
  const depth = Math.max(1, Math.ceil(Math.log2(colours.length)));
  const tableSize = 1 << depth;
  const bytes = [...'GIF89a'].map((char) => char.charCodeAt(0));
  bytes.push(...word(width), ...word(height), 0xf0 | (depth - 1), 0, 0);

  for (let i = 0; i < tableSize; i++) {
    const key = colours[i] ?? 0;
    bytes.push((key >> 16) & 255, (key >> 8) & 255, key & 255);
  }

  bytes.push(
    0x21,
    0xff,
    11,
    ...[...'NETSCAPE2.0'].map((char) => char.charCodeAt(0)),
    3,
    1,
    0,
    0,
    0,
  );
  const centiseconds = Math.max(2, Math.round(delay / 10));

  for (const frame of frames) {
    const indices = new Array(width * height);

    for (let pixel = 0; pixel < width * height; pixel++) {
      const i = pixel * 4;
      indices[pixel] = frame.pixels[i + 3]
        ? indexOf((frame.pixels[i] << 16) | (frame.pixels[i + 1] << 8) | frame.pixels[i + 2])
        : 0;
    }

    // disposal 2: each frame clears to transparent, so the last frame never shows through
    bytes.push(0x21, 0xf9, 4, 0x09, ...word(centiseconds), 0, 0);
    bytes.push(0x2c, 0, 0, 0, 0, ...word(width), ...word(height), 0);
    const minCodeSize = Math.max(2, depth);
    bytes.push(minCodeSize);
    pushSubBlocks(bytes, lzw(indices, minCodeSize));
  }

  bytes.push(0x3b);

  return new Uint8Array(bytes);
}
