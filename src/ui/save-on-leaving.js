// An edit waits a moment before it is saved, so a reload or a closed tab within that moment lost
// it. The wait ends as the page is hidden (another tab, another app on a phone, the tab closing),
// and a page left with work still unsaved asks first.
export function saveOnLeaving(app) {
  const saveNow = () => app.saver.flushNow().catch(() => null);
  const unsaved = () => ['pending', 'saving'].includes(app.store.state.saveStatus);

  document.addEventListener('visibilitychange', () => document.hidden && saveNow());
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('beforeunload', (event) => {
    if (unsaved() && app.backend.kind !== 'none') {
      saveNow();
      event.preventDefault();
    }
  });
}
