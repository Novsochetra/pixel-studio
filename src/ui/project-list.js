import { mergeEntry, readIndex, writeIndex } from '../store/projects.js';

// The list is only written when it was read: one written from an empty guess would drop every
// project this visit did not see. While it cannot be read, each save tries again, and the work of
// this visit joins the real list once it can.
export async function writeList(app) {
  if (app.index.unreadable) {
    const read = await readIndex(app.backend);

    if (read.unreadable) {
      return;
    }

    app.index.list.forEach((entry) => mergeEntry(read, entry));
    delete app.index.unreadable;
    app.index.list = read.list;
  }

  await writeIndex(app.backend, app.index);
}
