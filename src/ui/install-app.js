import { node } from './dom.js';

let waitingPrompt = null;
let onChange = () => {};

export const canInstall = () => Boolean(waitingPrompt);

export function onInstallChange(listener) {
  onChange = listener;
}

function setPrompt(prompt) {
  waitingPrompt = prompt;
  onChange();
}

export async function installApp() {
  const prompt = waitingPrompt;

  setPrompt(null);
  await prompt.prompt();
}

function listenForInstall() {
  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setPrompt(event);
  });
  addEventListener('appinstalled', () => setPrompt(null));
}

function linkTheApp() {
  document.head.append(
    node('link', { rel: 'manifest', href: 'manifest.webmanifest' }),
    node('link', { rel: 'icon', href: 'icons/icon-192.png' }),
    node('link', { rel: 'apple-touch-icon', href: 'icons/icon-192.png' }),
  );
}

// claude.ai shows the page in a sandbox with no files beside it, and there service workers throw:
// the page stays a plain page, and asks for no manifest it does not have
export async function setUpApp() {
  listenForInstall();

  try {
    await navigator.serviceWorker.register('sw.js');
  } catch {
    return;
  }

  linkTheApp();

  // a browser may clear saved work under pressure, unless the app that holds it asked it not to
  if (matchMedia('(display-mode: standalone)').matches) {
    navigator.storage?.persist();
  }
}
