/* global SceneManager, Scene_Boot, Scene_Map, ConfigManager, AudioManager, WebAudio, Input */
// Browser-only adaptations. Copied into the export; never installed in the editable game.
(function () {
  'use strict';
  const embedded = window.parent !== window;
  const notify = (type, message) => {
    if (embedded)
      window.parent.postMessage({ channel: 'kudasai-demo', type, message }, location.origin);
  };
  const originalRun = SceneManager.run;
  SceneManager.run = function (sceneClass) {
    const storageKey = StorageManager.webStorageKey;
    StorageManager.webStorageKey = function (id) {
      return 'Kudasai:WebDemo:v1:' + storageKey.call(this, id);
    };
    // MV forces M4A on phones even when their browser can decode Ogg.
    AudioManager.audioFileExt = function () {
      return WebAudio.canPlayOgg() ? '.ogg' : '.m4a';
    };
    ConfigManager.kudasaiFullscreen = false;
    const originalExit = SceneManager.exit;
    SceneManager.exit = function () {
      if (!embedded) {
        location.assign('/jugar/');
        return;
      }
      AudioManager.stopAll();
      this.stop();
      notify('exit');
    };
    // Keep the original method available only for engine compatibility.
    SceneManager.exitDesktop = originalExit;
    let ready = false;
    const onSceneStart = SceneManager.onSceneStart;
    SceneManager.onSceneStart = function () {
      onSceneStart.apply(this, arguments);
      if (!ready && !(this._scene instanceof Scene_Boot)) {
        ready = true;
        document.body.dataset.demoReady = 'true';
        notify('ready');
      }
      document.body.dataset.demoScene = this._scene instanceof Scene_Map ? 'map' : 'menu';
    };
    const catchException = SceneManager.catchException;
    SceneManager.catchException = function (error) {
      notify('error', 'No se pudo continuar la demo. Recarga e inténtalo de nuevo.');
      catchException.call(this, error);
    };
    window.KudasaiWebPerformance.install();
    originalRun.call(this, sceneClass);
  };
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'web-demo-sound';
  sound.textContent = 'Activar sonido';
  sound.hidden = true;
  const style = document.createElement('style');
  style.textContent =
    '.web-demo-sound{position:fixed;top:12px;left:12px;z-index:110;color:#f5f0e4;background:#101719e8;border:1px solid #ba9268;border-radius:999px;padding:10px 16px;font:14px Arial;cursor:pointer}.web-demo-sound[hidden]{display:none}';
  document.head.appendChild(style);
  document.body.appendChild(sound);
  function unlockAudio() {
    const context = WebAudio._context;
    if (!context) return;
    if (context.state === 'suspended')
      void context
        .resume()
        .then(() => {
          sound.hidden = context.state === 'running';
        })
        .catch(() => {
          sound.hidden = false;
        });
    else sound.hidden = true;
  }
  sound.addEventListener('click', unlockAudio);
  document.addEventListener('pointerdown', unlockAudio, true);
  document.addEventListener('keydown', unlockAudio, true);
  const soundCheck = setInterval(() => {
    if (WebAudio._context) {
      sound.hidden = WebAudio._context.state !== 'suspended';
      clearInterval(soundCheck);
    }
  }, 500);
  // Stop the simulation while hidden, preserving play time and combat state.
  let pausedByVisibility = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !SceneManager._stopped) {
      pausedByVisibility = true;
      SceneManager.stop();
      Input.clear();
      if (WebAudio._context?.state === 'running') void WebAudio._context.suspend();
    } else if (!document.hidden && pausedByVisibility) {
      pausedByVisibility = false;
      SceneManager.resume();
      unlockAudio();
    }
  });
  window.addEventListener('error', (event) => {
    if (event.error) notify('error', 'La demo encontró un error. Recarga e inténtalo de nuevo.');
  });
  // No filesystem, test saves, analytics, external requests or service worker.
})();
