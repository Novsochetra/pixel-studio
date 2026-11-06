import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// The entries of a zip the studio made: { name: Buffer }. Reads the central directory, so it
// handles stored and deflated entries alike.
export function readZip(path) {
  const data = readFileSync(path);
  const end = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = data.readUInt16LE(end + 10);
  let at = data.readUInt32LE(end + 16);
  const entries = {};

  for (let i = 0; i < count; i++) {
    const method = data.readUInt16LE(at + 10);
    const size = data.readUInt32LE(at + 20);
    const nameLength = data.readUInt16LE(at + 28);
    const extra = data.readUInt16LE(at + 30) + data.readUInt16LE(at + 32);
    const local = data.readUInt32LE(at + 42);
    const name = data.toString('utf8', at + 46, at + 46 + nameLength);
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    const body = data.subarray(start, start + size);

    entries[name] = method === 8 ? inflateRawSync(body) : body;
    at += 46 + nameLength + extra;
  }

  return entries;
}

export const isPng = (buffer) => buffer.subarray(1, 4).toString() === 'PNG';
export const isGif = (buffer) => buffer.subarray(0, 6).toString() === 'GIF89a';
