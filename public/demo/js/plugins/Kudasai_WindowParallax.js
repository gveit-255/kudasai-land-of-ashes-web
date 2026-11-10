/*:
 * @plugindesc Cristales con luz por horario y profundidad parallax, ajustados a cada ventana real.
 * @author Kudasai
 * @help
 * Cargar después de Kudasai_Casas_Guia. Consume Kudasai_WindowParallax.json.
 * No cambia mapas, colisiones, gráficos de casas ni hojas de personajes.
 * El desplazamiento se limita al interior del cristal: marcos y fachadas
 * permanecen fijos. Las máscaras excluyen madera, flores y divisiones.
 */
(function() {
    'use strict';
    window.$dataKudasaiWindowParallax = null;
    DataManager._databaseFiles.push({name:'$dataKudasaiWindowParallax',src:'Kudasai_WindowParallax.json'});
    var profiles = {
        day: {room:.075, reflection:.20, halo:.018, floor:.009, emission:.01, top:'#51718b', bottom:'#b6c9cb'},
        dusk: {room:.54, reflection:.12, halo:.065, floor:.09, emission:.26, top:'#a87940', bottom:'#f5cf8c'},
        night: {room:.90, reflection:.075, halo:.12, floor:.18, emission:.58, top:'#bb8849', bottom:'#ffe2a0'},
        interior: {room:.44, reflection:.20, halo:.018, floor:0, emission:.45, top:'#89abc6', bottom:'#e8f0e4'}
    };
    window.KudasaiWindowParallax = {version:1, profiles:profiles};
    function config() {
        var data = window.$dataKudasaiWindowParallax;
        if (!data || !$gameMap) return null;
        var c = data.maps[$gameMap.mapId()], model = c && data.models[c.model];
        return model && model.width === $gameMap.width() && model.height === $gameMap.height() ? {map:c, model:model} : null;
    }
    function legacyWindow(source, model) {
        if (!source || !model.houses.length || source.flicker) return false;
        if (source.kind) return source.kind === 'window';
        return model.houses.some(function(h) {
            return source.x >= h.x && source.x < h.right && source.y >= h.y && source.y <= h.foot;
        });
    }
    function suppressLegacy(set, model) {
        var lights = (set._kudasaiConfig || {}).lights || [], removed = 0;
        if (set._kudasaiTextures) set._kudasaiTextures = set._kudasaiTextures.filter(function(t,i) {
            var covered = legacyWindow(lights[i], model); if (covered) removed++; return !covered;
        });
        if (set._cinemaGlows) set._cinemaGlows = set._cinemaGlows.filter(function(sprite) {
            if (!legacyWindow(sprite._source, model)) return true;
            if (sprite.parent) sprite.parent.removeChild(sprite);
            sprite.bitmap = null; sprite.destroy({texture:false,baseTexture:false}); return false;
        });
        // The former pane layer also contains lamps: clear only its old window pixels.
        if (set._albaMood && model.houses.length) {
            var layer = set._albaMood.layers[set._albaMood.layers.length-1];
            if (layer && layer.bitmap) {
                var ctx = layer.bitmap._context;
                (($gameMap._kudasaiLighting || {}).lights || []).forEach(function(l) {
                    if (l.kind !== 'window') return;
                    ctx.clearRect(Math.floor(l.x)*48+15,(Math.floor(l.y)-1)*48+14,18,19);
                });
                layer.bitmap._setDirty(); set._albaMood.windows = 0;
            }
        }
        return removed;
    }
    function ownedBitmap(state,w,h) {
        var b = new Bitmap(w,h); b.smooth = false; state.bitmaps.push(b); return b;
    }
    function maskBitmap(state, window) {
        var b = ownedBitmap(state,window.width,window.height), c = b._context;
        c.fillStyle = '#fff'; window.runs.forEach(function(r) {c.fillRect(r[1],r[0],r[2],1);});
        b._setDirty(); return b;
    }
    function interiorCanvas(window,profile) {
        var canvas = document.createElement('canvas');
        canvas.width = window.width+12; canvas.height = window.height+12;
        var c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
        var g = c.createLinearGradient(0,0,0,h); g.addColorStop(0,profile.top); g.addColorStop(.65,profile.bottom); g.addColorStop(1,profile.bottom);
        c.fillStyle = g; c.fillRect(0,0,w,h);
        // Abstract, restrained room depth. The real mullions remain in the source art.
        c.fillStyle = 'rgba(53,41,42,.13)'; c.fillRect(Math.round(w*.12),0,Math.max(2,Math.round(w*.10)),h);
        c.fillStyle = 'rgba(76,47,35,.10)'; c.fillRect(Math.round(w*.80),0,Math.max(2,Math.round(w*.09)),h);
        c.fillStyle = 'rgba(71,48,36,.09)'; c.fillRect(Math.round(w*.28),Math.round(h*.81),Math.round(w*.43),Math.max(2,Math.round(h*.13)));
        return canvas;
    }
    function addWindow(set,state,w,index) {
        var mask = maskBitmap(state,w), pane = new Sprite(ownedBitmap(state,w.width,w.height));
        pane.x = w.x; pane.y = w.y; pane.z = 2.15;
        var haloBitmap = ownedBitmap(state,w.width+28,w.height+28), hc = haloBitmap._context;
        hc.shadowColor = '#ffc67b'; hc.shadowBlur = 7; hc.drawImage(mask._canvas,14,14);
        hc.globalCompositeOperation = 'source-in'; hc.fillStyle = '#ffd397'; hc.fillRect(0,0,haloBitmap.width,haloBitmap.height);
        hc.globalCompositeOperation = 'source-over'; haloBitmap._setDirty(); haloBitmap.smooth = true;
        var halo = new Sprite(haloBitmap); halo.x = w.x-14; halo.y = w.y-14;
        halo.blendMode = PIXI.BLEND_MODES.SCREEN; halo.opacity = Math.round(state.profile.halo*255); halo.z = 2.08;
        state.layer.addChild(halo); state.layer.addChild(pane);
        // Emitted light is composited after the ambient multiply. Its alpha is
        // still exactly the glass mask, so frames and flowers cannot be washed out.
        var emission=new Sprite(pane.bitmap);emission.x=w.x;emission.y=w.y;emission.opacity=Math.round(state.profile.emission*255);
        state.emissionLayer.addChild(emission);
        var rec = {window:w,mask:mask,pane:pane,halo:halo,emission:emission,room:interiorCanvas(w,state.profile),shift:null,redraws:0,index:index};
        state.records.push(rec);
    }
    function buildFloor(set,state) {
        if (!state.profile.floor || !state.model.houses.length) return;
        var scale = 2, bitmap = ownedBitmap(state,Math.ceil($gameMap.width()*48/scale),Math.ceil($gameMap.height()*48/scale));
        var c = bitmap._context;
        state.model.windows.forEach(function(w) {
            var x = (w.x+w.width/2)/scale, y = (w.foot+10)/scale;
            var rx = Math.min(48,16+w.width*.55)/scale, ry = Math.min(29,13+w.width*.20)/scale;
            c.save(); c.translate(x,y); c.scale(rx,ry);
            var g = c.createRadialGradient(0,0,0,0,0,1);
            for (var i=0;i<=16;i++) {var t=i/16;g.addColorStop(t,'rgba(255,195,112,'+(state.profile.floor*Math.pow(1-t*t,3))+')');}
            c.fillStyle=g; c.fillRect(-1,-1,2,2); c.restore();
        });
        // Keep the feathered light continuous. Actual facade/foliage layers
        // above z=1.1 provide occlusion without square region-mask cutouts.
        bitmap.smooth=true;bitmap._setDirty();
        var sprite=new Sprite(bitmap);sprite.scale.set(scale,scale);sprite.z=1.1;sprite.blendMode=PIXI.BLEND_MODES.SCREEN;
        set._tilemap.addChild(sprite);state.floor=sprite;
    }
    function drawPane(state,rec,shiftX,shiftY) {
        var w=rec.window, c=rec.pane.bitmap._context, profile=state.profile;
        c.clearRect(0,0,w.width,w.height);c.imageSmoothingEnabled=false;
        c.globalAlpha=profile.room;c.drawImage(rec.room,-6+shiftX,-6+shiftY);c.globalAlpha=1;
        c.save();c.translate(-shiftX*.65,-shiftY*.5);
        c.fillStyle='rgba(222,240,250,'+profile.reflection+')';
        var bx=Math.round(w.width*.24), bw=Math.max(2,Math.round(w.width*.09));
        c.beginPath();c.moveTo(bx,-4);c.lineTo(bx+bw,-4);c.lineTo(bx+bw+w.height*.34,w.height+4);c.lineTo(bx+w.height*.34,w.height+4);c.closePath();c.fill();
        c.fillStyle='rgba(255,246,224,'+(profile.reflection*.52)+')';c.fillRect(Math.round(w.width*.72),0,1,w.height);c.restore();
        c.globalCompositeOperation='destination-in';c.drawImage(rec.mask._canvas,0,0);c.globalCompositeOperation='source-over';
        rec.pane.bitmap._setDirty();rec.shift=[shiftX,shiftY];rec.redraws++;
    }
    function update(set) {
        var state=set._windowParallax;if(!state)return;
        var sx=Math.floor($gameMap.displayX()*48),sy=Math.floor($gameMap.displayY()*48),cx=sx+Graphics.width/2,cy=sy+Graphics.height/2;
        // The player also supplies the viewpoint in rooms smaller than the screen.
        // Camera clamping must not freeze their window depth effect.
        if($gamePlayer){cx=cx*.7+$gamePlayer._realX*48*.3;cy=cy*.8+$gamePlayer._realY*48*.2;}
        state.layer.x=state.emissionLayer.x=-sx;state.layer.y=state.emissionLayer.y=-sy;if(state.floor){state.floor.x=-sx;state.floor.y=-sy;}
        state.records.forEach(function(rec) {
            var w=rec.window, visible=w.x+w.width+16>=sx&&w.x-16<=sx+Graphics.width&&w.y+w.height+16>=sy&&w.y-16<=sy+Graphics.height;
            rec.pane.visible=rec.halo.visible=rec.emission.visible=visible;if(!visible)return;
            var dx=Math.round(Math.max(-2,Math.min(2,(cx-w.x-w.width/2)*.007))),dy=Math.round(Math.max(-1,Math.min(1,(cy-w.y-w.height/2)*.004)));
            if(!rec.shift||rec.shift[0]!==dx||rec.shift[1]!==dy)drawPane(state,rec,dx,dy);
        });
    }
    var create=Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer=function() {
        create.apply(this,arguments);var c=config();if(!c)return;
        var layer=new Sprite();layer.z=2.1;this._tilemap.addChild(layer);
        var emissionLayer=new Sprite(),ambientIndex=this._baseSprite.children.indexOf(this._kudasaiLightSprite);
        if(ambientIndex>=0)this._baseSprite.addChildAt(emissionLayer,ambientIndex+1);else this._baseSprite.addChild(emissionLayer);
        var state=this._windowParallax={model:c.model,profile:profiles[c.map.profile],profileName:c.map.profile,layer:layer,emissionLayer:emissionLayer,records:[],bitmaps:[],suppressedLegacy:suppressLegacy(this,c.model)};
        buildFloor(this,state);c.model.windows.forEach(function(w,i){addWindow(this,state,w,i);},this);update(this);
    };
    var oldUpdate=Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update=function(){oldUpdate.apply(this,arguments);update(this);};
    function dispose(set) {
        var state=set && set._windowParallax;
        if(state){state.records.forEach(function(r){r.pane.bitmap=null;r.halo.bitmap=null;r.emission.bitmap=null;r.room.width=r.room.height=1;});
            if(state.floor){state.floor.bitmap=null;if(state.floor.parent)state.floor.parent.removeChild(state.floor);state.floor.destroy({texture:false,baseTexture:false});}
            if(state.layer.parent)state.layer.parent.removeChild(state.layer);state.layer.destroy({children:true,texture:false,baseTexture:false});
            if(state.emissionLayer.parent)state.emissionLayer.parent.removeChild(state.emissionLayer);state.emissionLayer.destroy({children:true,texture:false,baseTexture:false});
            state.bitmaps.forEach(function(b){if(b._baseTexture)b._baseTexture.destroy();if(b.__canvas)b.__canvas.width=b.__canvas.height=1;});
            state.records=[];state.bitmaps=[];set._windowParallax=null;}
    }
    var terminate=Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);dispose(this._spriteset);};
    var destroy=Spriteset_Map.prototype.destroy;
    Spriteset_Map.prototype.destroy=function() {
        dispose(this);destroy.apply(this,arguments);
    };
})();
