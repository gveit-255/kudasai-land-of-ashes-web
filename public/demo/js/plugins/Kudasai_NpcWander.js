/*:
 * @plugindesc Paseos aleatorios de los vecinos por las zonas transitables, incluso fuera de camara.
 * @author Kudasai
 * @help
 * Nota del evento: <KudasaiWander>
 * Configurar la pagina con movimiento Aleatorio, velocidad y frecuencia deseadas.
 * Conserva colisiones, animacion de marcha, pausas y bloqueo durante dialogos.
 * No limita los paseos a un radio alrededor del punto inicial.
 * Las rutas forzadas y las paginas sin movimiento aleatorio conservan su control.
 */
(function () {
    'use strict';

    var albaCastVersion = 6;
    function isAlbaCastMap(mapId) {
        return mapId === 8 || mapId === 16 || mapId === 17 || mapId === 24 || mapId === 25 || mapId === 26;
    }

    var setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function (mapId) {
        setup.apply(this, arguments);
        if (isAlbaCastMap(mapId)) this._kudasaiAlbaCastVersion = albaCastVersion;
    };

    var reloadMap = Scene_Load.prototype.reloadMapIfUpdated;
    Scene_Load.prototype.reloadMapIfUpdated = function () {
        reloadMap.apply(this, arguments);
        var mapId = $gameMap.mapId();
        if (!isAlbaCastMap(mapId) || $gameMap._kudasaiAlbaCastVersion === albaCastVersion ||
                $gamePlayer.isTransferring()) return;
        // A save made in Alba still holds the old event sprites and routes.
        $gamePlayer.reserveTransfer(mapId, $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), 2);
        $gamePlayer.requestMapReload();
    };

    var updateSelfMovement = Game_Event.prototype.updateSelfMovement;

    Game_Event.prototype.updateSelfMovement = function () {
        var data = this.event();
        var page = this.page();
        if (!data || !page || page.moveType !== 1 ||
                !/<KudasaiWander>/i.test(data.note || '')) {
            updateSelfMovement.call(this);
            return;
        }

        // Adopt the new page settings when loading an older saved game too.
        if (this._kudasaiWanderPage !== this._pageIndex) {
            this._kudasaiWanderPage = this._pageIndex;
            this._moveType = page.moveType;
            this.setMoveSpeed(page.moveSpeed);
            this.setMoveFrequency(page.moveFrequency);
            this.setWalkAnime(page.walkAnime);
            this.setStepAnime(page.stepAnime);
            this.setDirectionFix(page.directionFix);
        }

        // The native updateStop already yields to forced movement routes.
        // Only remove MV's camera-distance restriction for opted-in neighbors.
        if (!this._locked && !$gameMap.isEventRunning() &&
                this.checkStop(this.stopCountThreshold())) {
            this.moveTypeRandom();
        }
    };
})();
