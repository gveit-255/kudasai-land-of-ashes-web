/*:
 * @plugindesc Registro de bloqueos en la prueba del editor; conserva el comportamiento del motor. MV.
 * @author Gstv_
 * @help
 * Solo funciona en pruebas del editor NW.js (?test). No actua en exportaciones.
 * Guarda los ultimos estados y errores en save/kudasai-diagnostico.json.
 * No cambia partidas, preferencias, controles ni el tratamiento de errores.
 * Si la imagen se congela, conservar ese archivo antes de reabrir la prueba.
 */
(function () {
    'use strict';
    if (!Utils.isNwjs() || !Utils.isOptionValid('test')) return;
    var fs, path, history = [], failure = null, lastUpdate = Date.now(), stage = 'inicio';
    try { fs = require('fs'); path = require('path'); } catch (error) { return; }
    function interpreterState(interpreter) {
        if (!interpreter) return null;
        var command = interpreter._list && interpreter._list[interpreter._index];
        return { eventId: interpreter._eventId, index: interpreter._index,
            waitMode: interpreter._waitMode, waitCount: interpreter._waitCount,
            command: command ? { code: command.code, parameters: command.parameters } : null };
    }
    function snapshot(reason) {
        var scene = SceneManager._scene, map = window.$gameMap, player = window.$gamePlayer;
        var spriteset = scene && scene._spriteset, trees = spriteset && spriteset._kudasaiTrees;
        var renderer = Graphics._renderer;
        return { time: new Date().toISOString(), reason: reason, frame: Graphics.frameCount,
            stage: stage, secondsSinceUpdate: (Date.now() - lastUpdate) / 1000,
            scene: scene && scene.constructor.name, sceneStarted: SceneManager._sceneStarted,
            stopped: SceneManager._stopped, sceneChanging: SceneManager.isSceneChanging(),
            focused: document.hasFocus(), hidden: document.hidden,
            mapId: map && map.mapId(), player: player && { x: player.x, y: player.y,
                canMove: player.canMove(), routeForced: player.isMoveRouteForcing(),
                transferring: player.isTransferring() },
            menuEnabled: window.$gameSystem && $gameSystem.isMenuEnabled(),
            cinematic: window.$gameSystem && $gameSystem._kudasaiCine || null,
            eventRunning: map && map.isEventRunning(), interpreter: map && interpreterState(map._interpreter),
            messageBusy: window.$gameMessage && $gameMessage.isBusy(),
            trees: trees && { count: trees.records.length, frame: trees.frame, gain: trees.gain },
            contextLost: !!(renderer && renderer.gl && renderer.gl.isContextLost()),
            memory: process.memoryUsage(), nw: process.versions.nw };
    }
    function record(reason, error) {
        // Diagnostics must never interrupt the game, including filesystem errors.
        try {
            if (error) failure = { time: new Date().toISOString(), reason: reason,
                message: String(error.stack || error.message || error) };
            history.push(snapshot(reason));
            if (history.length > 12) history.shift();
            var directory = StorageManager.localFileDirectoryPath();
            if (!fs.existsSync(directory)) fs.mkdirSync(directory);
            fs.writeFileSync(path.join(directory, 'kudasai-diagnostico.json'),
                JSON.stringify({ error: failure, samples: history }, null, 2), 'utf8');
        } catch (ignored) { }
    }
    var update = SceneManager.update;
    SceneManager.update = function () {
        lastUpdate = Date.now(); stage = 'actualizando';
        update.apply(this, arguments);
        stage = 'esperando siguiente fotograma';
    };
    var catchException = SceneManager.catchException;
    SceneManager.catchException = function (error) {
        record('excepcion del motor', error);
        catchException.apply(this, arguments);
    };
    window.addEventListener('error', function (event) {
        record('error JavaScript', event.error || event.message);
    });
    var boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        boot.apply(this, arguments);
        var canvas = Graphics._canvas;
        if (canvas) canvas.addEventListener('webglcontextlost', function () {
            record('contexto WebGL perdido', 'La GPU perdio el contexto del juego');
        });
        record('inicio de prueba');
    };
    setInterval(function () {
        record(Date.now() - lastUpdate > 3000 ? 'fotogramas detenidos' : 'seguimiento');
    }, 5000);
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 120) record('captura manual F9');
    });
})();
