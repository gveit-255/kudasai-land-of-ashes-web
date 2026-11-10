/*:
 * @plugindesc Puntos de control persistentes. Revive al grupo en el último punto al perder.
 * @help
 * KudasaiCheckpoint SET registra la casilla y dirección actuales.
 * KudasaiCheckpoint SET x y [dirección] registra otra casilla del mapa actual.
 * La derrota devuelve al grupo al punto registrado con PV y PM completos.
 * Las recompensas y el progreso se conservan. Los enemigos vivos se reinician.
 */
(function () {
    'use strict';

    function current() {
        var point = $gameSystem && $gameSystem._kudasaiCheckpoint;
        return point && $dataMapInfos[point.map] ? point : null;
    }

    function copyReturnStack(stack) {
        return stack.map(function (entry) {
            return {map:entry.map,x:entry.x,y:entry.y,d:entry.d,transparent:entry.transparent};
        });
    }

    function set(x, y, direction, quiet) {
        var directions = [2, 4, 6, 8];
        if (!$gameMap.mapId() || !Number.isInteger(x) || !Number.isInteger(y) ||
            !$gameMap.isValid(x, y) || directions.indexOf(direction) < 0 ||
            !directions.some(function (d) { return $gameMap.isPassable(x, y, d); }) ||
            $gamePlayer.isTransferring() || $gamePlayer.isInVehicle()) return false;
        var stack = $gameSystem._kabsReturnStack;
        $gameSystem._kudasaiCheckpoint = {
            map:$gameMap.mapId(),x:x,y:y,direction:direction,
            returnStack:Array.isArray(stack)?copyReturnStack(stack):null
        };
        if (!quiet) $gameTemp._kudasaiCheckpointNotice = 'Punto de control activado';
        return true;
    }

    window.KudasaiCheckpoints = {set:set, has:function () { return !!current(); }};

    var pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (name, args) {
        pluginCommand.apply(this, arguments);
        if (name.toLowerCase() !== 'kudasaicheckpoint' || (args[0] || '').toUpperCase() !== 'SET') return;
        if (args.length === 1) set($gamePlayer.x, $gamePlayer.y, $gamePlayer.direction());
        else set(Number(args[1]), Number(args[2]), args[3] === undefined ? $gamePlayer.direction() : Number(args[3]));
    };

    function isDefeat(scene) {
        if (!$gameParty) return false;
        if ($gameParty.isAllDead()) return true;
        var leader = $gameParty.leader();
        return scene instanceof Scene_Map && window.KudasaiABS && KudasaiABS.isEnabled() &&
            leader && leader.isDead();
    }

    function reviveAt(point) {
        $gameParty.allMembers().forEach(function (actor) { actor.recoverAll(); });
        if (point.returnStack) $gameSystem._kabsReturnStack = copyReturnStack(point.returnStack);
        else delete $gameSystem._kabsReturnStack;
        delete $gameSystem._kabsReturnGuard;
        var combat = $gameSystem._kabs;
        if (combat) {
            combat.stamina = 100;
            combat.attack = combat.magic = combat.heal = 0;
            combat.dodge = combat.invuln = combat.steps = combat.turn = 0;
        }
        $gameMessage.clear();
        $gameTemp.clearDestination();
        Input.clear();
        TouchInput.clear();
        $gameScreen.clearShake();
        $gameScreen.clearFlash();
        $gamePlayer.setOpacity(255);
        $gamePlayer.setTransparent(false);
        $gamePlayer.reserveTransfer(point.map, point.x, point.y, point.direction, 0);
        $gamePlayer.requestMapReload();
        $gameTemp._kudasaiCheckpointNotice = 'Punto de control recuperado';
    }

    var goto = SceneManager.goto;
    SceneManager.goto = function (sceneClass) {
        var point = sceneClass === Scene_Gameover && current();
        if (point && isDefeat(this._scene)) {
            reviveAt(point);
            return goto.call(this, Scene_Map);
        }
        return goto.apply(this, arguments);
    };

    var update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        update.apply(this, arguments);
        var notice = $gameTemp._kudasaiCheckpointNotice;
        if (notice && !this._fadeDuration && !SceneManager.isSceneChanging()) {
            var label = this._kudasaiCheckpointLabel;
            if (!label) {
                label = new Sprite(new Bitmap(296, 36));
                this.addChild(label);
                this._kudasaiCheckpointLabel = label;
            }
            label.bitmap.clear();
            label.bitmap.fillRect(0, 0, 296, 36, 'rgba(20,14,34,.86)');
            label.bitmap.fillRect(0, 0, 296, 1, '#a17cce');
            label.bitmap.fontSize = 17;
            label.bitmap.textColor = '#eadcfc';
            label.bitmap.drawText(notice, 0, 0, 296, 36, 'center');
            label.position.set(Math.round((Graphics.width-296)/2), 26);
            label._remaining = 112;
            delete $gameTemp._kudasaiCheckpointNotice;
        }
        var sprite = this._kudasaiCheckpointLabel;
        if (sprite) {
            sprite._remaining = Math.max(0, sprite._remaining - 1);
            sprite.opacity = Math.min(255, sprite._remaining * 12);
        }
    };
}());
