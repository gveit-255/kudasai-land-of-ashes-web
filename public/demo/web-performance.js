/* global Graphics, SceneManager, $gameMap */
// Browser-only renderer and cadence. Gameplay retains MV's fixed 1/60 simulation step.
(function () {
  'use strict';
  const frameMs = 1000 / 60;
  const query = new URLSearchParams(location.search);
  const diagnostics = query.get('rendimiento') === '1';
  const baseline = diagnostics && query.get('perfil') === 'original';
  const now = () => performance.now();
  window.KudasaiWebPerformance = {
    install() {
      if (!baseline) {
        // The desktop plugin defaults to a 1920x1080 framebuffer. Match the
        // 1280x720 composition on the web; CSS still fits any viewport.
        Graphics._updateRenderer = function () {
          const renderer = this._renderer;
          if (!renderer) return;
          const changed =
            renderer.resolution !== 1 ||
            renderer.width !== this._width ||
            renderer.height !== this._height;
          if (changed) {
            renderer.resolution = 1;
            const target = renderer.rootRenderTarget;
            if (target && target.resolution !== 1) {
              target.resolution = 1;
              target.size.width = -1;
            }
            renderer.resize(this._width, this._height);
          }
          this._centerElement(this._canvas);
        };
        // Keep a single RAF pending across stop/resume and limit displays above
        // 60 Hz without changing _deltaTime, movement, timers or combat updates.
        let pending = null;
        let deadline = null;
        const tick = (timestamp) => {
          pending = null;
          if (SceneManager._stopped) return;
          if (deadline === null) deadline = timestamp;
          if (timestamp + 0.5 >= deadline) {
            deadline += frameMs;
            if (timestamp - deadline >= frameMs) deadline = timestamp + frameMs;
            SceneManager.update();
          } else SceneManager.requestUpdate();
        };
        SceneManager.requestUpdate = function () {
          if (!this._stopped && pending === null) pending = requestAnimationFrame(tick);
        };
        const stop = SceneManager.stop;
        SceneManager.stop = function () {
          stop.call(this);
          if (pending !== null) cancelAnimationFrame(pending);
          pending = deadline = null;
        };
        // The browser submits WebGL commands at the RAF boundary. Avoid the
        // legacy explicit gl.flush and the associated 1-3 skipped draw frames.
        Graphics.render = function (stage) {
          if (stage) this._renderer.render(stage);
          this._rendered = !!stage;
          this._skipCount = 0;
          this.frameCount++;
        };
      }
      if (!diagnostics) return;
      const panel = document.createElement('output');
      panel.id = 'web-performance';
      panel.setAttribute('aria-label', 'Medición de rendimiento');
      Object.assign(panel.style, {
        position: 'fixed',
        top: '8px',
        left: '8px',
        zIndex: '9999',
        background: '#091018ed',
        color: '#dcefe2',
        border: '1px solid #8da194',
        padding: '8px 12px',
        font: '12px/1.5 monospace',
        whiteSpace: 'pre',
        pointerEvents: 'none',
      });
      panel.textContent = 'Midiendo fotogramas renderizados…';
      document.body.appendChild(panel);
      let began = now(),
        draws = 0,
        updates = 0,
        logic = 0,
        updateMs = 0,
        renderMs = 0;
      const history = [];
      const render = Graphics.render;
      Graphics.render = function (stage) {
        const start = now();
        render.call(this, stage);
        renderMs += now() - start;
        if (this._rendered && stage) draws++;
      };
      const updateScene = SceneManager.updateScene;
      SceneManager.updateScene = function () {
        logic++;
        return updateScene.apply(this, arguments);
      };
      const update = SceneManager.update;
      SceneManager.update = function () {
        const start = now();
        update.apply(this, arguments);
        updateMs += now() - start;
        updates++;
        const elapsed = now() - began;
        if (elapsed < 2000) return;
        const record = {
          profile: baseline ? 'original' : '60fps',
          scene: this._scene?.constructor.name ?? 'boot',
          map: typeof $gameMap !== 'undefined' && $gameMap ? $gameMap.mapId() : 0,
          renderedFPS: +((draws * 1000) / elapsed).toFixed(1),
          updatesFPS: +((updates * 1000) / elapsed).toFixed(1),
          logicFPS: +((logic * 1000) / elapsed).toFixed(1),
          updateMs: +(updateMs / updates).toFixed(2),
          renderMs: +(renderMs / updates).toFixed(2),
          resolution: Graphics._renderer?.resolution,
          visible: !document.hidden,
        };
        history.push(record);
        if (history.length > 30) history.shift();
        panel.dataset.samples = JSON.stringify(history);
        panel.textContent = `${record.profile} · ${record.scene} · mapa ${record.map}\n${record.renderedFPS} FPS dibujados · ${record.logicFPS} pasos/s\nCPU ${record.updateMs} ms · render ${record.renderMs} ms · escala ${record.resolution}`;
        began = now();
        draws = updates = logic = updateMs = renderMs = 0;
      };
      document.addEventListener('visibilitychange', () => {
        began = now();
        draws = updates = logic = updateMs = renderMs = 0;
      });
    },
  };
})();
