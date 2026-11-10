/*:
 * @plugindesc v1.2 Arboles con brisa suave y visible, raiz fija y limpieza al salir del mapa. MV.
 * @author Gstv_
 *
 * @param Amplitude
 * @text Movimiento de la copa (px)
 * @type number
 * @decimals 2
 * @min 0
 * @max 3
 * @default 2.4
 *
 * @param Period
 * @text Segundos por balanceo
 * @type number
 * @decimals 2
 * @min 3
 * @max 30
 * @default 5
 *
 * @param AutoDetect
 * @text Detectar arboles del tileset
 * @type boolean
 * @default true
 *
 * @param TreePatterns
 * @text Rectangulos de arboles (JSON)
 * @type string
 * @default [{"sheet":"Outside_B","x":0,"y":14,"w":2,"h":2}]
 *
 * @help
 * KudasaiFoliage map note: local patterns with bounds, amplitude and period.
 * Low foliage uses the same anchored sway and clean parallax as trees.
 * fixedBase splits foliage from a stationary pot/planter; anchorTop fixes hanging hooks.
 * Colocar DESPUES de Kudasai_Parallax y ANTES de Kudasai_Display.
 * Los arboles verdes de 2x2 de Outside_B se detectan automaticamente.
 * Solo se reemplazan arboles completos: no se animan trozos sueltos.
 * No modifica mapas, flags, colisiones, partidas ni imagenes originales.
 * Compatible con WebGL y Canvas de RPG Maker MV 1.6 / NW.js 0.29.
 *
 * Para graficos propios como eventos, escribir en las notas del evento
 * o en un comentario de la pagina activa:
 *   <AnimatedTree>       usa el movimiento predeterminado
 *   <AnimatedTree:0.8>   usa 0.8 px en la copa
 *   <AnimatedTree:off>   desactiva esta pagina
 * Usar un grafico de arbol completo, anclado abajo como un personaje.
 *
 * Notas del mapa (opcionales):
 *   <TreeSway:0.8>   movimiento de 0.8 px para este mapa
 *   <TreeSway:off>   brisa desactivada en este mapa
 *
 * Comandos de plugin:
 *   KudasaiTrees OFF          detener suavemente
 *   KudasaiTrees ON           reactivar suavemente
 *   KudasaiTrees STRENGTH 0.8 movimiento global (0 a 3 px)
 *   KudasaiTrees PERIOD 8     segundos por balanceo (3 a 30)
 *   KudasaiTrees RESET        recuperar parametros del plugin
 * Los comandos persisten en la partida. Funcionan en partidas antiguas.
 *
 * TreePatterns describe rectangulos en casillas de la imagen del tileset:
 * [{"sheet":"Outside_B","x":0,"y":14,"w":2,"h":2}]
 * x/y parten de 0. sheet es el nombre del PNG sin extension.
 * Admite hojas B/C/D/E de 16x16 casillas, no autotiles A.
 * Cada rectangulo debe contener UN arbol completo y ningun otro objeto.
 *
 * Con Kudasai_Parallax se limpia una copia temporal del fondo validado,
 * redibujando el terreno bajo los arboles desde los tiles originales.
 * Las sombras, niebla e iluminacion mantienen sus capas.
 * El efecto es 2D; el renderizador especial de dialogos 3D es independiente.
 * Manual: docs/Kudasai_AnimatedTrees.md
 */
(function () {
    'use strict';

    var params = PluginManager.parameters('Kudasai_AnimatedTrees');
    function bounded(value, fallback, min, max) {
        var number = Number(value);
        return isFinite(number) && value !== '' && value != null ?
            Math.max(min, Math.min(max, number)) : fallback;
    }
    var amplitude = bounded(params.Amplitude, 2.4, 0, 3);
    var period = bounded(params.Period, 5, 3, 30);
    var automatic = params.AutoDetect !== 'false';
    var defaults = [{ sheet: 'Outside_B', x: 0, y: 14, w: 2, h: 2 }];
    var patterns;
    try {
        patterns = JSON.parse(params.TreePatterns || JSON.stringify(defaults));
        if (!Array.isArray(patterns)) throw new Error('Expected an array');
        patterns = patterns.filter(function (p) {
            return p && typeof p.sheet === 'string' &&
                [p.x, p.y, p.w, p.h].every(function (n) {
                    return typeof n === 'number' && isFinite(n) && n === Math.floor(n);
                }) && p.x >= 0 && p.y >= 0 && p.w > 0 && p.h > 0 &&
                p.x + p.w <= 16 && p.y + p.h <= 16;
        });
    } catch (error) {
        console.warn('Kudasai_AnimatedTrees: TreePatterns invalido; se usa Outside_B.', error);
        patterns = defaults;
    }

    function settings() {
        // Lazy initialization also covers saves made before installing this plugin.
        if (!$gameSystem._kudasaiTrees) {
            $gameSystem._kudasaiTrees = { enabled: true, amplitude: amplitude, period: period, version: 2 };
        }
        var saved = $gameSystem._kudasaiTrees;
        if (!saved.version) {
            // Upgrade the original v1.0 preset, including existing saves.
            // Other strengths/periods and an explicit OFF remain unchanged.
            if (saved.amplitude === 1.2 && saved.period === 6.5) {
                saved.amplitude = amplitude;
                saved.period = period;
            }
            saved.version = 2;
        }
        return $gameSystem._kudasaiTrees;
    }
    function mapAmplitude() {
        var state = settings();
        var tag = ($dataMap.note || '').match(/<TreeSway\s*:\s*(off|[\d.]+)\s*>/i);
        if (!state.enabled || (tag && tag[1].toLowerCase() === 'off')) return 0;
        return tag ? bounded(tag[1], state.amplitude, 0, 3) : state.amplitude;
    }
    function wave(frame, seed) {
        var time = frame / (60 * settings().period) * Math.PI * 2;
        // Nearby trees share a breeze but do not move in perfect lockstep.
        return (Math.sin(time + seed * 0.55) * 0.85 +
            Math.sin(time * 0.63 + seed) * 0.15) * (0.85 + 0.15 * Math.sin(seed * 2.7));
    }
    // One shared wind curve for tree crowns, rooted foliage and local leaves.
    window.KudasaiTreeBreeze = wave;
    function approach(current, target) {
        var difference = target - current;
        return Math.abs(difference) < 0.001 ? target : current + difference / 45;
    }
    function shear(sprite, displacement, height) {
        // c = displacement/height, d = 1: horizontal sway without vertical scaling.
        // The bottom-center remains exactly at the same world coordinate.
        var angle = -Math.atan(displacement / Math.max(1, height));
        sprite.skew.x = angle;
        sprite.scale.y = 1 / Math.cos(angle);
    }
    function tileId(slot, x, y) {
        return (slot - 5) * 256 + Math.floor(x / 8) * 128 + y * 8 + x % 8;
    }

    function findTrees(map, tileset) {
        var result = [], used = {}, n = map.width * map.height;
        if (!automatic) return result;
        var localPatterns=[];var localNote=(map.note||'').match(/<KudasaiFoliage:(\{[^>]+\})>/);
        if(localNote){try{localPatterns=JSON.parse(localNote[1]).patterns||[];}catch(e){console.warn('KudasaiFoliage invalid',e);}}
        patterns.concat(localPatterns).forEach(function (pattern) {
            tileset.tilesetNames.forEach(function (name, slot) {
                if (slot < 5 || slot > 8 || name !== pattern.sheet) return;
                var first = tileId(slot, pattern.x, pattern.y);
                for (var y = 0; y <= map.height - pattern.h; y++) {
                    for (var x = 0; x <= map.width - pattern.w; x++) {
                        if(pattern.bounds&&(x<pattern.bounds[0]||y<pattern.bounds[1]||x+pattern.w>pattern.bounds[2]||y+pattern.h>pattern.bounds[3]))continue;
                        var cells = [], complete = true;
                        for (var dy = 0; dy < pattern.h && complete; dy++) {
                            for (var dx = 0; dx < pattern.w && complete; dx++) {
                                var id = tileId(slot, pattern.x + dx, pattern.y + dy);
                                var index = (y + dy) * map.width + x + dx;
                                var layer = -1;
                                for (var z = 3; z >= 0; z--) {
                                    if (map.data[z * n + index] === id && !used[z * n + index]) {
                                        layer = z;
                                        break;
                                    }
                                }
                                if (layer < 0) complete = false;
                                else cells.push({ index: layer * n + index, x: dx, y: dy, id: id });
                            }
                        }
                        if (complete && cells[0].id === first) {
                            cells.forEach(function (cell) { used[cell.index] = true; });
                            result.push({ x: x, y: y, w: pattern.w, h: pattern.h,
                                cells: cells, isFoliage:!!pattern.foliage, fixedBase:bounded(pattern.fixedBase,0,0,pattern.h*48), anchorTop:!!pattern.anchorTop, swayAmplitude:bounded(pattern.amplitude,1,0,1), swayPeriod:bounded(pattern.period,1,.5,6), seed: (x * 0.37 + y * 0.21) % (Math.PI * 2) });
                        }
                    }
                }
            });
        });
        return result;
    }

    function destroyBitmap(bitmap) {
        if (bitmap.__baseTexture) bitmap.__baseTexture.destroy();
        if (bitmap.__canvas) {
            bitmap.__canvas.width = 1;
            bitmap.__canvas.height = 1;
        }
    }
    function removeSprite(sprite) {
        if (sprite.parent) sprite.parent.removeChild(sprite);
        // Destroy each sprite's texture wrapper, never the shared bitmap here.
        sprite.destroy({ children: true, texture: true, baseTexture: false });
    }

    Spriteset_Map.prototype.clearKudasaiTrees = function () {
        var trees = this._kudasaiTrees;
        if (!trees) return;
        trees.records.forEach(function (tree) {
            tree.copies.forEach(function (copy) { copy.forEach(removeSprite); });
        });
        if (this._tilemap._mapData === trees.filtered) {
            this._tilemap.setData(trees.width, trees.height, trees.original);
            this._tilemap.refresh();
            this._tilemap._needsRepaint = true;
        }
        if (trees.cleanParallax && this._parallax.bitmap === trees.cleanParallax) {
            this._parallax.bitmap = trees.originalParallax;
        }
        trees.bitmaps.forEach(destroyBitmap);
        this._kudasaiTrees = null;
    };

    Spriteset_Map.prototype.buildKudasaiTrees = function () {
        var tilemap = this._tilemap;
        if (!tilemap || !this._tileset || !tilemap.isReady()) return false;
        if (this._kudasaiParallax && (!this._parallax.bitmap || !this._parallax.bitmap.isReady())) return false;
        var records = findTrees($dataMap, this._tileset);
        var state = { records: records, bitmaps: [], original: tilemap._mapData,
            source: $gameMap.data(), tileset: this._tileset, flags: tilemap.flags,
            width: tilemap._mapWidth, height: tilemap._mapHeight,
            gain: 0, frame: 0, filtered: null, cleanParallax: null };
        this._kudasaiTrees = state;
        if (!records.length) return true;

        var tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        var painter = Object.create(Tilemap.prototype);
        painter._tileWidth = tw;
        painter._tileHeight = th;
        painter.animationFrame = 0;
        painter.bitmaps = tilemap.bitmaps;
        painter.flags = tilemap.flags;
        var filtered = state.original.slice(), omitted = {}, bakedCells = {};
        var n = $dataMap.width * $dataMap.height;
        var owner = this;
        records.forEach(function (tree) {
            tree.lower = new Bitmap(tree.w * tw, tree.h * th);
            tree.upper = new Bitmap(tree.w * tw, tree.h * th);
            tree.lower.smooth = tree.upper.smooth = true;
            tree.hasLower = tree.hasUpper = false;
            tree.copies = [];
            state.bitmaps.push(tree.lower, tree.upper);
            tree.cells.forEach(function (cell) {
                var high = !!(tilemap.flags[cell.id] & 16);
                painter._drawTile(high ? tree.upper : tree.lower, cell.id, cell.x * tw, cell.y * th);
                if (high) tree.hasUpper = true;
                else tree.hasLower = true;
                omitted[cell.index] = true;
                if (!high && owner._kudasaiParallax && state.original[cell.index] === 0) {
                    bakedCells[cell.index % n] = true;
                }
                filtered[cell.index] = 0;
            });
            // Keep pots, baskets and planter bases still; only their foliage bends.
            if(tree.fixedBase>0){
                tree.lowerBase=new Bitmap(tree.w*tw,tree.h*th);
                tree.upperBase=new Bitmap(tree.w*tw,tree.h*th);
                tree.lowerBase.smooth=tree.upperBase.smooth=true;
                [tree.lowerBase,tree.upperBase].forEach(function(bitmap){state.bitmaps.push(bitmap);});
                [[tree.lower,tree.lowerBase],[tree.upper,tree.upperBase]].forEach(function(pair){
                    pair[1].blt(pair[0],0,tree.fixedBase,tree.w*tw,tree.h*th-tree.fixedBase,0,tree.fixedBase);
                    pair[0].clearRect(0,tree.fixedBase,tree.w*tw,tree.h*th-tree.fixedBase);
                });
            }
        });

        // The validated Kudasai bake contains non-star tiles. Rebuild only cells
        // containing baked tree pieces in a private copy, preserving all other art.
        var baked = Object.keys(bakedCells);
        if (baked.length) {
            var original = this._parallax.bitmap;
            var clean = new Bitmap(original.width, original.height);
            clean.smooth = original.smooth;
            clean.blt(original, 0, 0, original.width, original.height, 0, 0);
            baked.forEach(function (key) {
                var index = Number(key), x = index % $dataMap.width;
                var y = Math.floor(index / $dataMap.width);
                clean.clearRect(x * tw, y * th, tw, th);
                for (var z = 0; z < 4; z++) {
                    var pos = z * n + index, id = $dataMap.data[pos];
                    if (id && !omitted[pos] && !(tilemap.flags[id] & 16) && !Tilemap.isTileA1(id)) {
                        painter._drawTile(clean, id, x * tw, y * th);
                    }
                }
            });
            state.originalParallax = original;
            state.cleanParallax = clean;
            state.bitmaps.push(clean);
            this._parallax.bitmap = clean;
        }
        state.filtered = filtered;
        tilemap.setData($dataMap.width, $dataMap.height, filtered);
        tilemap.refresh();
        // MV's Canvas refresh clears the cache but does not request a redraw.
        tilemap._needsRepaint = true;
        return true;
    };

    function makeCopy(tree, tilemap) {
        var sprites = [];
        function add(bitmap, z, fixed) {
            var sprite = new Sprite(bitmap);
            var height=tree.h*$gameMap.tileHeight();
            sprite._ktFixed=!!fixed;
            sprite._ktRootOffset=fixed?height:tree.anchorTop?0:tree.fixedBase||height;
            sprite.anchor.set(0.5,sprite._ktRootOffset/height);
            sprite.z = z;
            tilemap.addChild(sprite);
            sprites.push(sprite);
        }
        if (tree.hasLower) {add(tree.lower, 0);if(tree.lowerBase)add(tree.lowerBase,0,true);}
        if (tree.hasUpper) {add(tree.upper, 4);if(tree.upperBase)add(tree.upperBase,4,true);}
        tree.copies.push(sprites);
        return sprites;
    }
    function positions(start, size, viewport, loop, extent) {
        if (!loop) return [start];
        var values = [];
        // Repeat enough times even if the viewport is wider than the looping map.
        start -= Math.floor((start + extent) / size) * size;
        for (var value = start; value < viewport + 3; value += size) values.push(value);
        return values;
    }
    Spriteset_Map.prototype.updateKudasaiTrees = function () {
        var tilemap = this._tilemap, state = this._kudasaiTrees;
        if (state && (state.tileset !== this._tileset || state.flags !== tilemap.flags ||
            state.source !== $gameMap.data() || tilemap._mapData !== (state.filtered || state.original))) {
            this.clearKudasaiTrees();
            state = null;
        }
        if (!state) {
            if (!this.buildKudasaiTrees()) return;
            state = this._kudasaiTrees;
        }
        state.frame++;
        state.gain = approach(state.gain, mapAmplitude());
        var tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        var ox = tilemap.origin.x, oy = tilemap.origin.y;
        if (!(tilemap instanceof ShaderTilemap) || tilemap.roundPixels) {
            ox = Math.floor(ox);
            oy = Math.floor(oy);
        }
        state.records.forEach(function (tree) {
            var w = tree.w * tw, h = tree.h * th;
            var xs = positions(tree.x * tw - ox, $gameMap.width() * tw,
                Graphics.width, $gameMap.isLoopHorizontal(), w);
            var ys = positions(tree.y * th - oy, $gameMap.height() * th,
                Graphics.height, $gameMap.isLoopVertical(), h);
            var index = 0, displacement = state.gain * tree.swayAmplitude * wave(state.frame / tree.swayPeriod, tree.seed);
            ys.forEach(function (y) {
                xs.forEach(function (x) {
                    var copy = tree.copies[index] || makeCopy(tree, tilemap);
                    index++;
                    var visible = x + w >= -3 && y + h >= -3 &&
                        x <= Graphics.width + 3 && y <= Graphics.height + 3;
                    copy.forEach(function (sprite) {
                        sprite.visible = visible;
                        sprite.x = x + w / 2;
                        sprite.y = y + sprite._ktRootOffset;
                        if (visible) shear(sprite, sprite._ktFixed?0:displacement, tree.fixedBase||h);
                    });
                });
            });
            while (tree.copies.length > index) tree.copies.pop().forEach(removeSprite);
        });
    };

    var update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        update.apply(this, arguments);
        this.updateKudasaiTrees();
        if (this.updateKudasaiGardenLeaves) this.updateKudasaiGardenLeaves();
    };
    var destroy = Spriteset_Map.prototype.destroy;
    Spriteset_Map.prototype.destroy = function () {
        this.clearKudasaiTrees();
        destroy.apply(this, arguments);
    };

    // MV removes the spriteset on menu/transfer but does not destroy it.
    // Release private canvases and GPU textures after its final snapshot.
    var terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () {
        terminate.apply(this, arguments);
        if (this._spriteset) this._spriteset.clearKudasaiTrees();
    };

    function eventAmplitude(character) {
        if (!(character instanceof Game_Event) || character._erased || !character.page()) return null;
        var text = character.event().note || '';
        character.list().forEach(function (command) {
            if (command.code === 108 || command.code === 408) text += '\n' + command.parameters[0];
        });
        var tags = text.match(/<AnimatedTree(?:\s*:\s*(?:off|[\d.]+))?\s*>/gi);
        if (!tags) return null;
        // Active page comments override the general event note.
        var match = tags[tags.length - 1].match(/:\s*(off|[\d.]+)/i);
        if (match && match[1].toLowerCase() === 'off') return 0;
        // -1 means follow the current map/global amplitude on every frame.
        return match ? bounded(match[1], amplitude, 0, 3) : -1;
    }
    var eventUpdate = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function () {
        if (this._ktShear) {
            this.skew.x -= this._ktShear.angle;
            this.scale.y /= this._ktShear.scale;
            this._ktShear = null;
        }
        eventUpdate.apply(this, arguments);
        var character = this._character;
        if (!(character instanceof Game_Event)) return;
        if (this._ktPage !== character.page() || this._ktNote !== character.event().note ||
            this._ktErased !== character._erased) {
            this._ktPage = character.page();
            this._ktNote = character.event().note;
            this._ktErased = character._erased;
            this._ktAmplitude = eventAmplitude(character);
        }
        if (this._ktAmplitude == null) return;
        var state = settings();
        var tagged = this._ktAmplitude < 0 ? mapAmplitude() : this._ktAmplitude;
        var target = state.enabled && mapAmplitude() > 0 ? tagged : 0;
        this._ktGain = approach(this._ktGain || 0, target);
        this._ktFrame = (this._ktFrame || 0) + 1;
        var height = this.patternHeight();
        if (!height || !this.visible) return;
        var angle = -Math.atan(this._ktGain * wave(this._ktFrame, character.eventId() * 0.79) / height);
        var scale = 1 / Math.cos(angle);
        this.skew.x += angle;
        this.scale.y *= scale;
        this._ktShear = { angle: angle, scale: scale };
    };

    var command = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (name, args) {
        command.apply(this, arguments);
        if (String(name).toLowerCase() !== 'kudasaitrees') return;
        var state = settings(), action = String(args[0] || '').toUpperCase();
        if (action === 'OFF') state.enabled = false;
        else if (action === 'ON') state.enabled = true;
        else if (action === 'STRENGTH') state.amplitude = bounded(args[1], state.amplitude, 0, 3);
        else if (action === 'PERIOD') state.period = bounded(args[1], state.period, 3, 30);
        else if (action === 'RESET') $gameSystem._kudasaiTrees = null;
    };
})();
