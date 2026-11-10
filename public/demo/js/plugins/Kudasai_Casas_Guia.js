/*:
 * @plugindesc Casas pastel según guía: Consejo, Revuelta, Ishimura y copias de Alba.
 * @author Kudasai
 * @help
 * Consume data/Kudasai_Houses_Guide.json. Recursos separados de arquitectura,
 * reparación de suelo y sombras. Mantiene mapas, eventos y colisiones.
 * Carga después de Kudasai_Parallax y Kudasai_AnimatedTrees.
 */
(function(){
 'use strict';
 window.$dataKudasaiHousesGuide=null;
 DataManager._databaseFiles.push({name:'$dataKudasaiHousesGuide',src:'Kudasai_Houses_Guide.json'});
 function config(){
  if(!$gameMap||!window.$dataKudasaiHousesGuide)return null;
  var c=$dataKudasaiHousesGuide[$gameMap.mapId()];
  return c&&c.width===$gameMap.width()&&c.height===$gameMap.height()&&c.tileset===$gameMap.tilesetId()?c:null;
 }
 function door(sprite){
  var c=config(),e=sprite._character;
  if(!c||!(e instanceof Game_Event)||e.characterName()!=='!$Kudasai_Puerta_Madera')return null;
  for(var i=0;i<c.houses.length;i++)if(c.houses[i].eventId===e.eventId())return c.houses[i];
  return null;
 }
 var read=Tilemap.prototype._readMapData;
 Tilemap.prototype._readMapData=function(x,y,z){
  if(this._guideHousesMask&&z<5&&x>=0&&y>=0&&x<this._mapWidth&&y<this._mapHeight&&this._guideHousesMask[y*this._mapWidth+x])return 0;
  return read.apply(this,arguments);
 };
 var create=Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer=function(){
  create.apply(this,arguments);var c=config();if(!c)return;
  var mask=new Uint8Array(c.width*c.height);
  c.houses.forEach(function(h){for(var y=h.y;y<h.foot;y++)for(var x=h.x;x<h.right;x++)mask[y*c.width+x]=1;});
  this._guideHousesMask=mask;this._tilemap._guideHousesMask=mask;
  this._guideHouseLayers=[];
  var self=this;
  [[c.ground,.5],[c.shadow,1],[c.architecture,2]].forEach(function(layer){
   var s=new Sprite(ImageManager.loadParallax(layer[0]));s.z=layer[1];self._tilemap.addChild(s);self._guideHouseLayers.push(s);
  });
  this._tilemap.refresh();
 };
 var update=Spriteset_Map.prototype.update;
 Spriteset_Map.prototype.update=function(){
  update.apply(this,arguments);
  if(!this._guideHouseLayers)return;
  var x=-Math.floor($gameMap.displayX()*$gameMap.tileWidth()),y=-Math.floor($gameMap.displayY()*$gameMap.tileHeight());
  this._guideHouseLayers.forEach(function(s){s.x=x;s.y=y;});
  var mask=this._guideHousesMask,w=$gameMap.width();
  if(this._kudasaiTrees)this._kudasaiTrees.records.forEach(function(t){
   if(t.anchorTop&&t.isFoliage&&mask[t.y*w+t.x])t.copies.forEach(function(copy){copy.forEach(function(s){s.alpha=0;});});
  });
 };
 var parallax=Spriteset_Map.prototype.updateParallax;
 Spriteset_Map.prototype.updateParallax=function(){
  parallax.apply(this,arguments);
  if(config()&&this._parallax&&/^!/.test($gameMap.parallaxName())){
   this._parallax.origin.x=Math.floor($gameMap.parallaxOx());this._parallax.origin.y=Math.floor($gameMap.parallaxOy());
  }
 };
 var bitmap=Sprite_Character.prototype.setCharacterBitmap;
 Sprite_Character.prototype.setCharacterBitmap=function(){
  bitmap.apply(this,arguments);var h=door(this);
  if(h){this.bitmap=ImageManager.loadParallax('Kudasai_Casas_Puerta_'+h.variant+'_Limpia_ContornosSelectivos_20261102');this._isBigCharacter=true;}
 };
 var position=Sprite_Character.prototype.updatePosition;
 Sprite_Character.prototype.updatePosition=function(){position.apply(this,arguments);var h=door(this);if(h){this.y-=25;this.x+=h.doorOffsetX||0;}};
 var visibility=Sprite_Character.prototype.updateVisibility;
 Sprite_Character.prototype.updateVisibility=function(){
  visibility.apply(this,arguments);var c=config(),e=this._character;
  if(c&&e instanceof Game_Event&&(c.suppressedArchitecturalEvents||[]).indexOf(e.eventId())>=0)this.visible=false;
 };
})();
