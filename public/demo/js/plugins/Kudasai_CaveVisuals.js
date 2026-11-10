/*:
 * @plugindesc Gruta de los Ecos: galerías naturales y autotiles de agua originales de MV. v2.2
 * @author Gstv_
 * @requiredAssets img/parallaxes/Kudasai_Cueva_Natural_20261107
 * @requiredAssets img/parallaxes/Kudasai_Cueva_Caliza_20261107
 * @requiredAssets img/parallaxes/Kudasai_Cueva_Natural_Sombras_20261107
 * @requiredAssets img/tilesets/Kudasai_Cueva_Agua_MV_20261107
 * @help
 * Instalar después de Kudasai_Cave y Kudasai_Parallax.
 * Acabado visual exclusivo del mapa 33 y de su geometría aprobada.
 * Geometría y regiones naturales actualizadas en Map033; eventos y ABS intactos.
 * Agua A1 de MV con orillas rocosas, tres fases y ciclo 0-1-2-1; bruma en planos
 * distintos. Las columnas ocupan muros ya sólidos y respetan el orden Y.
 * Efectos Canvas compatibles con WebGL; recursos propios liberados al salir.
 */
(function () {
    'use strict';
    var VERSION = '20261107.5', HASH = 1703219526;
    function eligible() {
        return $gameMap && $gameMap.mapId() === 33 && $dataMap &&
            $dataMap.width === 64 && $dataMap.height === 54 &&
            $gameMap.parallaxName() === '!Kudasai_Gruta_Ecos_Ampliada' &&
            window.KudasaiParallaxHash && KudasaiParallaxHash($dataMap, $gameMap.tilesetFlags()) === HASH;
    }
    function own(set, bitmap) { set._caveVisuals.owned.push(bitmap); return bitmap; }
    function place(set, sprite, x, y) {
        sprite.x = Math.round(x - $gameMap.displayX() * 48);
        sprite.y = Math.round(y - $gameMap.displayY() * 48);
    }
    function waterAt(x, y) {
        return x >= 0 && y >= 0 && x < 64 && y < 54 && $dataMap.data[y * 64 + x] === 2048;
    }
    function waterShape(x,y){
        var n=waterAt(x,y-1),e=waterAt(x+1,y),s=waterAt(x,y+1),w=waterAt(x-1,y);
        var quarters=[
            !n?(!w?[0,2]:[2,2]):(!w?[0,4]:(waterAt(x-1,y-1)?[2,4]:[2,0])),
            !n?(!e?[3,2]:[1,2]):(!e?[3,4]:(waterAt(x+1,y-1)?[1,4]:[3,0])),
            !s?(!w?[0,5]:[2,5]):(!w?[0,3]:(waterAt(x-1,y+1)?[2,3]:[2,1])),
            !s?(!e?[3,5]:[1,5]):(!e?[3,3]:(waterAt(x+1,y+1)?[1,3]:[3,1]))
        ];
        for(var shape=0;shape<Tilemap.FLOOR_AUTOTILE_TABLE.length;shape++){
            var table=Tilemap.FLOOR_AUTOTILE_TABLE[shape],same=true;
            for(var q=0;q<4;q++)if(table[q][0]!==quarters[q][0]||table[q][1]!==quarters[q][1])same=false;
            if(same)return shape;
        }
        throw new Error('Kudasai: native water shape unavailable at '+x+','+y);
    }
    function waterBankMask(bitmap){
        var w=bitmap.width,h=bitmap.height,p=bitmap._context.getImageData(0,0,w,h).data;
        var distance=new Float32Array(w*h),root2=1.41421356,x,y,i;
        for(i=0;i<distance.length;i++)distance[i]=p[i*4+3]&&p[i*4+2]>p[i*4]+4?0:100000;
        for(y=0;y<h;y++)for(x=0;x<w;x++){
            i=y*w+x;if(x)distance[i]=Math.min(distance[i],distance[i-1]+1);
            if(y)distance[i]=Math.min(distance[i],distance[i-w]+1);
            if(x&&y)distance[i]=Math.min(distance[i],distance[i-w-1]+root2);
            if(x<w-1&&y)distance[i]=Math.min(distance[i],distance[i-w+1]+root2);
        }
        for(y=h-1;y>=0;y--)for(x=w-1;x>=0;x--){
            i=y*w+x;if(x<w-1)distance[i]=Math.min(distance[i],distance[i+1]+1);
            if(y<h-1)distance[i]=Math.min(distance[i],distance[i+w]+1);
            if(x<w-1&&y<h-1)distance[i]=Math.min(distance[i],distance[i+w+1]+root2);
            if(x&&y<h-1)distance[i]=Math.min(distance[i],distance[i+w-1]+root2);
        }
        var alpha=new Uint8Array(w*h);
        for(i=0;i<alpha.length;i++)alpha[i]=Math.max(0,Math.min(255,(10-distance[i])*63.75));
        return alpha;
    }
    function trimWaterBank(bitmap,alpha){
        var c=bitmap._context,image=c.getImageData(0,0,bitmap.width,bitmap.height),p=image.data;
        // Preserve every native water/rim RGB pixel. Trim only the distant dry
        // ground beyond the rocky bank so the authored cave floor shows through.
        for(var i=0;i<alpha.length;i++)p[i*4+3]=Math.min(p[i*4+3],alpha[i]);
        c.putImageData(image,0,0);bitmap._setDirty();
    }
    function buildWater(set){
        var fx=set._caveVisuals,left=64,top=54,right=0,bottom=0,records=[];
        for(var y=0;y<54;y++)for(var x=0;x<64;x++)if(waterAt(x,y)){
            left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
            records.push({x:x,y:y,shape:waterShape(x,y)});
        }
        left--;top--;right++;bottom++;
        var width=(right-left)*48,height=(bottom-top)*48;
        fx.waterBounds={x:left*48,y:top*48,w:width,h:height};fx.waterRecords=records;fx.waterFrames=[];
        var sp=new Sprite();sp.z=.8;sp.tint=0x90b4ae;set._tilemap.addChild(sp);fx.water=sp;fx.sprites.push(sp);
        var atlas=ImageManager.loadTileset('Kudasai_Cueva_Agua_MV_20261107');
        atlas.addLoadListener(function(){
            if(fx.disposed)return;
            // Exact MV quarter-tile renderer and original Water D (Rock Cave).
            // The local atlas/frames never modify the map's shared tileset.
            var renderer={_tileWidth:48,_tileHeight:48,bitmaps:[atlas],animationFrame:0};
            for(var frame=0;frame<3;frame++){
                renderer.animationFrame=frame;
                var bitmap=own(set,new Bitmap(width,height));bitmap.smooth=false;
                records.forEach(function(p){
                    var id=Tilemap.makeAutotileId(10,p.shape);
                    Tilemap.prototype._drawAutotile.call(renderer,bitmap,id,(p.x-left)*48,(p.y-top)*48);
                });
                fx.waterFrames.push(bitmap);
            }
            var bank=waterBankMask(fx.waterFrames[0]);
            fx.waterFrames.forEach(function(bitmap){trimWaterBank(bitmap,bank);});
            updateWater(set);
        });
    }
    function updateWater(set){
        var fx=set._caveVisuals;if(fx.waterFrames.length!==3)return;
        // Same cadence and 0-1-2-1 sequence as Tilemap._drawAutotile in MV.
        var phase=[0,1,2,1][(set._tilemap.animationFrame||0)%4];
        if(fx.waterPhase===phase)return;
        fx.water.bitmap=fx.waterFrames[phase];fx.waterPhase=phase;fx.waterRevision++;
    }
    function buildDepth(set) {
        var fx=set._caveVisuals;
        for(var layer=0;layer<2;layer++){
            var b=own(set,new Bitmap(512,512)),c=b._context;
            c.fillStyle=layer?'rgba(3,10,18,0)':'#050e16';c.fillRect(0,0,512,512);
            for(var i=0;i<18;i++){
                var x=(i*173+layer*61)%512,y=(i*107+layer*137)%512;
                var g=c.createRadialGradient(x,y,0,x,y,75+(i%4)*14);
                g.addColorStop(0,layer?'rgba(45,80,102,.035)':'rgba(29,55,76,.12)');g.addColorStop(1,'rgba(6,17,27,0)');
                c.fillStyle=g;c.fillRect(x-120,y-120,240,240);
            }
            b._setDirty();var sp=new TilingSprite(b);sp.move(0,0,Graphics.width,Graphics.height);
            set._baseSprite.addChildAt(sp,set._baseSprite.children.indexOf(set._kudasaiCaveGround));
            fx.depth.push(sp);fx.sprites.push(sp);
        }
    }
    function buildColumns(set) {
        var fx=set._caveVisuals,kit=ImageManager.loadParallax('Kudasai_Cueva_Caliza_20261107');
        var anchors=[];
        for(var y=5;y<51;y++)for(var x=4;x<60;x++){
            if($dataMap.data[y*64+x]!==6328||$dataMap.data[(y+1)*64+x]!==3200||(x*13+y*7)%9!==0)continue;
            var clear=$dataMap.events.every(function(e){return !e||Math.abs(e.x-x)+Math.abs(e.y-y)>2;});
            if(clear)anchors.push([x+.5,y+1]);
        }
        kit.addLoadListener(function(){
            if(fx.disposed)return;
            var cell=kit.width/3,row=kit.height/2;
            anchors.forEach(function(p,i){
                var sp=new Sprite(kit),column=i%3===0;
                sp.setFrame(column?2*cell+80:24,row+10,column?cell-160:cell-48,row-30);
                sp.anchor.set(.5,1);sp.scale.set((column?57:68)/(column?cell-160:cell-48),(column?126:81)/(row-30));sp.z=3;
                sp._caveWorld=[p[0]*48,p[1]*48-3];set._tilemap.addChild(sp);fx.columns.push(sp);fx.sprites.push(sp);
                place(set,sp,sp._caveWorld[0],sp._caveWorld[1]);
            });
        });
    }
    function buildFlames(set) {
        var fx=set._caveVisuals,b=own(set,new Bitmap(24*12,32)),c=b._context;
        for(var i=0;i<12;i++){
            var sway=Math.sin(i*Math.PI/6)*2;
            c.save();c.translate(i*24,0);
            var halo=c.createRadialGradient(12,19,0,12,19,12);
            halo.addColorStop(0,'rgba(83,192,239,.2)');halo.addColorStop(1,'rgba(83,192,239,0)');c.fillStyle=halo;c.fillRect(0,0,24,32);
            c.beginPath();c.moveTo(6,26);c.bezierCurveTo(2,18,11,16,10+sway,4);
            c.bezierCurveTo(19,12,15,13,19,18);c.bezierCurveTo(23,25,17,28,12,28);c.closePath();
            var g=c.createLinearGradient(0,4,0,28);g.addColorStop(0,'#2d81b9');g.addColorStop(.7,'#6bd8ed');g.addColorStop(1,'#9ce2ef');c.fillStyle=g;c.fill();
            c.beginPath();c.moveTo(9,26);c.quadraticCurveTo(7,20,13-sway*.5,14);c.quadraticCurveTo(18,24,14,27);c.closePath();c.fillStyle='#d8f7f5';c.fill();
            c.fillStyle='rgba(131,220,244,.6)';c.fillRect(10+(i*3)%6,2+(i*5)%8,1,1);c.restore();
        }
        b._setDirty();fx.flameBitmap=b;
        set._characterSprites.forEach(function(sp){
            var ch=sp._character;
            if(ch instanceof Game_Event&&ch.characterName()==='!$Kudasai_Antorcha')sp._caveVisualOwner=fx;
        });
    }
    var characterFrame=Sprite_Character.prototype.updateFrame;
    Sprite_Character.prototype.updateFrame=function(){
        characterFrame.apply(this,arguments);
        var fx=this._caveVisualOwner;
        if(!fx||fx.disposed||this._character.characterName()!=='!$Kudasai_Antorcha')return;
        var frame=this._frame,cut=25,height=frame.height-cut;
        if(height<=0)return;
        // Crop only the old fire; the dish, stem and metal base keep their pixels.
        this.setFrame(frame.x,frame.y+cut,frame.width,height);
        if(!this._caveBlueFlame){
            var sp=new Sprite(fx.flameBitmap);sp.anchor.set(.5,1);this.addChild(sp);
            fx.sprites.push(sp);this._caveBlueFlame=sp;
        }
        this._caveBlueFlame.y=-height+4;
        this._caveBlueFlame.setFrame((Math.floor(fx.tick/5)+this._character.eventId())%12*24,0,24,32);
    };
    function installGround(set) {
        var fx=set._caveVisuals,bitmap=ImageManager.loadParallax('Kudasai_Cueva_Natural_20261107');
        bitmap.addLoadListener(function(){
            if(fx.disposed)return;
            set._kudasaiCaveGround.bitmap=bitmap;
            // Native regions describe the redesigned cave. Suppress only the
            // baked scenery and water in this renderer's private tile copy.
            var render=set._tilemap._mapData.slice(),n=64*54;
            for(var i=0;i<n;i++){
                if($dataMap.data[i]===2048)render[i]=0;
                if($dataMap.data[2*n+i]===57)render[2*n+i]=0;
            }
            set._tilemap.setData(64,54,render);set._tilemap.refresh();
            if(set._parallaxShadow)set._parallaxShadow.visible=false;
            fx.ready=true;
        });
    }
    var lower=Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer=function(){
        var enabled=eligible(),original=enabled&&$gameMap._kudasaiLighting;
        // Feed the existing light renderer a temporary visual profile. Restore
        // the source immediately; saves, event conditions and map notes keep it.
        if(original){
            $gameMap._kudasaiLighting=Object.assign({},original,{ambient:[174,190,218],lights:original.lights.filter(function(light){
                // Remove the four warm floor pools belonging to ceiling shafts.
                var color=light.color||[];
                return light.flicker||color[0]!==255||color[1]!==228||color[2]!==174;
            }).map(function(light){
                if(!light.flicker)return light;
                return Object.assign({},light,{color:[114,205,248],glowColor:[114,205,248],glowOpacity:77,glowScale:.76});
            })});
        }
        try{lower.apply(this,arguments);}finally{if(original)$gameMap._kudasaiLighting=original;}
        if(!enabled||!this._kudasaiCaveGround||!this._kudasaiParallax)return;
        this._caveVisuals={version:VERSION,ready:false,disposed:false,tick:0,waterRevision:0,owned:[],sprites:[],columns:[],depth:[]};
        buildDepth(this);buildWater(this);buildColumns(this);buildFlames(this);installGround(this);
    };
    var update=Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update=function(){
        update.apply(this,arguments);
        var fx=this._caveVisuals;if(!fx||fx.disposed)return;
        fx.tick++;fx.water.visible=fx.ready&&fx.waterFrames.length===3;
        (this._kudasaiCaveRays||[]).forEach(function(ray){ray.visible=false;});
        if(this._kudasaiCaveDust)this._kudasaiCaveDust.visible=false;
        place(this,fx.water,fx.waterBounds.x,fx.waterBounds.y);
        fx.columns.forEach(function(sp){place(this,sp,sp._caveWorld[0],sp._caveWorld[1]);},this);
        fx.depth.forEach(function(sp,i){
            sp.move(0,0,Graphics.width,Graphics.height);
            sp.origin.x=$gameMap.displayX()*48*(i ? .84 : .66)+fx.tick*(i ? -.018 : .012);
            sp.origin.y=$gameMap.displayY()*48*(i ? .84 : .66)+fx.tick*.006;
        });
        updateWater(this);
    };
    function dispose(set){
        var fx=set&&set._caveVisuals;if(!fx||fx.disposed)return;
        fx.disposed=true;
        fx.sprites.forEach(function(sp){if(sp.parent)sp.parent.removeChild(sp);sp.bitmap=null;sp.destroy({texture:true,baseTexture:false});});
        fx.owned.forEach(function(b){if(b._baseTexture)b._baseTexture.destroy();if(b.__canvas)b.__canvas.width=b.__canvas.height=1;});
        fx.owned=[];fx.sprites=[];fx.columns=[];fx.depth=[];fx.flameBitmap=null;
        fx.water=null;fx.waterFrames=[];fx.waterRecords=[];
    }
    var terminate=Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);dispose(this._spriteset);};
    var start=Scene_Map.prototype.start;
    Scene_Map.prototype.start=function(){
        start.apply(this,arguments);
        if(!eligible()||$gameMap.regionId($gamePlayer.x,$gamePlayer.y)===2)return;
        // A save made on the previous open floor may now be inside the roof.
        // Relocate only such invalid positions to the closest clear gallery.
        var best=null,distance=Infinity;
        for(var y=0;y<54;y++)for(var x=0;x<64;x++){
            if($gameMap.regionId(x,y)!==2||$gameMap.eventsXyNt(x,y).some(function(e){return e.isNormalPriority();}))continue;
            var d=Math.abs(x-$gamePlayer.x)+Math.abs(y-$gamePlayer.y);
            if(d<distance){distance=d;best=[x,y];}
        }
        if(best){$gamePlayer.locate(best[0],best[1]);$gamePlayer.center(best[0],best[1]);}
    };
    window.KudasaiCaveVisuals={version:VERSION,mapId:33};
}());
