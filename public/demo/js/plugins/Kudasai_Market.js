/*:
 * @plugindesc v20261108.2 Mercado de Alba: perímetro limpio, arena completa y puestos sin restos del toldo.
 * @requiredAssets img/parallaxes/Kudasai_Mercado_Caja_Corregida_20261108
 * @help Recursos: data/Kudasai_Market.json. Las colisiones se limitan a la plaza.
 */
(function(){'use strict';
 window.$dataKudasaiMarket=null;
 DataManager._databaseFiles.push({name:'$dataKudasaiMarket',src:'Kudasai_Market.json'});
 function active(){return $gameMap&&$dataKudasaiMarket&&$dataKudasaiMarket.maps.indexOf($gameMap.mapId())>=0;}
 // Replace only the visual autotile shape. Logical tiles, regions and events
 // retain their original values, including collisions in existing saves.
 var readMapData=Tilemap.prototype._readMapData;
 Tilemap.prototype._readMapData=function(x,y,z){
  var b=this._marketFinishBounds;
  if(b&&x>=b[0]&&y>=b[1]&&x<b[2]&&y<b[3]){
   if(z===0)return 2912;
   if(z===2&&this._marketCrateCells[y*this._mapWidth+x])return 0;
  }
  return readMapData.apply(this,arguments);
 };
 function finishPlaza(set){
  var b=$dataKudasaiMarket.bounds,w=$gameMap.width(),n=w*$gameMap.height();
  if(!b||w!==72||$gameMap.height()!==42)return;
  for(var y=b[1];y<b[3];y++)for(var x=b[0];x<b[2];x++){
   if(!Tilemap.isAutotile($dataMap.data[y*w+x])||Tilemap.getAutotileKind($dataMap.data[y*w+x])!==18)return;
  }
  var crates={};set._marketFixtures=[];set._tilemap._marketFinishBounds=b.slice();set._tilemap._marketCrateCells=crates;
  var width=(b[2]-b[0])*48,height=(b[3]-b[1])*48,bitmap=new Bitmap(width,height);
  bitmap.smooth=false;
  // Continuous integer-pixel lines, with no doubled corners or grass holes.
  ['#9b839d','#f1e3c9'].forEach(function(color,inset){
   var ww=width-inset*2,hh=height-inset*2;
   bitmap.fillRect(inset,inset,ww,1,color);bitmap.fillRect(inset,height-inset-1,ww,1,color);
   bitmap.fillRect(inset,inset,1,hh,color);bitmap.fillRect(width-inset-1,inset,1,hh,color);
  });
  var border=new Sprite(bitmap);border.z=1.05;border._marketX=b[0]*48;border._marketY=b[1]*48;border._marketOwned=true;
  set._tilemap.addChild(border);set._marketFixtures.push(border);
  // Replace only the two actual native E tiles. Cinematic maps without those
  // tiles must not acquire additional crates or collision objects.
  [[3,17],[10,17]].forEach(function(p){
   var key=p[1]*w+p[0];if($dataMap.data[2*n+key]!==802)return;crates[key]=true;
   var source=ImageManager.loadParallax('Kudasai_Mercado_Caja_Corregida_20261108');source.smooth=false;
   var sprite=new Sprite(source);sprite.anchor.set(.5,1);sprite.z=3;
   sprite._marketX=(p[0]+.5)*48;sprite._marketY=(p[1]+1)*48;
   set._tilemap.addChild(sprite);set._marketFixtures.push(sprite);
  });
  set._tilemap.refresh();
 }
 function isVendor(event){
  if(!(event instanceof Game_Event))return false;
  var data=event.event();
  return !!(data&&data.meta&&data.meta.KudasaiMarketVendor);
 }
 var characterPosition=Sprite_Character.prototype.updatePosition;
 Sprite_Character.prototype.updatePosition=function(){
  characterPosition.apply(this,arguments);
  if(active()&&isVendor(this._character)){
   this.x+=$gameMap.tileWidth()/2;
   this.y-=10;
  }
 };
 var startMapEvent=Game_Player.prototype.startMapEvent;
 Game_Player.prototype.startMapEvent=function(x,y,triggers,normal){
  startMapEvent.apply(this,arguments);
  if(!active()||!normal||triggers.indexOf(0)<0||$gameMap.isEventRunning()||
     this.direction()!==8||this.x!==x||this.y!==y+1)return;
  if($gameMap.eventsXy(x-1,y).some(isVendor)){
   startMapEvent.call(this,x-1,y,[0],true);
  }
 };
 var passage=Game_Map.prototype.checkPassage;
 Game_Map.prototype.checkPassage=function(x,y,bit){if(active()&&(bit&15)&&x>=3&&x<11&&y>=16&&y<26)return this.regionId(x,y)!==3;return passage.apply(this,arguments);};
 function raiseCanopy(sprite,source){
  source.addLoadListener(function(){
   if(!sprite.parent)return;
   var w=source.width,h=source.height,split=32,lift=16,post=13;
   var bitmap=new Bitmap(w,h+lift);
   bitmap.smooth=false;
   // Keep the counter on its original tile and extend only its two posts.
   bitmap.blt(source,0,0,w,split,0,0);
   bitmap.blt(source,0,split,post,6,0,split,post,lift);
   bitmap.blt(source,w-post,split,post,6,w-post,split,post,lift);
   bitmap.blt(source,0,split,w,h-split,0,split+lift);
   // The hem extends two pixels below the old split. Those detached tips
   // were copied down with the counter and appeared as floating dashes.
   // Keep the complete hem at the canopy. All merchandise begins below it.
   var hemWidth=70;
   bitmap.clearRect(13,split+lift,hemWidth,2);
   bitmap.blt(source,13,split,hemWidth,2,13,split);
   sprite.bitmap=bitmap;
   sprite._marketOwned=true;
  });
 }
 var create=Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer=function(){create.apply(this,arguments);if(!active())return;var self=this;this._marketSprites=[];
  finishPlaza(this);
  $dataKudasaiMarket.stalls.forEach(function(s){var source=ImageManager.loadParallax(s.asset),sprite=new Sprite(source);sprite.anchor.set(.5,1);sprite.z=3;sprite._marketX=(s.x+1)*48;sprite._marketY=(s.y+2)*48-3;self._tilemap.addChild(sprite);self._marketSprites.push(sprite);
   if($gameMap.eventsXy(s.x,s.y+1).some(isVendor)||(s.raiseCanopyMaps||[]).indexOf($gameMap.mapId())>=0)raiseCanopy(sprite,source);
   var b=new Bitmap(120,34),c=b._context,g=c.createRadialGradient(60,17,0,60,17,54);g.addColorStop(0,'rgba(60,49,72,.22)');g.addColorStop(1,'rgba(60,49,72,0)');c.scale(1,.3);c.fillStyle=g;c.fillRect(0,0,120,114);b._setDirty();var shadow=new Sprite(b);shadow.anchor.set(.5,.5);shadow.z=1.1;shadow._marketX=sprite._marketX+3;shadow._marketY=sprite._marketY+2;shadow._marketOwned=true;self._tilemap.addChild(shadow);self._marketSprites.push(shadow);});
 };
 var update=Spriteset_Map.prototype.update;
 Spriteset_Map.prototype.update=function(){update.apply(this,arguments);if(this._marketSprites){var x=Math.floor($gameMap.displayX()*48),y=Math.floor($gameMap.displayY()*48);this._marketSprites.concat(this._marketFixtures||[]).forEach(function(s){s.x=s._marketX-x;s.y=s._marketY-y;});}};
 function dispose(set){if(!set||!set._marketSprites)return;set._marketSprites.concat(set._marketFixtures||[]).forEach(function(s){if(s.parent)s.parent.removeChild(s);if(s._marketOwned&&s.bitmap){if(s.bitmap._baseTexture)s.bitmap._baseTexture.destroy();if(s.bitmap.__canvas)s.bitmap.__canvas.width=s.bitmap.__canvas.height=1;}s.bitmap=null;s.destroy({texture:false,baseTexture:false});});set._marketSprites=null;set._marketFixtures=null;}
 var terminate=Scene_Map.prototype.terminate;Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);dispose(this._spriteset);};
 var destroy=Spriteset_Map.prototype.destroy;Spriteset_Map.prototype.destroy=function(){dispose(this);destroy.apply(this,arguments);};
 window.KudasaiMarketVisuals={version:'20261108.2'};
})();
