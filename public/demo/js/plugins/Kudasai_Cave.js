/*:
 * @plugindesc Gruta de los Ecos: llegada, barrera y desenlace de Miku.
 * @requiredAssets img/characters/$Kudasai_Miku_Corrompido
 * @requiredAssets img/characters/Kudasai_Miku_Ataques
 * @requiredAssets img/faces/Kudasai_Expresiones_Miku
 * @requiredAssets audio/se/Kudasai_Latidos_Gruta
 * @requiredAssets img/parallaxes/!Kudasai_Gruta_Ecos_Ampliada
 * @requiredAssets img/parallaxes/Kudasai_Sombras_Gruta_Ecos_Ampliada
 */
(function () {
    'use strict';
    var mapId = 33, introId = 22, bossId = 6, apparitionId = 29, stairId = 8, demoExitEventId = 7;
    var caveGroundName = '!Kudasai_Gruta_Ecos_Ampliada';
    var cue = null, ending = null, preparedBgm = null;
    function inCave() { return $gameMap && $gameMap.mapId() === mapId; }
    function isEnding() { return inCave() && !!ending; }
    function bossDefeated() { return $gameSelfSwitches.value([mapId, bossId, 'D']); }
    function caveMusicPaused() { return $gameSwitches.value(22) || bossDefeated(); }
    function exitBlocked() {
        if (isEnding()) return !ending.unsealed;
        return inCave() && $gameSelfSwitches.value([mapId, introId, 'A']) && !bossDefeated();
    }
    function seal() { $gameSelfSwitches.setValue([mapId, introId, 'A'], true); }
    function finishArrival() {
        if (!inCave()) return;
        seal();
        cue = null;
        $gamePlayer.setOpacity(255);
        $gamePlayer.center($gamePlayer.x, $gamePlayer.y);
        var figure = $gameMap.event(apparitionId);
        if (figure) figure.setOpacity(0);
        if (window.KudasaiCheckpoints) KudasaiCheckpoints.set($gamePlayer.x, $gamePlayer.y, $gamePlayer.direction());
        if (!bossDefeated() && $dataMap.autoplayBgm) AudioManager.playBgm($dataMap.bgm);
    }
    function startBossEnding(boss) {
        if (!inCave() || boss.eventId() !== bossId || ending) return false;
        AudioManager.stopBgm();
        boss.turnTowardCharacter($gamePlayer);
        ending = {
            stage: 'READY', time: 0, clock: 0, unsealed: false,
            x: boss.x, y: boss.y, realX: boss._realX, realY: boss._realY,
            direction: boss.direction()
        };
        $gameTemp.clearDestination();
        $gameTemp.reserveCommonEvent(6);
        return true;
    }
    function finishDemo() {
        $gameSelfSwitches.setValue([mapId, bossId, 'B'], true);
        if (window.KudasaiCheckpoints) {
            KudasaiCheckpoints.set($gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), true);
        }
    }
    window.KudasaiCave = {
        exitBlocked: exitBlocked, finishArrival: finishArrival, finishDemo: finishDemo,
        startBossEnding: startBossEnding, isEnding: isEnding
    };

    function faceFallSite() {
        var dx = ending.x - $gamePlayer.x, dy = ending.y - $gamePlayer.y;
        if (Math.abs(dx) > Math.abs(dy)) $gamePlayer.setDirection(dx > 0 ? 6 : 4);
        else if (dy) $gamePlayer.setDirection(dy > 0 ? 2 : 8);
    }
    function setEndingStage(stage) {
        ending.stage = stage;
        ending.time = 0;
    }
    function endingCommand(interpreter, stage) {
        if (!isEnding()) return;
        var player = $gamePlayer;
        setEndingStage(stage);
        switch (stage) {
        case 'FALL':
            player.center((player.x + ending.x) / 2, (player.y + ending.y) / 2);
            faceFallSite();
            break;
        case 'SCATTER':
            ending.releaseAngle = ending.clock * .035;
            break;
        case 'GATE_VIEW':
            player.center(31, 49);
            break;
        case 'GATE':
            ending.unsealed = true;
            break;
        case 'BACK':
            player.center(player.x, player.y);
            break;
        case 'PICKUP':
        case 'WALK':
            interpreter.setWaitMode('kudasaiMikuMovement');
            ending.steps = 0;
            break;
        case 'LOOK_BACK':
            faceFallSite();
            break;
        case 'RESUME':
            ending = null;
            break;
        }
    }
    function updateEnding() {
        ending.clock++;
        ending.time++;
        var player = $gamePlayer;
        if (ending.stage === 'PICKUP' && !player.isMoving()) {
            var near = $gameMap.distance(player.x, player.y, ending.x, ending.y) <= 1;
            var toward = near ? 0 : player.findDirectionTo(ending.x, ending.y);
            if (toward && ending.steps < 8 && player.canPass(player.x, player.y, toward)) {
                ending.steps++;
                player.moveStraight(toward);
            } else {
                faceFallSite();
                setEndingStage('TAKE');
            }
        }
        if (ending.stage === 'WALK' && !player.isMoving()) {
            var direction = player.findDirectionTo(31, 49);
            if (direction && ending.steps < 2 && player.canPass(player.x, player.y, direction)) {
                ending.steps++;
                player.moveStraight(direction);
            } else setEndingStage('WALKED');
        }
    }
    var waitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function () {
        if (this._waitMode === 'kudasaiMikuMovement') {
            if (isEnding() && (ending.stage === 'PICKUP' || ending.stage === 'WALK' ||
                (ending.stage === 'TAKE' && ending.time < 28))) return true;
            this._waitMode = '';
            return false;
        }
        return waitMode.apply(this, arguments);
    };
    var fastForward = Scene_Map.prototype.isFastForward;
    Scene_Map.prototype.isFastForward = function () {
        return !isEnding() && fastForward.apply(this, arguments);
    };

    var isTransparent = Game_Event.prototype.isTransparent;
    Game_Event.prototype.isTransparent = function () {
        if (inCave()) {
            if (this.eventId() === stairId && bossDefeated()) return true;
            if ($gameSwitches.value(22) && this._kabs) return true;
        }
        return isTransparent.apply(this, arguments);
    };
    var normalPriority = Game_Event.prototype.isNormalPriority;
    Game_Event.prototype.isNormalPriority = function () {
        var id = this.eventId();
        return (this._mapId === mapId && id >= 7 && id <= 9 && exitBlocked()) || normalPriority.apply(this, arguments);
    };

    var command = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (name, args) {
        command.apply(this, arguments);
        if (name !== 'KudasaiCave' || !inCave()) return;
        var stage = args[0];
        if (stage === 'ENDING') {
            endingCommand(this, args[1]);
            return;
        }
        if (stage === 'EXIT') {
            if (exitBlocked() || isEnding()) return;
            if (bossDefeated() && !$gameSelfSwitches.value([mapId, bossId, 'B'])) {
                var stack = $gameSystem._kabsReturnStack;
                if (stack && stack.length) stack.pop();
                else if ($gameSystem._kabsCaveReturn) delete $gameSystem._kabsCaveReturn;
                else delete $gameSystem._kabsReturn;
                delete $gameSystem._kabsReturnGuard;
                this.setupChild($dataCommonEvents[demoExitEventId].list, this.eventId());
                return;
            }
            this.pluginCommand('KudasaiABS', ['RETURN']);
            if (!$gamePlayer.isTransferring()) {
                $gamePlayer.reserveTransfer(8, 24, 14, 2, 0);
                this.setWaitMode('transfer');
            }
            return;
        }
        var figure = $gameMap.event(apparitionId);
        cue = { stage: stage, time: 0 };
        if (stage === 'OPEN') {
            figure.setOpacity(0);
            $gamePlayer.setOpacity(0);
            $gamePlayer.setTransparent(false);
        } else if (stage === 'COLLAPSE') {
            cue.x = $gameMap.displayX();
            cue.y = $gameMap.displayY();
            figure.setPattern(2);
            seal();
        }
    };

    function smooth(n) {
        n = Math.max(0, Math.min(1, n));
        return n * n * (3 - 2 * n);
    }
    var characterFrame = Sprite_Character.prototype.updateFrame;
    Sprite_Character.prototype.updateFrame = function () {
        characterFrame.apply(this, arguments);
        var pose = this._kudasaiCaveSlam;
        if (pose) pose.visible = false;
        if (!cue || cue.stage !== 'COLLAPSE' || cue.time >= 24 ||
            !inCave() || this._character !== $gameMap.event(apparitionId)) return;
        if (!pose) {
            pose = new Sprite(ImageManager.loadCharacter('Kudasai_Miku_Ataques'));
            pose.anchor.set(.5, 1);
            this.addChild(pose);
            this._kudasaiCaveSlam = pose;
        }
        if (!pose.bitmap.isReady()) return;
        var column = cue.time < 7 ? 0 : cue.time < 15 ? 1 : 2;
        pose.setFrame(column * 96, 0, 96, 96);
        pose.visible = true;
        this.setFrame(0, 0, 0, 0);
    };
    var mapSetup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function (id) {
        cue = null;
        ending = null;
        preparedBgm = null;
        mapSetup.apply(this, arguments);
        if (id === mapId) this._kudasaiCaveLayout = 2;
    };
    var reload = Scene_Load.prototype.reloadMapIfUpdated;
    Scene_Load.prototype.reloadMapIfUpdated = function () {
        if (inCave() && $gameMap._kudasaiCaveLayout !== 2) {
            $gamePlayer.reserveTransfer(mapId, 31, 35, 8, 0);
            $gamePlayer.requestMapReload();
        } else reload.apply(this, arguments);
    };
    var autoplay = Game_Map.prototype.autoplay;
    Game_Map.prototype.autoplay = function () {
        if (this.mapId() !== mapId || !caveMusicPaused()) return autoplay.apply(this, arguments);
        AudioManager.stopBgm();
        if ($dataMap.autoplayBgs) AudioManager.playBgs($dataMap.bgs);
    };
    var createAudioBuffer = AudioManager.createBuffer;
    AudioManager.createBuffer = function (folder, name) {
        // Reuse the buffer decoded silently during the introduction.
        if (folder === 'bgm' && inCave() && preparedBgm && name === preparedBgm.name) {
            var buffer = preparedBgm.buffer;
            preparedBgm = null;
            if (!buffer.isError()) return buffer;
        }
        return createAudioBuffer.apply(this, arguments);
    };
    var startMap = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        startMap.apply(this, arguments);
        if (!inCave()) return;
        if ($gameSwitches.value(22) && !bossDefeated() && $dataMap.autoplayBgm &&
            $dataMap.bgm.name && !AudioManager.shouldUseHtml5Audio() && !preparedBgm) {
            var name = $dataMap.bgm.name;
            preparedBgm = { name: name, buffer: AudioManager.createBuffer('bgm', name) };
        }
        // Old saves in the cave can restore the previous map music.
        if (!this._transfer) {
            if (caveMusicPaused()) AudioManager.stopBgm();
            else if ($dataMap.autoplayBgm) AudioManager.playBgm($dataMap.bgm);
        }
        if ($gameSwitches.value(22) || !window.KudasaiCheckpoints) return;
        var completed = $gameSelfSwitches.value([mapId, introId, 'A']);
        if (completed && !KudasaiCheckpoints.has()) {
            KudasaiCheckpoints.set(31, 33, 8, true);
        }
    };
    var updateMap = Game_Map.prototype.update;
    Game_Map.prototype.update = function () {
        updateMap.apply(this, arguments);
        if (isEnding()) updateEnding();
        if (!cue || !inCave()) return;
        var t = ++cue.time, figure = this.event(apparitionId);
        if (cue.stage === 'OPEN') {
            $gamePlayer.setOpacity(Math.round(255 * smooth(t / 55)));
        } else if (cue.stage === 'EMERGE') {
            figure.setOpacity(Math.round(255 * smooth(t / 35)));
            if (t === 11) figure.moveStraight(2);
        } else if (cue.stage === 'AURA') {
            figure.setOpacity(Math.round(235 + Math.sin(t * .3) * 20));
            figure.setPattern(Math.floor(t / 5) % 3);
        } else if (cue.stage === 'COLLAPSE') {
            var pan = smooth(t / 25) * (1 - smooth((t - 55) / 32));
            this.setDisplayPos(cue.x, cue.y + pan * 10.6);
            if (t === 28) {
                $gameScreen.startShake(6, 7, 31);
                AudioManager.playSe({name:'Collapse4',volume:72,pitch:76,pan:0});
            }
        } else if (cue.stage === 'RETREAT') {
            if (t === 1 || t === 17) figure.moveStraight(8);
            figure.setOpacity(Math.round(255 * (1 - smooth(t / 40))));
        }
    };

    function rayBitmap() {
        var b = new Bitmap(212, 234), c = b._context;
        var glow = c.createRadialGradient(108, 182, 4, 108, 182, 77);
        glow.addColorStop(0, 'rgba(255,221,160,.39)');
        glow.addColorStop(1, 'rgba(255,219,147,0)');
        c.save(); c.translate(0, 86); c.scale(1, .53);
        c.fillStyle = glow; c.fillRect(24, 103, 170, 154); c.restore();
        var light = c.createLinearGradient(0, 0, 0, 217);
        light.addColorStop(0, 'rgba(255,229,173,0)');
        light.addColorStop(.13, 'rgba(255,230,179,.35)');
        light.addColorStop(.7, 'rgba(255,232,185,.12)');
        light.addColorStop(1, 'rgba(255,232,185,0)');
        c.filter = 'blur(5px)';
        c.fillStyle = light;
        [[52,60,150,55],[70,77,176,83],[85,91,191,115]].forEach(function (v) {
            c.beginPath(); c.moveTo(v[0], 0); c.lineTo(v[1], 0);
            c.lineTo(v[2], 208); c.lineTo(v[3], 208); c.closePath(); c.fill();
        });
        c.filter = 'none';
        b._setDirty();
        return b;
    }
    function rubbleBitmap() {
        var b = new Bitmap(180, 98), c = b._context;
        c.fillStyle = 'rgba(6,7,18,.75)';
        c.beginPath(); c.ellipse(90, 81, 83, 15, 0, 0, Math.PI * 2); c.fill();
        for (var i = 0; i < 17; i++) {
            var x = 13 + (i * 41) % 148, y = 48 + (i * 19) % 37;
            var size = 11 + i % 5 * 3;
            c.beginPath(); c.moveTo(x - size, y); c.lineTo(x - size * .6, y - size);
            c.lineTo(x + size * .35, y - size * 1.28); c.lineTo(x + size, y - size * .25);
            c.lineTo(x + size * .4, y + 4); c.closePath();
            c.fillStyle = i % 2 ? '#343247' : '#4b465e'; c.fill();
            c.lineWidth = 2; c.strokeStyle = '#1c192c'; c.stroke();
            c.beginPath(); c.moveTo(x - size * .6, y - size); c.lineTo(x + size * .35, y - size * 1.28);
            c.strokeStyle = '#6a637b'; c.stroke();
        }
        b._setDirty();
        return b;
    }
    function stairBitmap() {
        var b = new Bitmap(78, 42), c = b._context;
        b.smooth = false;
        // Steps narrow into the opening. Stone lips keep each tread legible in the dark.
        c.fillStyle = 'rgba(10,9,20,.58)';
        c.fillRect(0, 4, 78, 31);
        c.fillRect(7, 35, 64, 5);
        c.fillStyle = '#171726';
        c.fillRect(3, 2, 72, 32);
        var treads = ['#918995', '#7b7485', '#706a7f', '#625d72', '#534b63', '#453d55', '#382f45'];
        for (var i = 0; i < treads.length; i++) {
            var x = 7 + i * 2, y = 4 + i * 5, w = 78 - 2 * x;
            c.fillStyle = '#1d192b';
            c.fillRect(x - 4, y, w + 8, 6);
            c.fillStyle = treads[i];
            c.fillRect(x, y, w, 4);
            c.fillStyle = i < 3 ? '#aaa1a2' : '#857586';
            c.fillRect(x, y, w, 1);
            c.fillStyle = '#302839';
            c.fillRect(x, y + 4, w, 1);
            c.fillStyle = 'rgba(30,23,40,.28)';
            c.fillRect(x + Math.floor(w * (.24 + (i % 3) * .18)), y + 1, 1, 3);
            c.fillStyle = 'rgba(235,212,189,.32)';
            c.fillRect(x + (i * 7 + 11) % (w - 5), y + 2, 4, 1);
        }
        b._setDirty();
        return b;
    }
    var lower = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function () {
        lower.apply(this, arguments);
        if (!inCave() || !this._kudasaiParallax || $gameMap.parallaxName() !== caveGroundName) return;
        // This image covers the entire cave. Drawing it directly avoids
        // passing the scrolling offset through PIXI's repeating shader.
        this._kudasaiCaveGround = new Sprite(ImageManager.loadParallax(caveGroundName));
        this._baseSprite.addChildAt(this._kudasaiCaveGround, this._baseSprite.getChildIndex(this._parallax));
        this._parallax.visible = false;
        this.updateParallax();
    };
    var updateParallax = Spriteset_Map.prototype.updateParallax;
    Spriteset_Map.prototype.updateParallax = function () {
        var ground = this._kudasaiCaveGround;
        if (!ground) return updateParallax.apply(this, arguments);
        ground.visible = $gameMap.parallaxName() === caveGroundName;
        this._parallax.visible = !ground.visible;
        if (!ground.visible) return updateParallax.apply(this, arguments);
        ground.position.set(-Math.round($gameMap.parallaxOx()), -Math.round($gameMap.parallaxOy()));
    };
    var upper = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function () {
        upper.apply(this, arguments);
        var match = /<KudasaiCaveRays:(\[[^\n>]+\])>/.exec($dataMap.note || '');
        if (!inCave() || !match) return;
        var ray = rayBitmap();
        this._kudasaiCaveRays = JSON.parse(match[1]).map(function (point, index) {
            var sp = new Sprite(ray);
            sp.anchor.set(.5, 0);
            sp.scale.x = index % 2 ? -1 : 1;
            sp.blendMode = PIXI.BLEND_MODES.ADD;
            sp._world = point;
            this._baseSprite.addChild(sp);
            return sp;
        }, this);
        this._kudasaiCaveStair = new Sprite(stairBitmap());
        this._kudasaiCaveStair.anchor.set(.5);
        this._kudasaiCaveStair.scale.set(2);
        this._kudasaiCaveStair.visible = false;
        this._kudasaiCaveStair.z = 1;
        this._tilemap.addChild(this._kudasaiCaveStair);
        this._kudasaiCaveRubble = new Sprite(rubbleBitmap());
        this._kudasaiCaveRubble.anchor.set(.5, .77);
        this._baseSprite.addChild(this._kudasaiCaveRubble);
        this._kudasaiCaveDust = new PIXI.Graphics();
        this._baseSprite.addChild(this._kudasaiCaveDust);
        this._kudasaiCaveFx = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._kudasaiCaveFx.visible = false;
        this._baseSprite.addChild(this._kudasaiCaveFx);
    };
    function world(x, y) {
        return [$gameMap.adjustX(x) * $gameMap.tileWidth(), $gameMap.adjustY(y) * $gameMap.tileHeight()];
    }
    function aura(ctx, point, t, strength, portal) {
        var x = point[0], y = point[1], r = portal ? 52 : 61;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, portal ? .38 : .74);
        var glow = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
        glow.addColorStop(0, 'rgba(156,73,248,' + strength * .46 + ')');
        glow.addColorStop(1, 'rgba(90,29,162,0)');
        ctx.fillStyle = glow; ctx.fillRect(-r, -r, r * 2, r * 2);
        for (var i = 0; i < 22; i++) {
            var a = i * 2.4 + t * .035, d = r * (.35 + (i % 8) / 13);
            ctx.fillStyle = i % 4 ? 'rgba(164,111,231,' + strength * .56 + ')' : 'rgba(231,185,255,' + strength * .8 + ')';
            ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d - ((i * 9 + t) % 22), 2 + i % 2, 2 + i % 2);
        }
        ctx.restore();
    }
    function bossFeet() { return world(ending.realX + .5, ending.realY + .88); }
    function updateEndingBody(spriteset) {
        var body = spriteset._kudasaiMikuBody;
        if (!body && isEnding()) {
            body = new Sprite(ImageManager.loadCharacter('Kudasai_Miku_Ataques'));
            body.anchor.set(.5, 1);
            body.z = 3;
            spriteset._tilemap.addChild(body);
            spriteset._kudasaiMikuBody = body;
        }
        if (!body) return;
        body.visible = isEnding() && ['READY', 'FALL', 'KNEEL', 'CRACK', 'ORBIT'].indexOf(ending.stage) >= 0;
        if (!body.visible || !body.bitmap.isReady()) return;
        var t = ending.time, stage = ending.stage, dir = ending.direction;
        var row = dir === 2 ? 0 : dir === 8 ? 2 : 1;
        var frame = stage === 'READY' || stage === 'FALL' ? 0 : stage === 'KNEEL' && t < 13 ? 1 : 2;
        var feet = bossFeet();
        var strain = stage === 'CRACK' ? 2.3 : stage === 'FALL' ? 1.4 : .3;
        var burst = stage === 'ORBIT' ? smooth(t / 16) : 0;
        body.setFrame(frame * 96, row * 96, 96, 96);
        body.position.set(feet[0] + Math.sin(t * 1.8) * strain, feet[1]);
        body.scale.set((dir === 4 ? -1 : 1) * (1 + burst * .19), 1 - burst * .23);
        body.opacity = 255 * (1 - burst);
    }
    function glow(ctx, x, y, radius, core, edge) {
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, core);
        gradient.addColorStop(1, edge);
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    function drawCracks(ctx, x, y, time) {
        var charge = smooth(time / 38);
        aura(ctx, [x, y + 10], time, .4 + charge * .56, false);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = (.35 + charge * .65) * (.87 + Math.sin(time * .6) * .13);
        ctx.shadowColor = '#be58ff';
        ctx.shadowBlur = 5 + charge * 10;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#edbaff';
        ctx.beginPath();
        ctx.moveTo(-17, -4); ctx.lineTo(-9, 1); ctx.lineTo(-5, 10); ctx.lineTo(5, 5);
        ctx.lineTo(10, 8); ctx.lineTo(18, -1);
        ctx.moveTo(-5, 10); ctx.lineTo(-1, 16); ctx.lineTo(8, 19);
        ctx.moveTo(5, 5); ctx.lineTo(3, -4); ctx.lineTo(11, -9);
        ctx.stroke();
        ctx.restore();
    }
    function drawShard(ctx, x, y, size, angle, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = opacity;
        glow(ctx, 0, 0, size * 2.4, 'rgba(194,90,255,.7)', 'rgba(82,23,153,0)');
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * .55, 0);
        ctx.lineTo(size * .15, size * .88); ctx.lineTo(-size * .55, size * .18);
        ctx.closePath();
        ctx.fillStyle = '#54207c'; ctx.fill();
        ctx.strokeStyle = '#de9eff'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * .15, size * .88); ctx.lineTo(-size * .29, 0);
        ctx.closePath(); ctx.fillStyle = '#bb76f6'; ctx.fill();
        ctx.fillStyle = '#fff1ff'; ctx.fillRect(-1, -size * .65, 2, size * .45);
        ctx.restore();
    }
    function drawBurst(ctx, x, y, time) {
        var age = smooth(time / 47), opacity = 1 - age, radius = 38 + age * 172;
        ctx.save();
        ctx.globalAlpha = opacity;
        glow(ctx, x, y, radius, 'rgba(15,3,28,.96)', 'rgba(68,13,104,0)');
        glow(ctx, x, y, radius * .53, 'rgba(215,128,255,.78)', 'rgba(91,27,160,0)');
        ctx.strokeStyle = '#ad62ee'; ctx.lineWidth = 1 + opacity * 5;
        ctx.beginPath();
        ctx.ellipse(x, y + 18, radius, radius * .49, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (var i = 0; i < 23; i++) {
            var a = i * 2.4, r = radius * (.3 + (i % 7) * .12);
            ctx.fillStyle = i % 3 ? '#6d32a6' : '#eac3ff';
            ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * .8, 2 + i % 4, 2);
        }
        ctx.restore();
    }
    function drawEchoes(ctx, body, player) {
        var scattering = ending.stage === 'SCATTER', t = ending.time;
        var rotation = scattering ? ending.releaseAngle : ending.clock * .035;
        var gather = scattering ? 1 : smooth(t / 34);
        for (var i = 0; i < 9; i++) {
            var angle = i * Math.PI * 2 / 9 + rotation;
            var dx = Math.cos(angle), dy = Math.sin(angle);
            var x = body[0] + (player[0] + dx * 97 - body[0]) * gather;
            var y = body[1] + (player[1] + dy * 49 - body[1]) * gather;
            if (!scattering) {
                drawShard(ctx, x, y, 9 + i % 3, angle, .65 + .35 * gather);
                continue;
            }
            var flight = Math.min(1, t / (31 + i % 3 * 7));
            var distance = flight * flight * (192 + i % 4 * 27);
            x += dx * distance;
            y += dy * distance * .7;
            if (flight < 1) {
                ctx.save();
                ctx.globalAlpha = (1 - flight) * .8;
                ctx.strokeStyle = '#b168f6'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x - dx * (17 + distance * .26), y - dy * (12 + distance * .18));
                ctx.lineTo(x, y); ctx.stroke();
                ctx.restore();
                drawShard(ctx, x, y, 10, angle + flight * 2, 1 - flight * .38);
            } else {
                var flash = 1 - smooth((t - (31 + i % 3 * 7)) / 14);
                glow(ctx, x, y, 19 + 12 * (1 - flash), 'rgba(235,178,255,' + flash + ')', 'rgba(127,52,198,0)');
            }
        }
    }
    function drawEnding(ctx, stone) {
        var stage = ending.stage, t = ending.time, feet = bossFeet();
        var body = [feet[0], feet[1] - 28];
        var player = world($gamePlayer._realX + .5, $gamePlayer._realY + .38);
        if (stage === 'KNEEL') {
            for (var i = 0; i < 12; i++) {
                var age = (t + i * 11) % 53;
                var x = body[0] + Math.sin(i * 2.4) * (18 + age * .52);
                var y = body[1] + (i % 3) * 5 - age * .64;
                ctx.fillStyle = 'rgba(220,170,255,' + (1 - age / 53) * .78 + ')';
                ctx.fillRect(x, y, 2 + i % 2, 2);
            }
        }
        if (stage === 'CRACK') drawCracks(ctx, body[0], body[1], t);
        if (stage === 'ORBIT' && t < 47) drawBurst(ctx, body[0], body[1], t);
        if (stage === 'ORBIT' || stage === 'SCATTER') drawEchoes(ctx, body, player);
        if (stage === 'CRYSTAL' || stage === 'PICKUP' || stage === 'TAKE' && t < 28) {
            var lift = stage === 'TAKE' ? smooth(t / 24) : 0;
            var shimmer = .78 + Math.sin(ending.clock * .12) * .22;
            drawShard(ctx, feet[0] + (player[0] - feet[0]) * lift,
                feet[1] - 4 + (player[1] - feet[1] + 4) * lift,
                9 - lift * 3, -.23 + lift, shimmer * (1 - smooth((lift - .66) / .34)));
        }
        if (stage === 'GATE') {
            var reveal = smooth(t / 68);
            var sx = stone[0], sy = stone[1];
            ctx.save();
            ctx.globalAlpha = reveal * .85;
            ctx.translate(sx, sy);
            ctx.scale(.82, .54);
            glow(ctx, 0, 15, 122, 'rgba(255,228,176,.78)', 'rgba(252,184,105,0)');
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = Math.sin(reveal * Math.PI) * .9;
            for (var j = 0; j < 19; j++) {
                ctx.fillStyle = j % 3 ? '#ae70d8' : '#efc5ff';
                ctx.fillRect(sx + Math.sin(j * 2.4) * (44 + reveal * 43),
                    sy - (j * 9 % 40) - reveal * 56, 2 + j % 3, 2);
            }
            ctx.restore();
        }
    }
    var update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        update.apply(this, arguments);
        if (!this._kudasaiCaveFx) return;
        updateEndingBody(this);
        var frame = Graphics.frameCount;
        this._kudasaiCaveRays.forEach(function (ray, i) {
            var p = world(ray._world[0], ray._world[1]);
            ray.position.set(p[0], p[1]);
            ray.opacity = 189 + Math.sin(frame * .017 + i * 2.2) * 18;
        });
        var stone = world(31.5, 50.55);
        this._kudasaiCaveStair.position.set(stone[0], stone[1] + 3);
        this._kudasaiCaveStair.visible = isEnding() ? ending.unsealed : bossDefeated();
        this._kudasaiCaveRubble.position.set(stone[0], stone[1]);
        var opening = isEnding() && ending.stage === 'GATE';
        this._kudasaiCaveRubble.opacity = opening ? 255 * (1 - smooth(ending.time / 62)) : 255;
        this._kudasaiCaveRubble.visible = exitBlocked() || opening;
        var fx = this._kudasaiCaveFx;
        var wasVisible = fx.visible;
        fx.visible = !!cue || isEnding();
        if (frame % 2 && (wasVisible || !fx.visible)) return;
        var dust = this._kudasaiCaveDust;
        dust.clear();
        dust.beginFill(0xffe7b7, .42);
        this._kudasaiCaveRays.forEach(function (ray, i) {
            for (var j = 0; j < 12; j++) {
                var y = (j * 31 + frame * .36 + i * 11) % 179;
                var x = ray.x + (ray.scale.x < 0 ? -1 : 1) * (y * .17 + Math.sin(j * 7 + frame * .016) * 27);
                dust.drawRect(x, ray.y + y + 13, j % 4 ? 1 : 2, 1);
            }
        });
        dust.endFill();
        // Reserve full-screen bitmap uploads for the actual cinematic effects.
        if (!fx.visible) return;
        var b = fx.bitmap, ctx = b._context;
        b.clear();
        if (cue) {
            var t = cue.time, figure = $gameMap.event(apparitionId);
            var actor = world($gamePlayer._realX + .5, $gamePlayer._realY + .85);
            var body = world(figure._realX + .5, figure._realY + .5);
            if (cue.stage === 'OPEN' && t < 110) aura(ctx, actor, t, 1 - smooth((t - 48) / 62), true);
            if (cue.stage === 'EYES') {
                aura(ctx, body, t, .52, false);
                ctx.save(); ctx.shadowColor = '#e152ff'; ctx.shadowBlur = 9;
                ctx.fillStyle = '#ffc6e9'; ctx.globalAlpha = .72 + Math.sin(t * .15) * .27;
                ctx.fillRect(body[0] - 11, body[1] - 16, 5, 3);
                ctx.fillRect(body[0] + 6, body[1] - 16, 5, 3);
                ctx.restore();
            }
            if (cue.stage === 'EMERGE' || cue.stage === 'AURA' || cue.stage === 'RETREAT') {
                var strength = cue.stage === 'AURA' ? .93 : cue.stage === 'RETREAT' ? 1 - smooth(t / 44) : .7 - smooth(t / 48) * .46;
                aura(ctx, body, t, strength, false);
            }
            if (cue.stage === 'COLLAPSE' && t > 16 && t < 78) {
                ctx.fillStyle = 'rgba(179,162,171,' + (1 - smooth((t - 29) / 49)) * .41 + ')';
                for (var k = 0; k < 21; k++) {
                    var x = stone[0] - 80 + (k * 23) % 160;
                    var y = stone[1] - ((k * 7 + t * 3) % 69);
                    ctx.fillRect(x, y, 3 + k % 7, 2 + k % 4);
                }
            }
        }
        if (isEnding()) drawEnding(ctx, stone);
        b._setDirty();
    };
}());
