import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = await readFile(
  resolve(import.meta.dirname, '../src/features/demo/game-performance.js'),
  'utf8',
);
function host(search = '') {
  let time = 0,
    serial = 0,
    draws = 0,
    flushes = 0,
    resizes = 0,
    updates = 0,
    logic = 0,
    accumulator = 0,
    simulationTime = 0;
  const callbacks = new Map();
  const context = {
    window: {},
    location: { search },
    URLSearchParams,
    performance: { now: () => time },
    requestAnimationFrame(callback) {
      const id = ++serial;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      callbacks.delete(id);
    },
    document: {
      body: { appendChild() {} },
      addEventListener() {},
      createElement: () => ({ style: {}, setAttribute() {}, dataset: {} }),
    },
    Graphics: {
      _width: 1280,
      _height: 720,
      _canvas: {},
      frameCount: 0,
      _renderer: {
        resolution: 1.5,
        width: 1920,
        height: 1080,
        rootRenderTarget: { resolution: 1.5, size: { width: 1920 } },
        gl: {
          flush() {
            flushes++;
          },
        },
        render() {
          draws++;
        },
        resize(width, height) {
          resizes++;
          this.width = width * this.resolution;
          this.height = height * this.resolution;
        },
      },
      _centerElement() {},
      _updateRenderer() {},
      render() {
        this._renderer.render();
        this._renderer.gl.flush();
      },
    },
    SceneManager: {
      _stopped: false,
      _deltaTime: 1 / 60,
      requestUpdate() {},
      stop() {
        this._stopped = true;
      },
      update() {
        updates++;
        accumulator += (time - simulationTime) / 1000;
        simulationTime = time;
        while (accumulator + 1e-9 >= this._deltaTime) {
          logic++;
          accumulator -= this._deltaTime;
        }
        context.Graphics.render({});
        this.requestUpdate();
      },
    },
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  return {
    context,
    callbacks,
    stats: () => ({ draws, flushes, resizes, updates, logic }),
    advance(timestamp) {
      time = timestamp;
      const queued = [...callbacks.values()];
      callbacks.clear();
      queued.forEach((callback) => callback(time));
    },
  };
}
const results = [];
for (const refreshRate of [60, 120, 144]) {
  const run = host();
  const { Graphics, SceneManager } = run.context;
  run.context.window.KudasaiWebPerformance.install();
  assert.equal(SceneManager._deltaTime, 1 / 60, 'Original simulation timestep');
  Graphics._updateRenderer();
  Graphics._updateRenderer();
  assert.equal(Graphics._renderer.width, 1280);
  assert.equal(Graphics._renderer.height, 720);
  assert.equal(run.stats().resizes, 1, 'No redundant framebuffer resize');
  SceneManager.requestUpdate();
  SceneManager.requestUpdate();
  assert.equal(run.callbacks.size, 1, 'Exactly one queued animation callback');
  for (let frame = 0; frame <= refreshRate * 10; frame++) run.advance((frame * 1000) / refreshRate);
  const actual = run.stats();
  assert(
    Math.abs(actual.updates - 600) <= 2,
    `${refreshRate} Hz: ${actual.updates} updates over ten seconds`,
  );
  assert(Math.abs(actual.logic - 600) <= 2, `${refreshRate} Hz: fixed gameplay speed`);
  assert.equal(actual.flushes, 0, 'No explicit WebGL flush');
  assert.equal(actual.draws, actual.updates, 'No legacy frame skipping');
  SceneManager.stop();
  assert.equal(run.callbacks.size, 0, 'Stop cancels RAF');
  SceneManager._stopped = false;
  SceneManager.requestUpdate();
  SceneManager.requestUpdate();
  assert.equal(run.callbacks.size, 1, 'Resume cannot duplicate the game loop');
  results.push({
    refreshRate,
    renderedFrames: actual.draws,
    simulationSteps: actual.logic,
    durationSeconds: 10,
  });
}
const original = host('?rendimiento=1&perfil=original');
const oldRender = original.context.Graphics.render;
original.context.window.KudasaiWebPerformance.install();
assert.equal(
  original.context.Graphics._renderer.resolution,
  1.5,
  'Baseline retains desktop resolution',
);
// Baseline diagnostics wrap the draw function but keep its original flush.
original.context.Graphics.render({});
assert.equal(original.stats().flushes, 1);
assert.notEqual(original.context.Graphics.render, oldRender);
console.log(JSON.stringify({ performanceRegression: 'passed', results }, null, 2));
