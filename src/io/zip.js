// A minimal .zip writer (stored, not compressed: PNGs are compressed already).

const CRC_TABLE = Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;

  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
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

// the day and time as a zip keeps them: two seconds to the tick, years counted from 1980
function stampOf(at) {
  return {
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
    date: ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  };
}

function localHeader({ name, data, crc, stamp }) {
  const { bytes, view } = header(30 + name.length);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(10, stamp.time, true);
  view.setUint16(12, stamp.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, name.length, true);
  bytes.set(name, 30);

  return bytes;
}

function centralHeader({ name, data, crc, stamp }, offset) {
  const { bytes, view } = header(46 + name.length);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(12, stamp.time, true);
  view.setUint16(14, stamp.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, name.length, true);
  view.setUint32(42, offset, true);
  bytes.set(name, 46);

  return bytes;
}

// files: [{ name, data: Uint8Array }] -> Blob, each file dated `at`
export function zipFiles(files, at = new Date()) {
  const encoder = new TextEncoder();
  const stamp = stampOf(at);
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const entry = {
      name: encoder.encode(file.name),
      data: file.data,
      crc: crc32(file.data),
      stamp,
    };
    const local = localHeader(entry);

    central.push(centralHeader(entry, offset));
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
