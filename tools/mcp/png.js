import { deflateSync, inflateSync } from 'node:zlib';

// PNG read and written with Node alone: the studio's own codec is the browser's canvas, which
// a server run by Claude Code has not got.
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const CRCS = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let i = 0; i < 8; i++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRCS[(crc ^ byte) & 255] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const [length, crc] = [Buffer.alloc(4), Buffer.alloc(4)];

  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

// { width, height, pixels } with pixels as RGBA bytes, as a sprite is
export function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const header = Buffer.alloc(13);

  for (let y = 0; y < height; y++) {
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunksOf(file) {
  const chunks = {};

  for (let at = SIGNATURE.length; at < file.length; ) {
    const length = file.readUInt32BE(at);
    const type = file.toString('ascii', at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + length);

    chunks[type] = type === 'IDAT' ? Buffer.concat([chunks.IDAT ?? Buffer.alloc(0), data]) : data;
    at += length + 12;
  }

  return chunks;
}

function paeth(left, up, corner) {
  const estimate = left + up - corner;
  const [toLeft, toUp, toCorner] = [left, up, corner].map((value) => Math.abs(estimate - value));

  if (toLeft <= toUp && toLeft <= toCorner) {
    return left;
  }

  return toUp <= toCorner ? up : corner;
}

// each row was stored as its difference from the pixels before and above it
function unfiltered(raw, { stride, height, channels }) {
  const out = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];

    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? out[y * stride + i - channels] : 0;
      const up = y ? out[(y - 1) * stride + i] : 0;
      const corner = y && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter];

      out[y * stride + i] = (raw[y * (stride + 1) + 1 + i] + predicted) & 255;
    }
  }

  return out;
}

const PIXEL_OF = {
  0: (bytes, i) => [bytes[i], bytes[i], bytes[i], 255],
  2: (bytes, i) => [bytes[i * 3], bytes[i * 3 + 1], bytes[i * 3 + 2], 255],
  4: (bytes, i) => [bytes[i * 2], bytes[i * 2], bytes[i * 2], bytes[i * 2 + 1]],
  6: (bytes, i) => [...bytes.subarray(i * 4, i * 4 + 4)],
};

function pixelReader(type, bytes, { PLTE, tRNS }) {
  if (type === 3) {
    return (i) => [...PLTE.subarray(bytes[i] * 3, bytes[i] * 3 + 3), tRNS?.[bytes[i]] ?? 255];
  }

  return (i) => PIXEL_OF[type](bytes, i);
}

// → { width, height, data } with data as RGBA bytes, as the cleaner and a sprite take them
export function decodePng(file) {
  if (!file.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    throw new Error('Not a PNG file. Save the picture as PNG first.');
  }

  const chunks = chunksOf(file);
  const [width, height] = [chunks.IHDR.readUInt32BE(0), chunks.IHDR.readUInt32BE(4)];
  const [depth, type, , , interlace] = chunks.IHDR.subarray(8);

  if (depth !== 8 || interlace) {
    throw new Error('Only 8-bit PNGs that are not interlaced can be read. Save it again as one.');
  }

  const channels = CHANNELS[type];
  const bytes = unfiltered(inflateSync(chunks.IDAT), {
    stride: width * channels,
    height,
    channels,
  });
  const pixel = pixelReader(type, bytes, chunks);
  const data = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    data.set(pixel(i), i * 4);
  }

  return { width, height, data };
}
