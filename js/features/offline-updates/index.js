const APP_SHELL_VERSION = 'v56';
let registration = null;
let initialized = false;
let reloadOnControllerChange = false;

const byId = id => document.getElementById(id);

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function setStatus(title, detail) {
  setText('appUpdateStatus', title);
  setText('appUpdateDetail', detail);
}

function renderConnection() {
  const online = navigator.onLine;
  const node = byId('appUpdateConnection');
  if (!node) return;
  node.textContent = online ? 'Online' : 'Offline';
  node.dataset.state = online ? 'online' : 'offline';
}

function renderRegistration() {
  if (!('serviceWorker' in navigator)) {
    setStatus('Offline support unavailable', 'This browser does not support service workers. The library still stays in this browser while site data is retained.');
    return;
  }
  if (!navigator.onLine) {
    setStatus('You are offline', navigator.serviceWorker.controller
      ? 'The cached app shell can open without an internet connection. Previously downloaded external resources remain available from the browser cache.'
      : 'This browser has not finished installing the offline app shell yet. Connect once and open Quiet Reader to prepare offline access.');
    return;
  }
  if (registration?.waiting) {
    setStatus('An update is ready', 'A newer Quiet Reader version is downloaded and waiting. Install it when you are ready; the app will reload.');
  } else if (registration?.installing) {
    setStatus('Preparing an update', 'The new app files are being cached. Keep this page open until installation finishes.');
  } else if (navigator.serviceWorker.controller) {
    setStatus('Offline app is ready', 'The app shell is available from this device. You can close the tab and reopen Quiet Reader while offline.');
  } else {
    setStatus('Preparing offline access', 'Quiet Reader is installing its offline app shell. Keep this page open while the first cache is created.');
  }
}

function watchWorker(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      renderRegistration();
      if (!navigator.serviceWorker.controller) {
        setStatus('Offline app installed', 'The app shell has been cached on this device. Your books and reading data remain in local browser storage.');
      }
    } else if (worker.state === 'redundant') {
      setStatus('Update could not be installed', 'The browser rejected the new app cache. Your existing app and local library have not been cleared. Try checking again while online.');
    }
  });
}

function watchRegistration(value) {
  registration = value;
  registration.addEventListener('updatefound', () => {
    watchWorker(registration.installing);
    renderRegistration();
  });
  if (registration.installing) watchWorker(registration.installing);
  renderRegistration();
}

async function checkForUpdates() {
  renderConnection();
  if (!navigator.onLine) {
    setStatus('You are offline', 'Connect to the internet to check GitHub Pages for a newer Quiet Reader deployment. The currently cached app remains available.');
    return;
  }
  const button = byId('appUpdateCheck');
  if (button) {
    button.disabled = true;
    button.textContent = 'Checking…';
  }
  setStatus('Checking for updates', 'Contacting the website and asking the browser to check the service worker version.');
  try {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported by this browser.');
    registration ||= await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
    watchRegistration(registration);
    await registration.update();
    if (registration.waiting) {
      setStatus('An update is ready', 'A newer Quiet Reader version is downloaded and waiting. Install it when you are ready; the app will reload.');
    } else if (registration.installing) {
      setStatus('Update found — downloading', 'The browser found a newer app version and is caching its files. This panel will update when installation finishes.');
    } else {
      setStatus('You are up to date', 'This browser already has the latest service worker published on the website.');
    }
    setText('appUpdateLastChecked', 'Last checked: ' + new Date().toLocaleString());
  } catch (error) {
    setStatus('Could not check for updates', error?.message || 'The website could not be reached. Your current cached app and local library are unchanged.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Check for updates';
    }
    renderConnection();
  }
}

function installUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) {
    setStatus('No update is waiting', 'Check for updates while online to look for a newer deployment.');
    return;
  }
  reloadOnControllerChange = true;
  setStatus('Installing update', 'Quiet Reader will reload when the new app version takes control. Your IndexedDB library and local preferences are not cleared.');
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function initializeOfflineUpdates() {
  if (initialized) return;
  initialized = true;
  setText('appUpdateVersion', 'Offline shell ' + APP_SHELL_VERSION);
  renderConnection();
  window.addEventListener('online', () => {
    renderConnection();
    renderRegistration();
  });
  window.addEventListener('offline', () => {
    renderConnection();
    renderRegistration();
  });
  byId('appUpdateCheck')?.addEventListener('click', checkForUpdates);
  byId('appUpdateInstall')?.addEventListener('click', installUpdate);
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
    renderRegistration();
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnControllerChange) {
      reloadOnControllerChange = false;
      location.reload();
    }
  });
  navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
    .then(value => {
      watchRegistration(value);
      value.update().catch(() => {});
    })
    .catch(error => setStatus('Offline setup could not start', error?.message || 'The browser could not register the offline app shell.'));
}
