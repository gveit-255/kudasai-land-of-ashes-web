/*:
 * @plugindesc v20261108.9 Interiores organizados por zonas, pixel art mate: 13 casas de Alba y Sala del Consejo.
 * @author Kudasai
 * @help
 * Configuración: data/Kudasai_Interiores_20261107.json.
 * Fondos arquitectónicos fijados al mapa y muebles con orden de profundidad MV.
 * Las regiones 1/3 y los mostradores nativos definen el mobiliario sólido.
 * Conserva los habitantes originales, ventanas y transferencias; sin antorchas domésticas.
 * Solo actúa sobre los mapas y hashes exactos incluidos en la configuración.
 * Después de editar la distribución, regenerar fondos/configuración.
 */
(function(){
 'use strict';
 DataManager._databaseFiles.push({name:'$dataKudasaiInteriors',src:'Kudasai_Interiores_20261107.json'});
 function InteriorSprite(bitmap){Sprite.call(this,bitmap);}
 InteriorSprite.prototype=Object.create(Sprite.prototype);
 InteriorSprite.prototype.constructor=InteriorSprite;
 InteriorSprite.prototype._onBitmapLoad=function(bitmap){
  // MV can finish a cached image request after a map transition has disposed its sprite.
  if(!this._interiorDisposed&&this.transform)Sprite.prototype._onBitmapLoad.call(this,bitmap);
 };
 function config(){
  var all=window.$dataKudasaiInteriors,r=all&&all.maps[$gameMap.mapId()];
  return r&&$gameMap.parallaxName()===r.background&&window.KudasaiParallaxHash&&KudasaiParallaxHash($dataMap,$gameMap.tilesetFlags())===r.hash?r:null;
 }
 var setup=Game_Map.prototype.setup;
 Game_Map.prototype.setup=function(mapId){
  setup.apply(this,arguments);
  if(window.$dataKudasaiInteriors&&$dataKudasaiInteriors.maps[mapId])this._kudasaiInteriorsVersion=$dataKudasaiInteriors.version;
 };
 var reload=Scene_Load.prototype.reloadMapIfUpdated;
 Scene_Load.prototype.reloadMapIfUpdated=function(){
  reload.apply(this,arguments);
  var all=window.$dataKudasaiInteriors,r=all&&all.maps[$gameMap.mapId()];
  // Older saves cache Game_Map's previous parallax name as well as its position.
  if(r&&($gameMap._kudasaiInteriorsVersion!==all.version||$gameMap.parallaxName()!==r.background)&&!$gamePlayer.isTransferring()){
   $gamePlayer.reserveTransfer($gameMap.mapId(),$gamePlayer.x,$gamePlayer.y,$gamePlayer.direction(),2);
   $gamePlayer.requestMapReload();
  }
 };
 var create=Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer=function(){
  create.apply(this,arguments);
  var r=config();if(!r)return;
  var n=$dataMap.width*$dataMap.height,data=$dataMap.data.slice();
  // Private render copy: the logical map retains regions, native counters and events.
  for(var i=0;i<n*5;i++)data[i]=0;
  this._tilemap.setData($dataMap.width,$dataMap.height,data);
  this._parallax.visible=true;
  ImageManager.loadParallax(r.background).smooth=false;
  this._kudasaiInteriors={room:r,sprites:[]};
  r.objects.forEach(function(o){
   if(o.baked)return;
   var a=$dataKudasaiInteriors.assets[o.asset],bitmap=ImageManager.loadParallax(a.atlas),f=a.frame;
   bitmap.smooth=false;var s=new InteriorSprite(bitmap);
   s.setFrame(f[0],f[1],f[2],f[3]);s.anchor.set(.5,1);s.scale.set(o.width/f[2],o.height/f[3]);s.z=3;
   s._interiorPlacement=o;this._tilemap.addChild(s);this._kudasaiInteriors.sprites.push(s);
  },this);
  updateFurniture(this);
 };
 function updateFurniture(set){
  if(!set._kudasaiInteriors)return;
  var ox=$gameMap.displayX()*48,oy=$gameMap.displayY()*48;
  set._kudasaiInteriors.sprites.forEach(function(s){var o=s._interiorPlacement;s.x=Math.round((o.x+o.w/2)*48-ox);s.y=Math.round((o.y+o.h)*48-oy);});
 }
 var update=Spriteset_Map.prototype.update;
 Spriteset_Map.prototype.update=function(){update.apply(this,arguments);updateFurniture(this);};
 function dispose(set){
  if(!set||!set._kudasaiInteriors)return;
  set._kudasaiInteriors.sprites.forEach(function(s){s._interiorDisposed=true;s.bitmap=null;if(s.parent)s.parent.removeChild(s);s.destroy({texture:true,baseTexture:false});});
  set._kudasaiInteriors.sprites=[];set._kudasaiInteriors=null;
 }
 var terminate=Scene_Map.prototype.terminate;
 Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);dispose(this._spriteset);};
 var destroy=Spriteset_Map.prototype.destroy;
 Spriteset_Map.prototype.destroy=function(){dispose(this);destroy.apply(this,arguments);};
 // Saves made before the redesign may stand inside a new piece of furniture.
 // Relocate only on entry and only when the current tile is now solid.
 var start=Scene_Map.prototype.start;
 Scene_Map.prototype.start=function(){
  start.apply(this,arguments);if(!config()||$gameMap.regionId($gamePlayer.x,$gamePlayer.y)===2)return;
  var w=$gameMap.width(),h=$gameMap.height(),list=[];
  for(var y=0;y<h;y++)for(var x=0;x<w;x++)if($gameMap.regionId(x,y)===2&&!$gameMap.eventsXyNt(x,y).some(function(e){return e.isNormalPriority();}))list.push([x,y,Math.abs(x-$gamePlayer.x)+Math.abs(y-$gamePlayer.y)]);
  list.sort(function(a,b){return a[2]-b[2]||b[1]-a[1]||a[0]-b[0];});
  if(list.length)$gamePlayer.locate(list[0][0],list[0][1]);
 };
 window.KudasaiInteriors={version:'20261108.9',config:config};
})();
