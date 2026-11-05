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

  // A fresh project is only written once its owner changes something; then all of it is.
  saveAllOnFirstChange() {
    this.unsaved = true;
  }

  schedule() {
    if (this.unsaved && this.project) {
      this.unsaved = false;

      for (const { layer } of allLayers(this.project)) {
        this.dirty.add(layer.id);
      }

      this.structureDirty = true;
    }

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

  // write whatever is waiting now, before switching to another project; a sample that was
  // never edited is written too, so it is still in the list afterwards
  async flushNow() {
    if (this.unsaved && this.project) {
      this.markEverything(this.project);
    }

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

  async flush(project) {
    const layers = [...allLayers(project)].map(({ layer }) => layer);
    const dirty = layers.filter((layer) => this.dirty.has(layer.id) && layer.sprite);
    this.dirty.clear();
    const current = new Set(layers.map((layer) => layer.id));
    const gone = [...this.stored].filter((id) => !current.has(id));

    try {
      this.onStatus('saving');

      for (const layer of dirty) {
        await this.backend.write(this.keys.layer(layer.id), { png: spriteDataUrl(layer.sprite) });
        this.stored.add(layer.id);
      }

      if (this.structureDirty || dirty.length || gone.length) {
        this.structureDirty = false;
        await this.backend.write(this.keys.project, { json: JSON.stringify(projectStructure(project)), savedAt: Date.now() });
      }

      for (const id of gone) {
        await this.backend.remove(this.keys.layer(id));
        this.stored.delete(id);
      }

      this.failed = false;
      this.onStatus('saved');
      await this.onSaved(project);
    } catch (error) {
      this.failed = true;
      dirty.forEach((layer) => this.dirty.add(layer.id));
      this.structureDirty = true;
      this.onStatus('error', error);
    }
  }
}
