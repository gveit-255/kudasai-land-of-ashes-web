/*:
 * @plugindesc Fondos parallax, sombras de contacto y niebla suave para los mapas de Kudasai.
 * @author Gstv_
 * @help
 * Colocar después de Kudasai_Atmosphere. Activación mediante la nota
 * <KudasaiParallax:{"hash":numero,"shadow":"nombre","fog":20}>.
 * El fondo !Kudasai_00N queda fijado al mapa; cada casilla mide 48 px.
 * Se conservan los datos originales de tiles, eventos y colisiones.
 * El agua animada y los tiles superiores se dibujan de forma nativa.
 * Si cambian los tiles o sus flags, se vuelve al dibujo nativo hasta
 * regenerar las imágenes. Las capas de sombras admiten edición en Photoshop.
 * Ciudad del Alba: luz solar cálida y sombras frías proyectadas desde los tiles.
 * Ajustes: KudasaiAlbaDaylight; vector solar común y escala por tipo de objeto.
 * Sombras de personajes: silueta del fotograma, contacto y recorte al suelo.
 * Se actualizan al caminar/girar; se liberan al abandonar la escena.
 * En Alba diurna se sustituye el antiguo contorno de contacto; proyección solo en suelo.
 * Luz matinal localizada en plaza y jardín, con relleno celeste y textura intacta.
 * Alba de tarde (16): luz dorada, sombras lavanda y ventanas encendidas.
 * Sombras de silueta con penumbra gradual; las copas proyectan también su brisa.
 * Ajustes propios: KudasaiAlbaAfternoon; mañana y noche mantienen su iluminación.
 * Brillo independiente: KudasaiAlbaSunlight.strength; sombras originales encima.
 * Sombras estáticas cacheadas y parches dinámicos visibles; WebGL y Canvas.
 * Bloom suave propio de MV, inspirado en Hendrix Post-Processing (MZ).
 * Perfiles <KudasaiAlbaMood>: capas de luz cacheadas en coordenadas del mapa.
 * Noche (17): luz lunar azul, cristales y farolas cálidos; fuentes sin parpadeo.
 * No modifica imágenes, árboles, diálogos ni colisiones.
 */
(function () {
  "use strict";
  // Scenery-only palette correction. Work once on each cached tileset bitmap;
  // characters and their textures never pass through this color adjustment.
  window.KudasaiPastelTone = { exposure: 0.86, saturation: 0.70 };
  var loadPastelTileset = ImageManager.loadTileset;
  ImageManager.loadTileset = function(filename, hue) {
    var bitmap = loadPastelTileset.apply(this, arguments);
    if (!/^Kudasai_Pastel_/.test(filename || '') || bitmap._kudasaiSoftPastel) return bitmap;
    bitmap._kudasaiSoftPastel = true;
    bitmap.addLoadListener(function(b) {
      var baseTexture = b._baseTexture;
      var context = b._context, image = context.getImageData(0, 0, b.width, b.height);
      var pixels = image.data, settings = KudasaiPastelTone;
      for (var i = 0; i < pixels.length; i += 4) {
        if (!pixels[i + 3]) continue;
        var r = pixels[i], g = pixels[i + 1], blue = pixels[i + 2];
        var light = r * 0.2126 + g * 0.7152 + blue * 0.0722;
        var saturation = light < 90 ? 0.84 : settings.saturation;
        var exposure = settings.exposure;
        // Ivory awnings and flowers keep their highlights; mint greens become
        // softer sage while preserving the existing pixel clusters and alpha.
        if (r > blue + 12 && g > blue && light > 195) exposure += 0.045;
        var green = Math.max(0, Math.min(1, (g - r - 10) / 35)) *
          Math.max(0, Math.min(1, (g - blue + 8) / 28));
        pixels[i] = (light + (r - light) * saturation) * exposure + green * 2;
        pixels[i + 1] = (light + (g - light) * saturation) * exposure - green * 8;
        pixels[i + 2] = (light + (blue - light) * saturation) * exposure - green * 26;
      }
      context.putImageData(image, 0, 0);
      // MV's fast tile blits read _image, and ShaderTilemap may already hold
      // the original BaseTexture. Both must point at the corrected canvas.
      b._image = b._canvas;
      b.__baseTexture = baseTexture;
      baseTexture.source = b._canvas;
      baseTexture.update();
      // pixi-tilemap's packed atlas checks texture identity, not dirty flags.
      // Invalidate its old upload when the same bitmap was already reserved.
      var renderer = Graphics._renderer;
      var tiles = renderer && renderer.plugins && renderer.plugins.tilemap;
      if (tiles && tiles.boundSprites) tiles.boundSprites.forEach(function(group) {
        group.forEach(function(sprite) {
          if (sprite.texture && sprite.texture.baseTexture === baseTexture) sprite.texture = PIXI.Texture.EMPTY;
        });
      });
      b._kudasaiSoftPastelApplied = true;
      b._setDirty();
    });
    return bitmap;
  };
  var loadSoftPastelMapTileset = Spriteset_Map.prototype.loadTileset;
  Spriteset_Map.prototype.loadTileset = function() {
    loadSoftPastelMapTileset.apply(this, arguments);
    var tilemap = this._tilemap;
    tilemap.bitmaps.forEach(function(bitmap) {
      if (!bitmap || !bitmap._kudasaiSoftPastel) return;
      bitmap.addLoadListener(function() {
        // Rebind textures created before asynchronous image decoding finished.
        tilemap.refreshTileset();
        tilemap.refresh();
      });
    });
  };
  window.KudasaiAlbaDaylight = { exposure: 1.025, fill: 0.008, saturation: 0.98, sunX: -100, sunY: -52, shadowStrength: 0.40, buildingShadowOpacity: 0.45, characterShadowOpacity: 0.45, buildingShadowScale: 0.76, treeShadowScale: 0.75, barrelShadowScale: 0.24, characterShadowScale: 0.45, statueShadowScale: 0.48 };
  // Independent sunlight settings: do not change the existing shadow controls.
  window.KudasaiAlbaSunlight = { strength: 0.025 };
  // Morning sun from the lower right; afternoon sun from the lower left. Same shadow length and softness.
  window.KudasaiAlbaAfternoon = { sunX: 100, sunY: -52, shadowStrength: 0.40, buildingShadowOpacity: 0.45, characterShadowOpacity: 0.45, buildingShadowScale: 0.76, treeShadowScale: 0.75, barrelShadowScale: 0.24, characterShadowScale: 0.45, statueShadowScale: 0.48, sunlight: 0.055, bloomStrength: 0.17 };
  function albaAfternoon(){return $gameMap.mapId()===16&&!KudasaiDaylight.isInterior();}
  function albaSolar(){return albaDay()||albaAfternoon();}
  function albaSolarSettings(){return albaAfternoon()?KudasaiAlbaAfternoon:KudasaiAlbaDaylight;}
  function albaDay(){return $gameMap.mapId()===8&&KudasaiDaylight.isDay()&&!KudasaiDaylight.isInterior();}
  function albaDayGrade(){
    // Filmic daylight: warm lit surfaces, cool shadow fill, texture-preserving contrast.
    var settings=KudasaiAlbaDaylight;
    var frag=[
      'precision mediump float; varying vec2 vTextureCoord; uniform sampler2D uSampler;',
      'uniform float exposure; uniform float fill; uniform float saturation;',
      'void main(){vec4 t=texture2D(uSampler,vTextureCoord);vec3 c=t.rgb/max(t.a,0.001);',
      'float lum=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(lum),c,saturation);',
      'c=1.0-(1.0-c)*(1.0-fill);c=(c-0.5)*1.06+0.5;',
      'float sunlit=smoothstep(0.10,0.68,lum);c*=mix(vec3(0.92,0.965,1.035),vec3(1.035,1.012,0.97),sunlit)*exposure;',
      'gl_FragColor=vec4(clamp(c,0.0,1.0)*t.a,t.a);}'
    ].join('\n');
    return new PIXI.Filter(null,frag,{exposure:{type:'1f',value:settings.exposure},fill:{type:'1f',value:settings.fill},saturation:{type:'1f',value:settings.saturation}});
  }
  // One cached light map for Alba, derived from its real roof/facade tiles.
  // Sun is on opposite horizontal sides in morning/afternoon; projections stay on the ground.
  // Roof/facade art remains intact. The footprint and roof profile define the projected volume.
  function albaBuildings(){
    var map=$dataMap,n=map.width*map.height,seen={},roofs={},list=[];
    function tile(x,y,test){if(x<0||y<0||x>=map.width||y>=map.height)return false;for(var z=0;z<4;z++)if(test(map.data[z*n+y*map.width+x]))return true;return false;}
    function roof(t){return Tilemap.isRoofTile(t)||Tilemap.isWallTopTile(t);}
    for(var y=0;y<map.height;y++)for(var x=0;x<map.width;x++)if(tile(x,y,roof))roofs[y*map.width+x]=true;
    Object.keys(roofs).forEach(function(key){
      if(seen[key])return;var queue=[Number(key)],p=0,minX=map.width,minY=map.height,maxX=0,maxY=0,count=0;
      seen[key]=true;
      while(p<queue.length){var i=queue[p++],x=i%map.width,y=Math.floor(i/map.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;
        [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(function(v){var k=v[1]*map.width+v[0];if(v[0]>=0&&v[1]>=0&&v[0]<map.width&&v[1]<map.height&&roofs[k]&&!seen[k]){seen[k]=true;queue.push(k);}});
      }
      if(count<4)return;
      var foot=maxY+1;
      // Extend the roof to the actual facade foot, including doors/windows on upper layers.
      for(var row=maxY+1;row<Math.min(map.height,maxY+7);row++){
        var walls=0;for(var col=minX;col<=maxX;col++)if(tile(col,row,function(t){return Tilemap.isWallSideTile(t);}))walls++;
        if(walls<Math.max(1,(maxX-minX+1)*0.4))break;foot=row+1;
      }
      list.push({x:minX,y:minY,right:maxX+1,foot:foot,roofBottom:maxY+1,cells:count});
    });
    return list;
  }
  // One constant morning light level for ground, roofs, trees and characters.
  // The existing cast-shadow layer remains above this uniform light.
  function buildAlbaSunlight(set) {
    var b=new Bitmap(2,2),c=b._context;
    var strength=Math.max(0,Math.min(.25,albaAfternoon()?KudasaiAlbaAfternoon.sunlight:KudasaiAlbaSunlight.strength));
    c.fillStyle=(albaAfternoon()?'rgba(255,139,67,':'rgba(255,244,214,')+strength+')';c.fillRect(0,0,2,2);b._setDirty();
    var sprite=new Sprite(b);sprite.blendMode=albaAfternoon()?PIXI.BLEND_MODES.NORMAL:PIXI.BLEND_MODES.SCREEN;
    sprite.scale.set(Graphics.width/2,Graphics.height/2);
    set._baseSprite.addChildAt(sprite,set._baseSprite.children.indexOf(set._tilemap)+1);
    set._cinemaOwned.push(b);set._albaSunlight=sprite;
  }

  // Solar shadows share one projection, a firm contact and a softer distant edge.
  function albaShadowColor(){return albaAfternoon()?'rgb(66,57,70)':'rgb(55,66,73)';}
  function albaClipShadow(set,context,left,top,width,height){
    var tw=$gameMap.tileWidth(),th=$gameMap.tileHeight();
    for(var y=Math.floor(top/th);y<=Math.floor((top+height)/th);y++)for(var x=Math.floor(left/tw);x<=Math.floor((left+width)/tw);x++){
      if(x<0||y<0||x>=$dataMap.width||y>=$dataMap.height||!set._albaGroundCells[y*$dataMap.width+x])context.clearRect(x*tw-left,y*th-top,tw,th);
    }
  }
  function albaHull(points){
    points.sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});
    function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
    var lo=[],hi=[];points.forEach(function(p){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);});
    points.slice().reverse().forEach(function(p){while(hi.length>1&&cross(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p);});
    lo.pop();hi.pop();return lo.concat(hi);
  }
  function albaCanvas(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function albaShadowPatch(set,width,height,cast,compression){
    var padding=12,left=Math.floor(Math.min(-width*compression/2,-width*compression/2+cast.dx)-padding),top=Math.floor(Math.min(0,cast.dy)-padding);
    var w=Math.ceil(Math.max(width*compression/2,width*compression/2+cast.dx)+padding-left),h=Math.ceil(Math.max(0,cast.dy)+padding-top);
    var bitmap=new Bitmap(w,h),sprite=new Sprite(bitmap);bitmap.smooth=true;
    sprite.anchor.set(-left/w,-top/h);sprite.blendMode=PIXI.BLEND_MODES.MULTIPLY;
    set._cinemaOwned.push(bitmap);
    var patch={sprite:sprite,left:left,top:top,width:width,height:height,compression:compression,cast:cast,key:null,
      raw:albaCanvas(w,h),near:albaCanvas(w,h),far:albaCanvas(w,h)};
    (set._albaShadowPatches||(set._albaShadowPatches=[])).push(patch);return patch;
  }
  function albaDrawPatch(set,patch,source,sx,sy,rootX,rootY,sway){
    var bitmap=patch.sprite.bitmap,w=bitmap.width,h=bitmap.height,cast=patch.cast,rx=-patch.left,ry=-patch.top,color=albaShadowColor();
    var raw=patch.raw.getContext('2d');raw.clearRect(0,0,w,h);raw.save();
    // Project from the bottom-centre. Wind only moves the tip, never the root.
    raw.setTransform(patch.compression,0,-(cast.dx+sway)/patch.height,-cast.dy/patch.height,rx-patch.width*patch.compression/2+cast.dx+sway,ry+cast.dy);
    raw.drawImage(source,sx,sy,patch.width,patch.height,0,0,patch.width,patch.height);raw.restore();
    raw.globalCompositeOperation='source-in';raw.fillStyle=color;raw.fillRect(0,0,w,h);raw.globalCompositeOperation='source-over';
    function feather(canvas,blur,far){
      var c=canvas.getContext('2d');c.clearRect(0,0,w,h);c.filter='blur('+blur+'px)';c.drawImage(patch.raw,0,0);c.filter='none';
      var gradient=c.createLinearGradient(rx,ry,rx+cast.dx,ry+cast.dy);
      gradient.addColorStop(0,far?'rgba(255,255,255,0)':'rgba(255,255,255,1)');
      gradient.addColorStop(1,far?'rgba(255,255,255,1)':'rgba(255,255,255,0)');
      c.globalCompositeOperation='destination-in';c.fillStyle=gradient;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';
    }
    feather(patch.near,.8,false);feather(patch.far,2.7,true);
    var c=bitmap._context;c.clearRect(0,0,w,h);c.drawImage(patch.near,0,0);c.drawImage(patch.far,0,0);
    var contact=c.createRadialGradient(rx,ry,0,rx,ry,Math.min(12,patch.width*.25));
    contact.addColorStop(0,color);contact.addColorStop(1,'rgba(55,60,70,0)');c.save();c.translate(rx,ry);c.scale(1,.32);c.translate(-rx,-ry);c.fillStyle=contact;c.fillRect(rx-12,ry-12,24,24);c.restore();
    albaClipShadow(set,c,rootX+patch.left,rootY+patch.top,w,h);bitmap._setDirty();patch.revisions=(patch.revisions||0)+1;
  }
  function albaPlacePatch(patch,rootX,rootY){
    patch.sprite.x=rootX-$gameMap.displayX()*$gameMap.tileWidth();patch.sprite.y=rootY-$gameMap.displayY()*$gameMap.tileHeight();
    var b=patch.sprite.bitmap,x=patch.sprite.x+patch.left,y=patch.sprite.y+patch.top;
    patch.sprite.visible=x+b.width>=0&&y+b.height>=0&&x<=Graphics.width&&y<=Graphics.height;
  }
  function buildAlbaCastLight(set){
    var settings=albaSolarSettings(),tw=$gameMap.tileWidth(),th=$gameMap.tileHeight(),map=$dataMap,n=map.width*map.height,scale=2,w=map.width*tw/scale,h=map.height*th/scale;
    var buildings=albaBuildings(),trees=((set._kudasaiTrees&&set._kudasaiTrees.records)||[]).filter(function(t){return !t.isFoliage;}),barrels=[],statues=[],color=albaShadowColor();
    set._albaGroundCells=[];var ground=albaCanvas(w,h),gc=ground.getContext('2d');gc.fillStyle='#fff';
    for(var y=0;y<map.height;y++)for(var x=0;x<map.width;x++){
      var solid=false;for(var z=0;z<4;z++){var id=map.data[z*n+y*map.width+x];if(Tilemap.isRoofTile(id)||Tilemap.isWallTile(id)){solid=true;break;}}
      if(!solid&&$gameMap.regionId(x,y)!==1){set._albaGroundCells[y*map.width+x]=true;gc.fillRect(x*tw/scale,y*th/scale,tw/scale,th/scale);}
    }
    var shade=albaCanvas(w,h),c=shade.getContext('2d');c.fillStyle=color;
    buildings.forEach(function(b){
      var factor=settings.buildingShadowScale*Math.max(.7,Math.min(1.3,(b.foot-b.y)/8));b.cast={dx:settings.sunX*factor,dy:settings.sunY*factor};
      var x=b.x*tw/scale,r=b.right*tw/scale,f=b.foot*th/scale,back=f-Math.max(th*.65,(b.roofBottom-b.y)*th*.58)/scale,dx=b.cast.dx/scale,dy=b.cast.dy/scale;
      // Ground footprint and raised roof profile: no extrusion of the full picture rectangle.
      var hull=albaHull([[x,f],[r,f],[x,back],[r,back],[x+dx,back+dy],[(x+r)/2+dx,back+dy-th*.25/scale],[r+dx,back+dy],[x+dx,f+dy],[r+dx,f+dy]]);
      c.beginPath();hull.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);});c.closePath();c.fill();
    });
    var bitmap=new Bitmap(w,h),bc=bitmap._context;bitmap.smooth=true;
    bc.filter='blur(2px)';bc.drawImage(shade,0,0);bc.filter='none';bc.globalCompositeOperation='destination-in';bc.drawImage(ground,0,0);bc.globalCompositeOperation='source-over';
    // Preserve the existing warm lighting: this bitmap has transparent unshaded ground.
    bitmap._setDirty();var sprite=new Sprite(bitmap);sprite.scale.set(scale,scale);sprite.opacity=Math.round(255*settings.shadowStrength*settings.buildingShadowOpacity);sprite.blendMode=PIXI.BLEND_MODES.MULTIPLY;
    set._baseSprite.addChildAt(sprite,set._baseSprite.children.indexOf(set._tilemap));set._cinemaOwned.push(bitmap);set._albaCastLight=sprite;
    set._albaTreeShadows=[];set._albaObjectShadows=[];
    function addPatch(figure,rootX,rootY,cast,compression,tree){
      var patch=albaShadowPatch(set,figure.width,figure.height,cast,compression);patch.figure=figure;patch.rootX=rootX;patch.rootY=rootY;patch.tree=tree;
      patch.sprite.opacity=Math.round(255*settings.shadowStrength);set._baseSprite.addChildAt(patch.sprite,set._baseSprite.children.indexOf(set._tilemap));
      if(tree)set._albaTreeShadows.push(patch);else set._albaObjectShadows.push(patch);
      albaDrawPatch(set,patch,figure,0,0,rootX,rootY,0);albaPlacePatch(patch,rootX,rootY);return patch;
    }
    trees.forEach(function(t){
      var figure=albaCanvas(t.w*tw,t.h*th),fc=figure.getContext('2d');if(t.lower)fc.drawImage(t.lower._canvas,0,0);if(t.upper)fc.drawImage(t.upper._canvas,0,0);
      var cast={dx:settings.sunX*settings.treeShadowScale*t.h/2,dy:settings.sunY*settings.treeShadowScale*t.h/2};
      addPatch(figure,(t.x+t.w/2)*tw,(t.y+t.h)*th-3,cast,.9,t);
    });
    function tile(x,y,id){if(x<0||y<0||x>=map.width||y>=map.height)return false;for(var z=0;z<4;z++)if(map.data[z*n+y*map.width+x]===id)return true;return false;}
    for(var y=0;y<map.height;y++)for(var x=0;x<map.width;x++){
      var sheet,width,height,sx,sy,kind,rootY,coefficient;
      if(tile(x,y,77)){sheet=set._tilemap.bitmaps[5];width=48;height=48;sx=5*48;sy=9*48;kind=barrels;rootY=(y+1)*th-4;coefficient=settings.barrelShadowScale;}
      else if(tile(x,y,337)&&tile(x,y+1,345)){sheet=set._tilemap.bitmaps[6];width=48;height=96;sx=48;sy=480;kind=statues;rootY=(y+2)*th-2;coefficient=settings.statueShadowScale*1.5;}
      else continue;
      if(!sheet||!sheet.isReady())continue;
      var figure=albaCanvas(width,height);figure.getContext('2d').drawImage(sheet._canvas,sx,sy,width,height,0,0,width,height);
      var cast={dx:settings.sunX*coefficient,dy:settings.sunY*coefficient};addPatch(figure,(x+.5)*tw,rootY,cast,.85,null);kind.push({x:x,y:y,cast:cast});
    }
    buildAlbaSunlight(set);
    set._albaLightGeometry={buildings:buildings,trees:set._albaTreeShadows.map(function(p){return {x:p.tree.x,y:p.tree.y,w:p.tree.w,h:p.tree.h,cast:p.cast};}),barrels:barrels,statues:statues,size:[w,h],sun:[settings.sunX,settings.sunY]};
    shade.width=shade.height=ground.width=ground.height=1;
  }
  function updateAlbaActorShadows(set){
    var settings=albaSolarSettings(),tw=$gameMap.tileWidth(),th=$gameMap.tileHeight();
    if(!set._albaActorShadows)set._albaActorShadows=[];
    (set._characterSprites||[]).forEach(function(o){
      var ch=o._character,bm=o.bitmap,pw=o.patternWidth(),ph=o.patternHeight();
      var eligible=ch&&!(ch instanceof Game_Vehicle)&&ch.characterName()&&!ImageManager.isObjectCharacter(ch.characterName())&&!ch.tileId();
      var rec=o._albaShadowRecord;
      if(!eligible||!bm||!bm.isReady()||!pw||!ph){if(rec)rec.sprite.visible=false;return;}
      var shadowSource=bm._canvas;
      if(window.KudasaiAkemiResolution){
        shadowSource=KudasaiAkemiResolution.shadowSource(bm,ch.characterName());
        if(shadowSource!==bm._canvas){pw=64;ph=64;}
      }
      if(!rec){
        var factor=settings.characterShadowScale*Math.min(1.5,ph/48),cast={dx:settings.sunX*factor,dy:settings.sunY*factor};
        var patch=albaShadowPatch(set,pw,ph,cast,.85);rec={owner:o,sprite:patch.sprite,patch:patch,cast:cast,key:null};
        patch.sprite.z=2;patch.sprite.spriteId=o.spriteId-.25;set._tilemap.addChild(patch.sprite);set._albaActorShadows.push(rec);o._albaShadowRecord=rec;
      }
      // A changed event page may replace the source graphic with a different frame size.
      if(rec.patch.width!==pw||rec.patch.height!==ph){
        var oldBitmap=rec.sprite.bitmap;
        set._cinemaOwned.splice(set._cinemaOwned.indexOf(oldBitmap),1);
        set._albaShadowPatches.splice(set._albaShadowPatches.indexOf(rec.patch),1);
        if(oldBitmap._baseTexture)oldBitmap._baseTexture.destroy();
        if(oldBitmap.__canvas)oldBitmap.__canvas.width=oldBitmap.__canvas.height=1;
        rec.sprite.bitmap=null;if(rec.sprite.parent)rec.sprite.parent.removeChild(rec.sprite);rec.sprite.destroy({texture:true,baseTexture:false});
        [rec.patch.raw,rec.patch.near,rec.patch.far].forEach(function(c){c.width=c.height=1;});
        set._albaActorShadows.splice(set._albaActorShadows.indexOf(rec),1);o._albaShadowRecord=null;return;
      }
      var rootX=o.x+$gameMap.displayX()*tw,rootY=o.y+ch.jumpHeight()-2+$gameMap.displayY()*th;
      albaPlacePatch(rec.patch,rootX,rootY);rec.sprite.visible=rec.sprite.visible&&o.visible&&o.opacity>0&&!ch.isTransparent()&&!ch._erased;
      rec.sprite.opacity=Math.round(255*settings.shadowStrength*settings.characterShadowOpacity*o.opacity/255*Math.max(.4,1-ch.jumpHeight()/160));
      if(!rec.sprite.visible)return;
      var sx=(o.characterBlockX()+o.characterPatternX())*pw,sy=(o.characterBlockY()+o.characterPatternY())*ph;
      var key=[ch.characterName(),ch.characterIndex(),sx,sy,Math.round(rootX),Math.round(rootY)].join(',');
      if(key!==rec.key){rec.key=key;albaDrawPatch(set,rec.patch,shadowSource,sx,sy,rootX,rootY,0);}
    });
    (set._albaObjectShadows||[]).forEach(function(p){albaPlacePatch(p,p.rootX,p.rootY);});
    (set._albaTreeShadows||[]).forEach(function(p){
      albaPlacePatch(p,p.rootX,p.rootY);if(!p.sprite.visible)return;
      var copy=p.tree.copies[0]||[],treeSprite=copy[0],sway=treeSprite&&treeSprite.transform?-Math.sin(treeSprite.skew.x)*treeSprite.scale.y*p.height:0;
      // Repaint only visible patches when the projected tip changes by a quarter pixel.
      var key=Math.round(sway*4);if(key!==p.key){p.key=key;albaDrawPatch(set,p,p.figure,0,0,p.rootX,p.rootY,sway);}
    });
  }
  // A restrained bright-pass bloom, inspired by the reference's post-processing.
  // Uses MV's bundled PIXI; windows and text remain outside the map filter.
  function albaReferenceBloom(){
    var afternoon=albaAfternoon();
    var frag=[
      'precision mediump float; varying vec2 vTextureCoord; uniform sampler2D uSampler; uniform vec4 filterArea; uniform float strength;',
      afternoon?'vec3 glow(vec2 uv){vec3 c=texture2D(uSampler,uv).rgb;float l=dot(c,vec3(.299,.587,.114));return c*smoothstep(.46,.74,l);}':'vec3 glow(vec2 uv){vec3 c=texture2D(uSampler,uv).rgb;float l=dot(c,vec3(.299,.587,.114));return c*smoothstep(.72,.94,l);}',
      afternoon?'void main(){vec4 t=texture2D(uSampler,vTextureCoord);vec2 d=vec2(5.0)/filterArea.xy;':'void main(){vec4 t=texture2D(uSampler,vTextureCoord);vec2 d=vec2(3.0)/filterArea.xy;',
      'vec3 b=(glow(vTextureCoord+d)+glow(vTextureCoord-d)+glow(vTextureCoord+vec2(d.x,-d.y))+glow(vTextureCoord+vec2(-d.x,d.y)))*.25;',
      afternoon?'vec3 c=t.rgb+b*strength*vec3(1.0,.86,.66);gl_FragColor=vec4(min(c,vec3(t.a)),t.a);}':'vec3 c=t.rgb+b*strength;gl_FragColor=vec4(min(c,vec3(t.a)),t.a);}'
    ].join('\n');return new PIXI.Filter(null,frag,{strength:{type:'1f',value:afternoon?KudasaiAlbaAfternoon.bloomStrength:.14}});
  }

  function hash(map, flags) {
    var h = 17,
      values = [map.width, map.height, map.tilesetId].concat(map.data, flags);
    for (var i = 0; i < values.length; i++)
      h = (Math.imul(h, 31) + (values[i] || 0)) | 0;
    return h;
  }
  window.KudasaiParallaxHash = hash;
  // Seamless multi-octave value noise: broad, irregular fog banks without discs.
  function makeMist(seed) {
    function random(x, y, n) {
      var v =
        Math.sin((x % n) * 127.1 + (y % n) * 311.7 + seed * 71.3) * 43758.5453;
      return v - Math.floor(v);
    }
    function noise(x, y, n) {
      var ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      return (
        (random(ix, iy, n) * (1 - fx) + random(ix + 1, iy, n) * fx) * (1 - fy) +
        (random(ix, iy + 1, n) * (1 - fx) + random(ix + 1, iy + 1, n) * fx) * fy
      );
    }
    var small = document.createElement("canvas");
    small.width = small.height = 256;
    var c = small.getContext("2d"),
      pixels = c.createImageData(256, 256);
    for (var y = 0; y < 256; y++)
      for (var x = 0; x < 256; x++) {
        var v =
          noise((x / 256) * 4, (y / 256) * 4, 4) * 0.64 +
          noise((x / 256) * 8, (y / 256) * 8, 8) * 0.25 +
          noise((x / 256) * 16, (y / 256) * 16, 16) * 0.11;
        var a = Math.pow(Math.max(0, (v - 0.25) / 0.75), 1.5),
          p = (y * 256 + x) * 4;
        pixels.data[p] = 181;
        pixels.data[p + 1] = 201;
        pixels.data[p + 2] = 203;
        pixels.data[p + 3] = Math.round(a * 245);
      }
    c.putImageData(pixels, 0, 0);
    var b = new Bitmap(1536, 1024);
    b._context.drawImage(small, 0, 0, 1536, 1024);
    b._setDirty();
    return b;
  }
  // Smooth only atmospheric tiling layers; leave tile and collision rendering intact.
  function smoothAtmosphere(sprite) {
    sprite.bitmap.smooth = true;
    sprite.updateTransform = function () {
      this.tilePosition.x = -this.origin.x;
      this.tilePosition.y = -this.origin.y;
      this.updateTransformTS();
    };
  }
  function makeGlow(rgb) {
    var tint = rgb ? rgb.join(',') : null;
    var b = new Bitmap(384, 384),
      c = b._context;
    // Gaussian falloff reaches zero gently, avoiding a visible circular border.
    var g = c.createRadialGradient(192, 192, 0, 192, 192, 190);
    for (var i = 0; i <= 24; i++) {
      var t = i / 24,
        a = i === 24 ? 0 : Math.exp(-t * t * 7) * 0.35;
      g.addColorStop(t, "rgba(" + (tint || '255,193,95') + "," + a + ")");
    }
    c.fillStyle = g;
    c.fillRect(0, 0, 384, 384);
    var core = c.createRadialGradient(192, 192, 0, 192, 192, 33);
    core.addColorStop(0, "rgba(" + (tint || '255,222,144') + ",.30)");
    core.addColorStop(0.35, "rgba(" + (tint || '255,207,112') + ",.16)");
    core.addColorStop(1, "rgba(" + (tint || '255,192,90') + ",0)");
    c.fillStyle = core;
    c.fillRect(150, 150, 84, 84);
    b._setDirty();
    return b;
  }
  function kudasaiLeafBitmap(color) {
      var b = new Bitmap(28, 20),
        c = b._context;
      b.smooth = true;
      c.fillStyle = color;
      c.strokeStyle = "rgba(41,57,29,.55)";
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(4, 14);
      c.bezierCurveTo(5, 4, 16, 2, 24, 4);
      c.bezierCurveTo(23, 13, 13, 18, 4, 14);
      c.fill();
      c.stroke();
      c.strokeStyle = "rgba(224,220,153,.6)";
      c.beginPath();
      c.moveTo(3, 16);
      c.quadraticCurveTo(13, 9, 23, 5);
      c.stroke();
      b._setDirty();
      return b;
  }
  window.KudasaiLeafArt={colors:['#8b9e55','#b8a168','#72945e'],create:kudasaiLeafBitmap};
  // Small cached leaf sprites; all motion is transform-only, with no per-frame canvas work.
  function createWindLeaves(set) {
    set._windLeaves = [];
    if (($gameMap._kudasaiLighting || {}).interior || $gameMap.mapId() === 4)
      return;
    var colors = ["#8b9e55", "#b8a168", "#72945e"],
      textures = [];
    colors.forEach(function (color) {
      var b=kudasaiLeafBitmap(color);
      textures.push(b);
      set._cinemaOwned.push(b);
    });
    for (var i = 0; i < ([8,16,17].indexOf($gameMap.mapId())>=0?0:36); i++) {
      var leaf = new Sprite(textures[i % 3]);
      leaf.anchor.set(0.5, 0.5);
      leaf._seed = i * 2.399;
      leaf._depth = 0.55 + (i % 5) * 0.105;
      leaf._u = ((i * 173) % 997) / 997;
      leaf._v = ((i * 347) % 991) / 991;
      set._baseSprite.addChild(leaf);
      set._windLeaves.push(leaf);
    }
    var gardenNote=($dataMap.note||'').match(/<KudasaiGardenLeaves:(\{[^>]+\})>/);
    if(gardenNote){
      var garden;try{garden=JSON.parse(gardenNote[1]);}catch(e){return;}
      var greenCells=[];
      for(var gy=garden.y;gy<garden.y+garden.h;gy++)for(var gx=garden.x;gx<garden.x+garden.w;gx++){
        // Only the fully grassy A2 cell: edge autotiles can contain pavement or sand.
        if($dataMap.data[gy*$dataMap.width+gx]===2816)greenCells.push({x:gx,y:gy});
      }
      var count=Math.min(36,garden.count||18,greenCells.length);
      for(var j=0;j<count;j++){
        var small=new Sprite(textures[j%3]);small.anchor.set(.5,.5);
        small._seed=j*2.399;small._greenCell=greenCells[Math.floor((j+.5)*greenCells.length/count)];
        small._garden=garden;set._baseSprite.addChild(small);set._windLeaves.push(small);
      }
    }
  }
  function updateGardenLeaf(set, leaf, x, y) {
    var cell=leaf._greenCell, state=set._kudasaiTrees;
    if(state!==leaf._breezeState){
      leaf._breezeState=state;leaf._breezeTree=null;
      var nearest=Infinity;
      ((state&&state.records)||[]).forEach(function(tree){
        if(tree.isFoliage)return;
        var dx=tree.x+tree.w/2-cell.x-.5,dy=tree.y+tree.h/2-cell.y-.5,d=dx*dx+dy*dy;
        if(d<nearest){nearest=d;leaf._breezeTree=tree;}
      });
    }
    var seed=leaf._breezeTree?leaf._breezeTree.seed:(cell.x*.37+cell.y*.21)%(Math.PI*2);
    var gust=state&&window.KudasaiTreeBreeze?state.gain*window.KudasaiTreeBreeze(state.frame,seed):0;
    // Three times the leaf travel, sharing the crown wind clock; full sprite stays inside grass.
    leaf.x=cell.x*48+24+gust*3-x;
    leaf.y=cell.y*48+24+gust*.9-y;
    leaf.rotation=leaf._seed+gust*.09;
    leaf.scale.set(.6,.48);leaf.opacity=185;
    leaf.visible=leaf.x>-30&&leaf.y>-30&&leaf.x<Graphics.width+30&&leaf.y<Graphics.height+30;
  }
  Spriteset_Map.prototype.updateKudasaiGardenLeaves=function(){
    var set=this,x=$gameMap.displayX()*$gameMap.tileWidth(),y=$gameMap.displayY()*$gameMap.tileHeight();
    (this._windLeaves||[]).forEach(function(leaf){if(leaf._garden)updateGardenLeaf(set,leaf,x,y);});
  };
  function updateWindLeaves(set, time, x, y) {
    var w = Graphics.width + 160,
      h = Graphics.height + 160;
    function wrap(v, size) {
      return (((v % size) + size) % size) - 80;
    }
    (set._windLeaves || []).forEach(function (leaf) {
      if(leaf._garden){
        updateGardenLeaf(set,leaf,x,y);
        return;
      }
      var cityTime=[8,16,17].indexOf($gameMap.mapId())>=0?time*.28:time;
      var p = leaf._seed,
        d = leaf._depth;
      var wind = cityTime * (0.65 + d * 0.55) + 22 * Math.sin(cityTime * 0.012 + p);
      leaf.x = wrap(leaf._u * w + wind - x * d, w);
      leaf.y = wrap(
        leaf._v * h +
          cityTime * (0.16 + d * 0.09) +
          19 * Math.sin(cityTime * 0.021 + p) -
          y * d,
        h,
      );
      leaf.rotation = 0.3 * Math.sin(cityTime * 0.019 + p) + cityTime * 0.009 + p;
      leaf.scale.set(d * (0.6 + 0.4 * Math.cos(cityTime * 0.045 + p)), d * 0.66);
      // Fade before wrapping outside the screen, including camera and resize changes.
      var edge = Math.min(
        leaf.x + 60,
        Graphics.width + 60 - leaf.x,
        leaf.y + 60,
        Graphics.height + 60 - leaf.y,
      );
      leaf.opacity = (130 + d * 65) * Math.max(0, Math.min(1, edge / 55));
    });
  }
  // Authored world-space illumination, cached once: no full-map redraw each frame.
  // Roofs/walls are excluded from ground light; glass emission follows the exact tile pixels.
  function buildAlbaMood(set){
    if([8,16,17].indexOf($gameMap.mapId())<0||KudasaiDaylight.isInterior())return;
    var match=($dataMap.note||'').match(/<KudasaiAlbaMood:(\{[^>]+\})>/);if(!match)return;
    var profile;try{profile=JSON.parse(match[1]);}catch(e){console.error('Kudasai: luz del Alba inválida',e);return;}
    var scale=2,tw=$gameMap.tileWidth(),th=$gameMap.tileHeight(),w=$dataMap.width*tw/scale,h=$dataMap.height*th/scale,n=$dataMap.width*$dataMap.height;
    var mask=albaCanvas(w,h),mc=mask.getContext('2d');mc.fillStyle='#fff';
    for(var y=0;y<$dataMap.height;y++)for(var x=0;x<$dataMap.width;x++){
      var wall=false;for(var z=0;z<4;z++){var tile=$dataMap.data[z*n+y*$dataMap.width+x];if(Tilemap.isRoofTile(tile)||Tilemap.isWallTile(tile)){wall=true;break;}}
      if(!wall&&$gameMap.regionId(x,y)!==1)mc.fillRect(x*tw/scale,y*th/scale,tw/scale,th/scale);
    }
    set._albaMood={profile:profile,layers:[],windows:0,lamps:0,cacheBuilds:1};
    function ellipse(context,x,y,rx,ry,angle,color,alpha){
      context.save();context.translate(x*tw/scale,y*th/scale);context.rotate(angle);context.scale(rx*tw/scale,ry*th/scale);
      var gradient=context.createRadialGradient(0,0,0,0,0,1);for(var i=0;i<=12;i++){var t=i/12;gradient.addColorStop(t,'rgba('+color.join(',')+','+alpha*Math.pow(1-t*t,2)+')');}
      context.fillStyle=gradient;context.fillRect(-1,-1,2,2);context.restore();
    }
    function layer(bitmap,blend,ground,beforeMask){
      var context=bitmap._context;if(ground){context.globalCompositeOperation='destination-in';context.drawImage(mask,0,0);context.globalCompositeOperation='source-over';}
      bitmap._setDirty();bitmap.smooth=true;var sprite=new Sprite(bitmap);sprite.scale.set(scale,scale);sprite.blendMode=blend;
      // Ambient affects shade; shafts are added afterwards. Both remain below window glow.
      var index=set._baseSprite.children.indexOf(set._kudasaiLightSprite);set._baseSprite.addChildAt(sprite,index+(beforeMask?0:1));
      set._albaMood.layers.push(sprite);return sprite;
    }
    var shade=new Bitmap(w,h),sc=shade._context;
    [[5,20,8,7],[38,18,5,6],[45,23,5,4],[63,33,8,5],[6,33,7,5]].forEach(function(v){ellipse(sc,v[0],v[1],v[2],v[3],-.32,profile.moon?[79,91,139]:[93,108,139],profile.shadeStrength);});
    layer(shade,PIXI.BLEND_MODES.MULTIPLY,true,true);
    var sun=new Bitmap(w,h),c=sun._context;
    // Broad pools and feathered shafts, not sharp bands. Fixed relative to the city.
    [[24,20.5,9,7],[41.5,20,7,6],[40,13,12,3.5],[25,28,12,3.2],[58,27,10,3.4],[7,20,5,4]].forEach(function(v){ellipse(c,v[0],v[1],v[2],v[3],profile.moon?-.48:.48,profile.sunColor,profile.sunStrength);});
    if(!profile.moon){[[40,20,8,1.05],[43,18,7,.65],[23,20,8,1.35]].forEach(function(v){ellipse(c,v[0],v[1],v[2],v[3],.48,profile.sunColor,profile.sunStrength*.65);});}
    layer(sun,PIXI.BLEND_MODES.SCREEN,true,false);
    // Pixel-aligned panes preserve frames and mullions; no new image assets are required.
    var glass=new Bitmap($dataMap.width*tw,$dataMap.height*th),gc=glass._context;
    ($gameMap._kudasaiLighting.lights||[]).forEach(function(l){
      if(l.kind==='window'){
        var tx=Math.floor(l.x),ty=Math.floor(l.y)-1,found=false;
        for(var z=0;z<4;z++)if($gameMap.tileId(tx,ty,z)===32)found=true;if(!found)return;
        gc.fillStyle='rgba(255,210,145,'+profile.paneAlpha+')';
        [[16,15,7,8],[26,15,6,8],[16,25,7,7],[26,25,6,7]].forEach(function(r){gc.fillRect(tx*tw+r[0],ty*th+r[1],r[2],r[3]);});
        gc.fillStyle='rgba(255,241,194,'+profile.paneAlpha*.45+')';gc.fillRect(tx*tw+16,ty*th+15,2,3);gc.fillRect(tx*tw+26,ty*th+15,2,3);set._albaMood.windows++;
      }else if(l.kind==='lamp'){
        var tx=Math.floor(l.x),ty=Math.floor(l.y)-1;gc.fillStyle='rgba(255,236,182,'+profile.lampAlpha+')';gc.fillRect(tx*tw+28,ty*th+16,10,6);set._albaMood.lamps++;
      }
    });
    glass._setDirty();glass.smooth=false;var emitted=new Sprite(glass);emitted.blendMode=PIXI.BLEND_MODES.NORMAL;
    set._baseSprite.addChildAt(emitted,set._baseSprite.children.indexOf(set._kudasaiLightSprite)+2);set._albaMood.layers.push(emitted);
    mask.width=mask.height=1;
  }
  function updateAlbaMood(set,x,y){
    if(!set._albaMood)return;set._albaMood.layers.forEach(function(sp){sp.x=-x;sp.y=-y;});
  }
  function disposeAlbaMood(set){
    if(!set._albaMood)return;set._albaMood.layers.forEach(function(sp){var b=sp.bitmap;sp.bitmap=null;if(sp.parent)sp.parent.removeChild(sp);sp.destroy({texture:true,baseTexture:false});if(b){if(b._baseTexture)b._baseTexture.destroy();if(b.__canvas)b.__canvas.width=b.__canvas.height=1;}});set._albaMood.layers=[];set._albaMood=null;
  }

  function daylightGrade(interior){
    if(albaDay())return albaDayGrade();
    // World-space sunlight: stable while walking; window/text layers are excluded.
    var frag=[
      'precision highp float;',
      'varying vec2 vTextureCoord; uniform sampler2D uSampler;',
      'uniform vec4 filterArea; uniform vec2 worldOffset; uniform float outdoor;',
      'float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}',
      'float rand(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(rand(i),rand(i+vec2(1.0,0.0)),f.x),mix(rand(i+vec2(0.0,1.0)),rand(i+1.0),f.x),f.y);}',
      'void main(){vec4 t=texture2D(uSampler,vTextureCoord);',
      'vec3 c=t.rgb/max(t.a,0.001);float lum=dot(c,vec3(0.299,0.587,0.114));',
      'vec2 p=vTextureCoord*filterArea.xy+filterArea.zw+worldOffset;',
      'float crossRay=p.x-0.60*p.y;float cell=floor(crossRay/640.0);float rays=0.0;',
      'for(int j=-1;j<=1;j++){float k=cell+float(j);float center=k*640.0+80.0+hash(k+9.0)*360.0;',
      'float width=65.0+hash(k+23.0)*90.0;float d=(crossRay-center)/width;',
      'float along=0.70+0.30*noise(vec2(p.y/650.0,k+20.0));',
      'rays+=exp(-d*d*1.5)*along;}',
      'float canopy=noise(p/300.0)*0.65+noise(p/105.0)*0.35;',
      'float shade=smoothstep(0.32,0.78,canopy);',
      'float sun=clamp(rays*(0.80+0.20*noise(p/145.0)),0.0,1.0);',
      'vec3 base=mix(vec3(lum),c,1.13)*vec3(1.045,1.005,0.94);',
      'float green=smoothstep(0.015,0.22,c.g-max(c.r,c.b));base+=green*vec3(0.065,0.015,-0.025);',
      'vec3 shaded=base*mix(vec3(0.90,0.93,0.88),vec3(0.68,0.77,0.73),shade);',
      'vec3 lit=shaded*(1.0+sun*0.26);',
      'float haze=sun*0.30*smoothstep(0.025,0.19,lum);',
      'lit=1.0-(1.0-lit)*(1.0-vec3(1.0,0.82,0.40)*haze);',
      'vec3 indoor=base*vec3(1.02,1.0,0.99);',
      'vec3 finalColor=mix(indoor,lit,outdoor);',
      'gl_FragColor=vec4(clamp(finalColor,0.0,1.0)*t.a,t.a);}'
    ].join('\n');
    return new PIXI.Filter(null,frag,{worldOffset:{type:'v2',value:[0,0]},outdoor:{type:'1f',value:interior?0.0:1.0}});
  }
  var createTone = Spriteset_Map.prototype.createWebGLToneChanger;
  Spriteset_Map.prototype.createWebGLToneChanger=function(){
    createTone.apply(this,arguments);
    var effects=[];if(this._daylightGrade)effects.push(this._daylightGrade);if(this._albaBloom)effects.push(this._albaBloom);
    this._baseSprite.filters=effects.concat(this._baseSprite.filters||[]);
  };
  var create = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function () {
    create.call(this);
    // The pastel city uses authored tile colors, including its editor preview.
    // Keep the old cinematic grade off these maps so it cannot shift the palette.
    var pastel=/<KudasaiPastel>/i.test($dataMap.note||'');
    if(!pastel&&KudasaiDaylight.isDay()){
      this._daylightGrade=daylightGrade(KudasaiDaylight.isInterior());
      this._baseSprite.filters=(this._baseSprite.filters||[]).concat([this._daylightGrade]);
    }
    if(!pastel&&albaSolar()&&Graphics.isWebGL()){this._albaBloom=albaReferenceBloom();this._baseSprite.filters=(this._baseSprite.filters||[]).concat([this._albaBloom]);}
    var match = ($dataMap.note || "").match(/<KudasaiParallax:(\{[^>]+\})>/);
    if (!match) return;
    var config;
    try {
      config = JSON.parse(match[1]);
    } catch (e) {
      return;
    }
    if (config.hash !== hash($dataMap, $gameMap.tilesetFlags())) {
      this._parallax.visible = false;
      return;
    }
    this._kudasaiParallax = config;
    var data = $dataMap.data.slice(),
      n = $dataMap.width * $dataMap.height,
      flags = $gameMap.tilesetFlags();
    for (var i = 0; i < n; i++) {
      var animated = false;
      for (var z = 0; z < 4; z++)
        if (Tilemap.isTileA1(data[z * n + i])) animated = true;
      if (animated) continue;
      for (var layer = 0; layer < 4; layer++)
        if (!(flags[data[layer * n + i]] & 16)) data[layer * n + i] = 0;
      data[4 * n + i] = 0;
    }
    this._tilemap.setData($dataMap.width, $dataMap.height, data);
    this._parallaxShadow = new Sprite(ImageManager.loadParallax(config.shadow));
    if(albaSolar())this._parallaxShadow.visible=false; // Replace the old rectangular contact outline in daylight.
    this._baseSprite.addChildAt(
      this._parallaxShadow,
      this._baseSprite.children.indexOf(this._tilemap),
    );
    this._parallaxTime = 0;
    this._cinemaOwned = [];
    this._cinemaFog = [];
    this._cinemaGlows = [];
    if (config.fog > 0 && !albaSolar()) {
      for (var layer = 0; layer < 2; layer++) {
        var b = makeMist(layer + 7),
          mist = new TilingSprite(b);
        smoothAtmosphere(mist);
        mist.move(0, 0, Graphics.width, Graphics.height);
        mist.opacity = config.sun
          ? layer === 0
            ? 100
            : 65
          : layer === 0
            ? $gameMap.mapId() === 6
              ? 240
              : 225
            : 165;
        if(KudasaiDaylight.isDay())mist.opacity=layer===0?18:10;
        if(Array.isArray(config.fogOpacity)&&isFinite(config.fogOpacity[layer]))mist.opacity=Math.max(0,Math.min(255,config.fogOpacity[layer]));
        this._baseSprite.addChild(mist);
        this._cinemaFog.push(mist);
        this._cinemaOwned.push(b);
      }
    }
    // Directional sunbeams are composited by the world-space daylight filter.
    // Wider window shafts for interiors, fading before the player loses contrast.
    this._windowShafts = [];
    if ($gameMap._kudasaiLighting && $gameMap._kudasaiLighting.interior) {
      var wb = new Bitmap(264, 344),
        wc = wb._context;
      wc.filter = "blur(10px)";
      wc.beginPath();
      wc.moveTo(112, 16);
      wc.lineTo(152, 16);
      wc.lineTo(248, 328);
      wc.lineTo(16, 328);
      wc.closePath();
      var wg = wc.createLinearGradient(0, 16, 0, 328);
      wg.addColorStop(0, "rgba(255,227,174,0)");
      wg.addColorStop(0.16, "rgba(255,227,174,.40)");
      wg.addColorStop(0.65, "rgba(255,227,174,.15)");
      wg.addColorStop(1, "rgba(255,227,174,0)");
      wc.fillStyle = wg;
      wc.fill();
      wc.filter = "none";
      wb._setDirty();
      this._cinemaOwned.push(wb);
      $gameMap._kudasaiLighting.lights.forEach(function (l) {
        if (!l.beam) return;
        var shaft = new Sprite(wb);
        shaft.anchor.set(0.5, 0);
        shaft._source = l;
        shaft.opacity = 125;
        shaft.blendMode = PIXI.BLEND_MODES.ADD;
        this._baseSprite.addChild(shaft);
        this._windowShafts.push(shaft);
      }, this);
    }
    // Bloom lives above the ambient mask so lamps can illuminate the haze.
    var glow = makeGlow();
    this._cinemaOwned.push(glow);
    var pane = new Bitmap(32, 32),
      pc = pane._context;
    pc.fillStyle = "rgba(255,218,132,.8)";
    for (var py = 0; py < 2; py++)
      for (var px = 0; px < 2; px++)
        pc.fillRect(5 + px * 12, 4 + py * 11, 9, 8);
    pane._setDirty();
    this._cinemaOwned.push(pane);
    var lights = $gameMap._kudasaiLighting
      ? $gameMap._kudasaiLighting.lights
      : [];
    var glowPalette = {};
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i],
        sp = new Sprite(glow);
      if(Array.isArray(l.glowColor)&&l.glowColor.length===3){
        var glowKey=l.glowColor.join(',');
        if(!glowPalette[glowKey]){glowPalette[glowKey]=makeGlow(l.glowColor);this._cinemaOwned.push(glowPalette[glowKey]);}
        sp.bitmap=glowPalette[glowKey];
      }
      sp.anchor.set(0.5, 0.5);
      sp.blendMode = PIXI.BLEND_MODES.ADD;
      sp._source = l;
      sp._phase = i * 2.7;
      sp.scale.set(l.flicker ? 0.8 : 1, l.flicker ? 0.95 : 0.78);
      if(isFinite(l.glowScale))sp.scale.set(Math.max(0.1,l.glowScale));
      this._baseSprite.addChild(sp);
      this._cinemaGlows.push(sp);
      if (
        !l.flicker && !l.noPane &&
        $gameMap.tileId(Math.floor(l.x), Math.floor(l.y) - 1, 2) === 32
      ) {
        var glass = new Sprite(pane);
        glass.anchor.set(0.5, 0.5);
        glass.blendMode = PIXI.BLEND_MODES.ADD;
        glass._source = l;
        glass._phase = 0;
        glass._glass = true;
        this._baseSprite.addChild(glass);
        this._cinemaGlows.push(glass);
      }
    }
    var vb = new Bitmap(Graphics.width, Graphics.height),
      vc = vb._context;
    var vg = vc.createRadialGradient(
      vb.width / 2,
      vb.height / 2,
      vb.height * 0.28,
      vb.width / 2,
      vb.height / 2,
      vb.width * 0.65,
    );
    vg.addColorStop(0, "rgba(5,14,20,0)");
    vg.addColorStop(1, $gameMap.mapId()===17 ? "rgba(13,17,38,.09)" : albaSolar() ? "rgba(0,0,0,0)" : KudasaiDaylight.isDay() ? "rgba(73,42,30,.13)" : config.sun ? "rgba(34,28,15,.13)" : "rgba(5,14,20,.32)");
    vc.fillStyle = vg;
    vc.fillRect(0, 0, vb.width, vb.height);
    vb._setDirty();
    this._cinemaVignette = new Sprite(vb);
    this._baseSprite.addChild(this._cinemaVignette);
    this._cinemaOwned.push(vb);
    createWindLeaves(this);
    buildAlbaMood(this);
  };
  var update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function () {
    update.call(this);
    if(this._daylightGrade&&this._daylightGrade.uniforms.worldOffset)this._daylightGrade.uniforms.worldOffset=[$gameMap.displayX()*$gameMap.tileWidth(),$gameMap.displayY()*$gameMap.tileHeight()];
    if (!this._kudasaiParallax) return;
    var x = $gameMap.displayX() * $gameMap.tileWidth(),
      y = $gameMap.displayY() * $gameMap.tileHeight();
    this._parallaxShadow.x = -x;
    this._parallaxShadow.y = -y;
    if(albaSolar()&&this._kudasaiTrees&&!this._albaCastLight)buildAlbaCastLight(this);
    if(this._albaCastLight){this._albaCastLight.x=-x;this._albaCastLight.y=-y;updateAlbaActorShadows(this);}
    if(this._albaSunlight){
      this._albaSunlight.x=this._albaSunlight.y=0;
      this._albaSunlight.scale.set(Graphics.width/2,Graphics.height/2);
    }
    updateAlbaMood(this,x,y);
    this._parallaxTime++;
    var time = this._parallaxTime;
    updateWindLeaves(this, time, x, y);
    (this._windowShafts || []).forEach(function (sp) {
      sp.x = sp._source.x * $gameMap.tileWidth() - x;
      sp.y = (sp._source.y - 0.6) * $gameMap.tileHeight() - y;
    });
    if (this._sunRays) {
      this._sunRays.x = -x;
      this._sunRays.y = -y;
      this._sunRays.opacity = this._kudasaiParallax.rayOpacity === undefined ? 125 : this._kudasaiParallax.rayOpacity;
    }

    (this._cinemaFog || []).forEach(function (m, i) {
      m.move(0, 0, Graphics.width, Graphics.height);
      m.origin.x =
        x * (i === 0 ? 0.98 : 0.87) + time * (i === 0 ? 0.26 : -0.14);
      m.origin.y =
        y * (i === 0 ? 0.98 : 0.87) + time * (i === 0 ? 0.035 : 0.018);
    });
    (this._cinemaGlows || []).forEach(function (sp) {
      var l = sp._source;
      sp.x = l.x * $gameMap.tileWidth() - x;
      sp.y = (l.y - (isFinite(l.glowYOffset)?l.glowYOffset:(l.flicker ? 0.22 : 0.6))) * $gameMap.tileHeight() - y;
      sp.opacity =
        (isFinite(l.glowOpacity) ? Math.max(0,Math.min(255,l.glowOpacity)) : (KudasaiDaylight.isDay()||albaAfternoon()) ? (l.flicker?55:32) : (sp._glass ? 145 : l.flicker ? 125 : 140)) *
        (1 + (l.flicker ? 0.035 : 0) * Math.sin(time * 0.08 + sp._phase));
    });
    if (this._cinemaVignette)
      this._cinemaVignette.scale.set(
        Graphics.width / this._cinemaVignette.bitmap.width,
        Graphics.height / this._cinemaVignette.bitmap.height,
      );
  };
  var terminate = Scene_Map.prototype.terminate;
  Scene_Map.prototype.terminate = function () {
    terminate.call(this);
    var set = this._spriteset;
    if (set) {
      disposeAlbaMood(set);
      (set._cinemaOwned || []).forEach(function (b) {
        if (b._baseTexture) b._baseTexture.destroy();
      });
      set._cinemaOwned = [];
      (set._albaShadowPatches||[]).forEach(function(p){
        var sp=p.sprite;if(sp.bitmap&&sp.bitmap.__canvas)sp.bitmap.__canvas.width=sp.bitmap.__canvas.height=1;
        sp.bitmap=null;if(sp.parent)sp.parent.removeChild(sp);sp.destroy({texture:true,baseTexture:false});
        [p.raw,p.near,p.far,p.figure].forEach(function(c){if(c)c.width=c.height=1;});
      });
      (set._albaActorShadows||[]).forEach(function(r){r.owner._albaShadowRecord=null;});
      set._albaShadowPatches=null;set._albaActorShadows=null;set._albaTreeShadows=null;set._albaObjectShadows=null;set._albaGroundCells=null;
      if(set._albaBloom){set._baseSprite.filters=(set._baseSprite.filters||[]).filter(function(f){return f!==set._albaBloom;});set._albaBloom=null;}
      if(set._albaSunlight){
        var sun=set._albaSunlight,sunBitmap=sun.bitmap;
        if(sunBitmap&&sunBitmap.__canvas)sunBitmap.__canvas.width=sunBitmap.__canvas.height=1;
        sun.bitmap=null;if(sun.parent)sun.parent.removeChild(sun);sun.destroy({texture:true,baseTexture:false});
        set._albaSunlight=null;
      }
      if(set._albaCastLight){
        var lamp=set._albaCastLight,lightBitmap=lamp.bitmap;
        if(lightBitmap&&lightBitmap.__canvas)lightBitmap.__canvas.width=lightBitmap.__canvas.height=1;
        lamp.bitmap=null;if(lamp.parent)lamp.parent.removeChild(lamp);lamp.destroy({texture:true,baseTexture:false});
        set._albaCastLight=null;set._albaLightGeometry=null;
      }
    }
  };
  // Full-size recess below each animated door, above the facade tiles.
  // Match the sprite frame instead of using the small black window tile.
  var doorUpdate = Sprite_Character.prototype.update;
  Sprite_Character.prototype.update = function () {
    doorUpdate.call(this);
    var c = this._character,
      door =
        c instanceof Game_Event &&
        c.characterName() === "!Door1" &&
        c.characterIndex() === 4 &&
        /^Puerta/.test(c.event().name);
    if (!door || !this.parent) {
      if (this._doorRecess) this._doorRecess.visible = false;
      return;
    }
    var w = this.patternWidth(),
      h = this.patternHeight();
    if (!w || !h) return;
    if (!this._doorRecess) {
      this._doorRecess = new PIXI.Graphics();
      this._doorRecess.z = 2;
      this._doorRecess.spriteId = this.spriteId - 0.5;
      this.parent.addChild(this._doorRecess);
    }
    var recess = this._doorRecess;
    if (recess._doorW !== w || recess._doorH !== h) {
      recess.clear();
      recess.beginFill(0x000000, 1);
      recess.drawRect(-w / 2, -h, w, h);
      recess.endFill();
      recess._doorW = w;
      recess._doorH = h;
    }
    recess.x = this.x;
    recess.y = this.y;
    recess.visible = this.visible;
    recess.alpha = this.alpha;
  };
  var doorDestroy = Sprite_Character.prototype.destroy;
  Sprite_Character.prototype.destroy = function (options) {
    if (this._doorRecess) {
      if (this._doorRecess.parent)
        this._doorRecess.parent.removeChild(this._doorRecess);
      this._doorRecess.destroy();
      this._doorRecess = null;
    }
    doorDestroy.call(this, options);
  };
})();

// Reference-matched cottage architecture for the three Alba time variants.
// Replace only the tile renderer's house pixels: map data, collisions and events
// retain their original values. The architecture and door leaves are separate
// native PNGs; no character sheets are modified.
(function() {
  'use strict';
  var houses = [[3,3,12,11,10,1],[35,3,44,11,11,0],[50,3,57,11,17,1],[62,3,69,11,18,0],[14,4,21,11,12,0],[28,5,33,11,13,1],[50,17,57,24,19,0,12],[3,30,11,36,14,0],[18,30,31,37,16,1],[38,30,45,36,15,1],[50,30,57,37,21,0],[62,30,69,37,22,1]];
  function active() {
    return $gameMap && [8,16,17].indexOf($gameMap.mapId()) >= 0 &&
      $gameMap.tilesetId() === 15 && $gameMap.width() === 72 &&
      $gameMap.height() === 42 &&
      $gameMap.parallaxName() === '!Kudasai_VerdeNatural_20261101';
  }
  function houseDoor(sprite) {
    var c = sprite._character;
    if (!active() || !(c instanceof Game_Event) ||
        c.characterName() !== '!$Kudasai_Puerta_Madera') return null;
    for (var i = 0; i < houses.length; i++)
      if (houses[i][4] === c.eventId()) return houses[i];
    return null;
  }
  var read = Tilemap.prototype._readMapData;
  Tilemap.prototype._readMapData = function(x, y, z) {
    if (this._pastelCottageMask && z < 5 &&
        this._pastelCottageMask[y * this._mapWidth + x] &&
        x >= 0 && x < this._mapWidth && y >= 0 && y < this._mapHeight) return 0;
    return read.apply(this, arguments);
  };
  var create = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function() {
    create.apply(this, arguments);
    if (!active()) return;
    var mask = new Uint8Array($gameMap.width() * $gameMap.height());
    houses.forEach(function(h) {
      for (var y = h[1]; y < h[3]; y++)
        for (var x = h[0]; x < h[2]; x++) mask[y * $gameMap.width() + x] = 1;
    });
    var ground = new Sprite(ImageManager.loadParallax('Kudasai_Casas_Suelo_Entradas_20261102'));
    ground.z = 0.5;
    this._tilemap.addChild(ground);
    this._pastelCottageGround = ground;
    var sprite = new Sprite(ImageManager.loadParallax('Kudasai_Casas_EscalonesBase_20261108'));
    sprite.z = 2;
    this._tilemap.addChild(sprite);
    this._pastelCottages = sprite;
    this._tilemap._pastelCottageMask = mask;
    this._tilemap.refresh();
  };
  var update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function() {
    update.apply(this, arguments);
    if (this._pastelCottages) {
      this._pastelCottages.x = -Math.floor($gameMap.displayX() * $gameMap.tileWidth());
      this._pastelCottages.y = -Math.floor($gameMap.displayY() * $gameMap.tileHeight());
      this._pastelCottageGround.x = this._pastelCottages.x;
      this._pastelCottageGround.y = this._pastelCottages.y;
      // Old wall-hung planters are independent animated sprites. The new
      // facade already supplies its own flower boxes; hide only these fixtures.
      if (this._kudasaiTrees) this._kudasaiTrees.records.forEach(function(t) {
        if (!t.anchorTop || !t.isFoliage) return;
        var inside = houses.some(function(h) {
          return t.x >= h[0] && t.y >= h[1] && t.x + t.w <= h[2] && t.y + t.h <= h[3];
        });
        if (inside) t.copies.forEach(function(copy) { copy.forEach(function(s) { s.alpha = 0; }); });
      });
    }
  };
  var bitmap = Sprite_Character.prototype.setCharacterBitmap;
  Sprite_Character.prototype.setCharacterBitmap = function() {
    bitmap.apply(this, arguments);
    var h = houseDoor(this);
    if (h) {
      this.bitmap = ImageManager.loadParallax('Kudasai_Casas_Puerta_' + h[5] + '_Limpia_ContornosSelectivos_20261102');
      this._isBigCharacter = true;
    }
  };
  var position = Sprite_Character.prototype.updatePosition;
  Sprite_Character.prototype.updatePosition = function() {
    position.apply(this, arguments);
    var h = houseDoor(this);
    if (h) { this.y -= 25; this.x += h[6] || 0; }
  };
})();

// Natural grass uses transparent native autotiles over a masked parallax.
// Match the tile renderer's integer scroll exactly, then place subtle static
// cast shadows above ground and below characters/upper foliage.
(function() {
  'use strict';
  function naturalGrass() { return $gameMap.parallaxName() === '!Kudasai_VerdeNatural_20261101'; }
  var updateParallax = Spriteset_Map.prototype.updateParallax;
  Spriteset_Map.prototype.updateParallax = function() {
    updateParallax.apply(this, arguments);
    if (!naturalGrass() || !this._parallax || !this._tilemap) return;
    if (!(this._tilemap instanceof ShaderTilemap) || this._tilemap.roundPixels) {
      // TilingSprite rounds its origin, whereas ShaderTilemap floors it.
      // An integer origin avoids the one-pixel gaps during camera movement.
      this._parallax.origin.x = Math.floor($gameMap.parallaxOx());
      this._parallax.origin.y = Math.floor($gameMap.parallaxOy());
    }
  };
  var create = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function() {
    create.apply(this, arguments);
    if (!naturalGrass()) return;
    var shadow = new Sprite(ImageManager.loadParallax('Kudasai_Sombras_GremiosUnaPlanta_20261104'));
    shadow.z = 1;
    this._tilemap.addChild(shadow);
    this._naturalSoftShadows = shadow;
  };
  var update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function() {
    update.apply(this, arguments);
    if (this._naturalSoftShadows) {
      this._naturalSoftShadows.x = -Math.floor($gameMap.displayX() * $gameMap.tileWidth());
      this._naturalSoftShadows.y = -Math.floor($gameMap.displayY() * $gameMap.tileHeight());
    }
  };
})();

