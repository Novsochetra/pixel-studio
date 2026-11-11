import { allLayers } from '../model/project.js';
import { spriteDataUrl } from '../io/images.js';
import { projectStructure } from './load.js';
import { keysFor } from './keys.js';

// Writes changed layers and the structure a moment after editing pauses, one write at a time,
// and reports 'saving', 'saved' or 'error'.
export class Saver {
  // onSaved(project) runs after each successful save (the projects list keeps names and dates)
  constructor(backend, onStatus, keys = keysFor(''), onSaved = () => {}) {
    this.backend = backend;
    this.onStatus = onStatus;
    this.keys = keys;
    this.onSaved = onSaved;
    this.dirty = new Set();
    this.structureDirty = false;
    this.stored = new Set();
    this.timer = null;
    this.failed = false;
    this.writing = [];
    this.running = Promise.resolve();
  }

  markLayers(ids) {
    ids.forEach((id) => this.dirty.add(id));
    this.schedule();
  }

  markStructure() {
    this.structureDirty = true;
    this.schedule();
  }

  markEverything(project) {
    for (const { layer } of allLayers(project)) {
      this.dirty.add(layer.id);
    }

    this.markStructure();
  }

  // layers this project has that were never written (new frames, layers brought back by undo)
  markNewLayers(project) {
    for (const { layer } of allLayers(project)) {
      if (!this.stored.has(layer.id)) {
        this.dirty.add(layer.id);
      }
    }

    this.schedule();
  }

  remember(project) {
    for (const { layer } of allLayers(project)) {
      this.stored.add(layer.id);
    }
  }

  schedule() {
    this.onStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.running = this.running.then(() => this.project && this.flush(this.project));
    }, 1200);
  }

  attach(project) {
    this.project = project;
  }

  // write whatever is waiting now, before switching to another project
  async flushNow() {
    // after a failed save nothing is scheduled, but its changes are still waiting
    if (this.timer === null && !this.dirty.size && !this.structureDirty) {
      return this.running;
    }

    clearTimeout(this.timer);
    this.timer = null;
    this.running = this.running.then(() => this.flush(this.project));

    return this.running;
  }

  // stop saving: this project is no longer the one open
  detach() {
    clearTimeout(this.timer);
    this.timer = null;
    this.project = null;
  }

  layerDoc(layer) {
    return [this.keys.layer(layer.id), { png: spriteDataUrl(layer.sprite) }];
  }

  projectDoc(project) {
    return [
      this.keys.project,
      { json: JSON.stringify(projectStructure(project)), savedAt: Date.now() },
    ];
  }

  // what a save would write now, with nothing marked as written: for the page to keep by
  // another way as it is left (left-unsaved.js)
  waiting() {
    const { project } = this;

    // a save under way is not in the saved work yet either
    if (!project || (!this.dirty.size && !this.structureDirty)) {
      return this.writing;
    }

    const dirty = [...allLayers(project)]
      .map(({ layer }) => layer)
      .filter((layer) => this.dirty.has(layer.id) && layer.sprite);

    return [
      ...this.writing.filter(([key]) => key !== this.keys.project),
      ...dirty.map((layer) => this.layerDoc(layer)),
      this.projectDoc(project),
    ];
  }

  // Together where the backend can (this browser's own store): asked for in one go, a save
  // started as the page is left is whole, where one document at a time only the first was begun.
  async write(docs) {
    if (this.backend.writeAll && docs.length) {
      await this.backend.writeAll(docs);

      return;
    }

    for (const [key, data] of docs) {
      await this.backend.write(key, data);
    }
  }

  async flush(project) {
    const layers = [...allLayers(project)].map(({ layer }) => layer);
    const dirty = layers.filter((layer) => this.dirty.has(layer.id) && layer.sprite);

    this.dirty.clear();
    const current = new Set(layers.map((layer) => layer.id));
    const gone = [...this.stored].filter((id) => !current.has(id));

    try {
      this.onStatus('saving');

      const docs = dirty.map((layer) => this.layerDoc(layer));

      if (this.structureDirty || dirty.length || gone.length) {
        this.structureDirty = false;
        docs.push(this.projectDoc(project));
      }

      this.writing = docs;
      await this.write(docs);
      this.writing = [];
      dirty.forEach((layer) => this.stored.add(layer.id));

      for (const id of gone) {
        await this.backend.remove(this.keys.layer(id));
        this.stored.delete(id);
      }

      this.failed = false;
      this.onStatus('saved');
      await this.onSaved(project);
    } catch (error) {
      this.writing = [];
      this.failed = true;
      dirty.forEach((layer) => this.dirty.add(layer.id));
      this.structureDirty = true;
      this.onStatus('error', error);
    }
  }
}
