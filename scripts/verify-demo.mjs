import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const demo = resolve(root, 'dist/demo');
const manifest = JSON.parse(await readFile(resolve(demo, 'manifest.json'), 'utf8'));
assert.equal(manifest.format, 'kudasai-web-demo-v1');
assert.equal(manifest.sourceUnchanged, true);
assert(manifest.files.length > 100);
const paths = new Set();
for (const entry of manifest.files) {
  const path = resolve(demo, entry.path);
  assert(path.startsWith(demo + sep), 'Manifest path stays within the demo');
  assert(!paths.has(entry.path), 'Unique manifest entries');
  paths.add(entry.path);
  assert(!/(^|\/)(save|node_modules|work|docs|tools)\//i.test(entry.path));
  assert(!/\.(exe|dll|rpgproject|zip|map)$/i.test(entry.path));
  const bytes = await readFile(path);
  assert.equal(bytes.length, entry.bytes, `Size: ${entry.path}`);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    entry.sha256,
    `Hash: ${entry.path}`,
  );
  assert((await stat(path)).size <= 25 * 1024 * 1024);
}
const system = JSON.parse(await readFile(resolve(demo, 'data/System.json'), 'utf8'));
assert(system.hasEncryptedImages && system.hasEncryptedAudio);
assert.equal(
  system.encryptionKey,
  createHash('md5').update('ClaveSecreta99', 'utf8').digest('hex'),
);
assert.equal(manifest.encryption, 'RPG Maker MV');
assert.equal(
  manifest.encryptedImages,
  [...paths].filter((path) => path.endsWith('.rpgmvp')).length,
);
assert.equal(
  manifest.encryptedAudio,
  [...paths].filter((path) => /\.rpgmv[om]$/.test(path)).length,
);
assert(manifest.encryptedImages > 0 && manifest.encryptedAudio > 0);
for (const path of paths) {
  if (/\.rpgmv[pom]$/.test(path)) {
    const bytes = await readFile(resolve(demo, path));
    assert.equal(bytes.subarray(0, 16).toString('hex'), '5250474d560000000003010000000000', path);
    const original = path
      .replace(/\.rpgmvp$/, '.png')
      .replace(/\.rpgmvo$/, '.ogg')
      .replace(/\.rpgmvm$/, '.m4a');
    assert(!paths.has(original), 'No plaintext duplicate: ' + path);
  }
}
assert(paths.has(`data/Map${String(system.startMapId).padStart(3, '0')}.json`));
for (const plugin of manifest.activePlugins) assert(paths.has(`js/plugins/${plugin}.js`));
assert(paths.has('img/system/Window.png'));
assert(paths.has('img/system/Loading.png'));
assert(paths.has('fonts/mplus-1m-regular.ttf'));
assert(paths.has(`img/titles1/${system.title1Name}.rpgmvp`));
assert(paths.has('img/characters/Kudasai_Loussiana_Dash_20261110.rpgmvp'));
assert(manifest.activePlugins.includes('Kudasai_PlatformExport'));
const imageFolders = {
  parallaxName: 'parallaxes',
  characterName: 'characters',
  faceName: 'faces',
  animation1Name: 'animations',
  animation2Name: 'animations',
  battleback1Name: 'battlebacks1',
  battleback2Name: 'battlebacks2',
  title1Name: 'titles1',
  title2Name: 'titles2',
};
const checkedImages = new Set();
function checkImage(folder, name) {
  if (!name) return;
  const extension = folder === 'system' && ['Window', 'Loading'].includes(name) ? 'png' : 'rpgmvp';
  const path = `img/${folder}/${name}.${extension}`;
  // Match manifest strings exactly: Cloudflare paths are case sensitive.
  assert(paths.has(path), `Missing image reference: ${path}`);
  checkedImages.add(path);
}
function inspectData(value) {
  if (Array.isArray(value)) {
    value.forEach(inspectData);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (imageFolders[key] && typeof child === 'string') checkImage(imageFolders[key], child);
    if (key === 'tilesetNames') child.forEach((name) => checkImage('tilesets', name));
    inspectData(child);
  }
  if (value.code === 101) checkImage('faces', value.parameters[0]);
  if (value.code === 231) checkImage('pictures', value.parameters[1]);
}
for (const path of paths) {
  if (path.startsWith('data/') && path.endsWith('.json')) {
    inspectData(JSON.parse(await readFile(resolve(demo, path), 'utf8')));
  }
}

const player = await readFile(resolve(root, 'dist/jugar/index.html'), 'utf8');
assert.match(player, /href="\/demo\/index.html"/);
assert(!player.includes('<iframe'), 'Game iframe is created only after pressing Play');
assert(
  !/<script\b[^>]*src="\/demo\//.test(player),
  'Game engine is not loaded with the player shell',
);
assert.match(player, /data-demo-status/);
assert.match(player, /Guarda tu viaje/);

// Exercise the browser adapter against a minimal MV host: storage isolation,
// codec choice, visibility pause and exit without closing the browser window.
const listeners = new Map();
const messages = [];
const context = {
  window: {
    KudasaiWebPerformance: { install() {} },
    parent: { postMessage: (message, origin) => messages.push({ message, origin }) },
    addEventListener: () => {},
  },
  location: { origin: 'https://kudasai.example', assign: () => {} },
  document: {
    hidden: false,
    body: { dataset: {}, appendChild: () => {} },
    head: { appendChild: () => {} },
    createElement: () => ({ addEventListener: () => {} }),
    addEventListener: (event, callback) => listeners.set(event, callback),
  },
  Scene_Boot: class {},
  Scene_Map: class {},
  SceneManager: {
    _stopped: false,
    run() {
      this.configKeyAtBoot = context.StorageManager.webStorageKey(-1);
    },
    exit() {
      throw new Error('Desktop exit must not run');
    },
    onSceneStart() {},
    catchException() {},
    stop() {
      this._stopped = true;
    },
    resume() {
      this._stopped = false;
    },
  },
  StorageManager: { webStorageKey: (id) => (id < 0 ? 'RPG Config' : `RPG File${id}`) },
  ConfigManager: {},
  AudioManager: {
    stopAll() {
      this.stopped = true;
    },
  },
  WebAudio: { canPlayOgg: () => true },
  Input: { clear() {} },
  setInterval: () => 1,
  clearInterval: () => {},
};
const adapter = await readFile(resolve(demo, 'web-runtime.js'), 'utf8');
vm.runInNewContext(adapter, context, { timeout: 1000 });
context.SceneManager.run(context.Scene_Boot);
assert.equal(context.SceneManager.configKeyAtBoot, 'Kudasai:WebDemo:v1:RPG Config');
assert.equal(context.StorageManager.webStorageKey(1), 'Kudasai:WebDemo:v1:RPG File1');
assert.equal(context.AudioManager.audioFileExt(), '.ogg');
context.WebAudio.canPlayOgg = () => false;
assert.equal(context.AudioManager.audioFileExt(), '.m4a');
context.SceneManager._scene = new context.Scene_Map();
context.SceneManager.onSceneStart();
assert.equal(messages[0].message.type, 'ready');
assert.equal(messages[0].origin, context.location.origin);
context.document.hidden = true;
listeners.get('visibilitychange')();
assert.equal(context.SceneManager._stopped, true);
context.document.hidden = false;
listeners.get('visibilitychange')();
assert.equal(context.SceneManager._stopped, false);
context.SceneManager.exit();
assert.equal(context.AudioManager.stopped, true);
assert.equal(messages.at(-1).message.type, 'exit');
console.log(
  JSON.stringify(
    {
      demo: 'passed',
      files: paths.size,
      checkedImageReferences: checkedImages.size,
      MiB: +(manifest.bytes / 1024 ** 2).toFixed(1),
      browserAdapter: 'passed',
    },
    null,
    2,
  ),
);
