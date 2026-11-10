/*:
 * @plugindesc Parque de Alba: fuente, bancos y jardines florales con profundidad y colisiones locales.
 * @help Recursos en data/Kudasai_Park.json. Cuatro jardines iguales y caminos rectos.
 */
(function(){'use strict';window.$dataKudasaiPark=null;DataManager._databaseFiles.push({name:'$dataKudasaiPark',src:'Kudasai_Park.json'});
function active(){return $gameMap&&$dataKudasaiPark&&$dataKudasaiPark.maps.indexOf($gameMap.mapId())>=0;}
// Water-only atlas: 48 continuous phases at 24 fps. The stone PNG is untouched.
// Coordinates are local to the 96 × 96 fountain; water never reaches the lawn.
function waterAtlas(){
 var b=new Bitmap(768,576),c=b._context,TAU=Math.PI*2;
 function ellipse(x,y,rx,ry,a){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.strokeStyle='rgba(219,249,249,'+a+')';c.lineWidth=.65;c.stroke();}
 function point(side,u){return{x:48+side*(18+2.6*Math.sin(Math.PI*u)),y:30+25*u};}
 for(var f=0;f<48;f++){
  var t=f/48;c.save();c.translate(f%8*96,Math.floor(f/8)*96);c.lineCap='round';
  // Expanding rings follow the perspective of the water surface.
  c.save();c.beginPath();c.ellipse(48,57,35,11,0,0,TAU);c.clip();
  [-1,1].forEach(function(side){for(var k=0;k<3;k++){var p=(t+k/3)%1;ellipse(48+side*18,56,1+p*9,.45+p*3.2,(1-p)*.48);}});
  for(var r=0;r<2;r++){var q=(t+r*.5)%1;ellipse(48,63,9+q*12,1.2+q*2.3,(1-q)*.2);}
  c.restore();
  [-1,1].forEach(function(side){
   // Continuous translucent streams, with moving highlights down their length.
   c.beginPath();for(var j=0;j<=18;j++){var p=point(side,j/18);if(j)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.strokeStyle='rgba(158,224,241,.46)';c.lineWidth=2;c.stroke();
   for(var k=0;k<5;k++){var u=(t*3+k/5+(side===1?.13:0))%1,p=point(side,u),end=point(side,Math.min(1,u+.085));c.beginPath();c.moveTo(p.x,p.y);c.lineTo(end.x,end.y);c.strokeStyle='rgba(239,255,255,'+(.55+.15*Math.sin(TAU*(t+k/5)))+')';c.lineWidth=.7;c.stroke();}
   // Small ballistic drops rise at impact and fall back inside the basin.
   for(var k=0;k<4;k++){var p=(t*2+k/4+(side===1?.17:0))%1,x=48+side*18+(k%2?1:-1)*p*4,y=55-12*p*(1-p)+p;c.fillStyle='rgba(233,255,255,'+(.65*(1-p))+')';c.beginPath();c.ellipse(x,y,.55,.8,0,0,TAU);c.fill();}
   // Upper spout: highlight droplets track the existing curved jets.
   for(var k=0;k<3;k++){var p=(t*2+k/3)%1,x=48+side*9*p,y=17-32*p*(1-p)+5*p;c.fillStyle='rgba(230,253,255,'+(.6-.2*p)+')';c.beginPath();c.ellipse(x,y,.5,.8,0,0,TAU);c.fill();}
  });c.restore();
 }b._setDirty();return b;
}
// The native grass autotile is transparent in Alba but opaque in its copies.
// Use the same continuous, world-aligned grass texture in this plot in all six maps.
var read=Tilemap.prototype._readMapData;Tilemap.prototype._readMapData=function(x,y,z){var v=read.apply(this,arguments),b=this._parkBounds;if(b&&z===0&&v===2816&&x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)return 0;return v;};
var pass=Game_Map.prototype.checkPassage;Game_Map.prototype.checkPassage=function(x,y,bit){if(active()&&(bit&15)&&$dataKudasaiPark.objects.some(function(o){return x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h;}))return false;return pass.apply(this,arguments);};
var create=Spriteset_Map.prototype.createLowerLayer;Spriteset_Map.prototype.createLowerLayer=function(){create.apply(this,arguments);if(!active())return;var self=this;this._parkSprites=[];
 var bounds=$dataKudasaiPark.bounds;if(bounds){
  this._tilemap._parkBounds=bounds;this._tilemap.refresh();
  var grass=new Bitmap(bounds.w*48,bounds.h*48),ground=new Sprite(grass);ground.z=-.5;ground._parkX=bounds.x*48;ground._parkY=bounds.y*48;ground._parkOwned=true;this._tilemap.addChild(ground);this._parkSprites.push(ground);
  ImageManager.loadParallax('Kudasai_Parque_Cesped_20261102').addLoadListener(function(texture){if(!ground.bitmap)return;for(var y=0;y<grass.height;){var sy=(bounds.y*48+y)%texture.height,h=Math.min(texture.height-sy,grass.height-y);for(var x=0;x<grass.width;){var sx=(bounds.x*48+x)%texture.width,w=Math.min(texture.width-sx,grass.width-x);grass.blt(texture,sx,sy,w,h,x,y);x+=w;}y+=h;}});
  // Old baked foliage shadows belong to the previous layout. Clip only this
  // rectangle; the source atlas and shadows everywhere else remain untouched.
  this._parkShadowMasks=[];var oldShadows=[this._naturalSoftShadows].concat((this._guideHouseLayers||[]).filter(function(s){return s.z===1;}));
  oldShadows.forEach(function(s){if(!s||!s.bitmap)return;var source=s.bitmap,record={sprite:s,source:source,bitmap:null,disposed:false};self._parkShadowMasks.push(record);source.addLoadListener(function(){if(record.disposed)return;var b=new Bitmap(source.width,source.height);b.blt(source,0,0,source.width,source.height,0,0);b.clearRect(bounds.x*48,bounds.y*48,bounds.w*48,bounds.h*48);record.bitmap=b;s.bitmap=b;});});
 }
 $dataKudasaiPark.objects.forEach(function(o){var s=new Sprite(ImageManager.loadParallax(o.asset||'Kudasai_Parque_'+o.kind+'_20261102'));s.anchor.set(.5,1);s.z=3;s._parkX=(o.x+o.w/2)*48;s._parkY=(o.y+o.h)*48-3+(o.offsetY||0);if(o.displayWidth){s.bitmap.smooth=true;s.bitmap.addLoadListener(function(b){if(s.bitmap)s.scale.set(o.displayWidth/b.width);});}if(o.kind===0){if(!self._parkWaterAtlas)self._parkWaterAtlas=waterAtlas();var water=new Sprite(self._parkWaterAtlas);water.x=-48;water.y=-96;water.setFrame(0,0,96,96);s.addChild(water);s._parkWater=water;}self._tilemap.addChild(s);self._parkSprites.push(s);});};
var update=Spriteset_Map.prototype.update;Spriteset_Map.prototype.update=function(){update.apply(this,arguments);if(this._parkSprites){var x=Math.floor($gameMap.displayX()*48),y=Math.floor($gameMap.displayY()*48),frame=Math.floor(Graphics.frameCount*24/60)%48;this._parkSprites.forEach(function(s){s.x=s._parkX-x;s.y=s._parkY-y;if(s._parkWater)s._parkWater.setFrame(frame%8*96,Math.floor(frame/8)*96,96,96);});}};
function dispose(set){if(!set||!set._parkSprites)return;(set._parkShadowMasks||[]).forEach(function(m){m.disposed=true;m.sprite.bitmap=m.source;if(m.bitmap){if(m.bitmap._baseTexture)m.bitmap._baseTexture.destroy();if(m.bitmap.__canvas)m.bitmap.__canvas.width=m.bitmap.__canvas.height=1;}});set._parkShadowMasks=null;set._parkSprites.forEach(function(s){if(s.parent)s.parent.removeChild(s);if(s._parkWater){s.removeChild(s._parkWater);s._parkWater.bitmap=null;s._parkWater.destroy({texture:false,baseTexture:false});s._parkWater=null;}if(s._parkOwned&&s.bitmap){if(s.bitmap._baseTexture)s.bitmap._baseTexture.destroy();if(s.bitmap.__canvas)s.bitmap.__canvas.width=s.bitmap.__canvas.height=1;}s.bitmap=null;s.destroy({texture:false,baseTexture:false});});set._parkSprites=null;if(set._parkWaterAtlas){if(set._parkWaterAtlas._baseTexture)set._parkWaterAtlas._baseTexture.destroy();if(set._parkWaterAtlas.__canvas)set._parkWaterAtlas.__canvas.width=set._parkWaterAtlas.__canvas.height=1;set._parkWaterAtlas=null;}}
var term=Scene_Map.prototype.terminate;Scene_Map.prototype.terminate=function(){term.apply(this,arguments);dispose(this._spriteset);};var destroy=Spriteset_Map.prototype.destroy;Spriteset_Map.prototype.destroy=function(){dispose(this);destroy.apply(this,arguments);};})();
