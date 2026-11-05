// A minimal .zip writer (stored, not compressed: PNGs are compressed already).

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;

  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function header(size) {
  const bytes = new Uint8Array(size);

  return { bytes, view: new DataView(bytes.buffer) };
}

function localHeader(name, data, crc) {
  const { bytes, view } = header(30 + name.length);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, name.length, true);
  bytes.set(name, 30);

  return bytes;
}

function centralHeader(name, data, crc, offset) {
  const { bytes, view } = header(46 + name.length);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, name.length, true);
  view.setUint32(42, offset, true);
  bytes.set(name, 46);

  return bytes;
}

// files: [{ name, data: Uint8Array }] -> Blob
export function zipFiles(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = localHeader(name, file.data, crc);
    central.push(centralHeader(name, file.data, crc, offset));
    parts.push(local, file.data);
    offset += local.length + file.data.length;
  }

  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const { bytes: end, view } = header(22);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
