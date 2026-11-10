/*:
 * @plugindesc Jardineras de las casas según la referencia floral del usuario (3/11/2026).
 * @help Cargar después de Kudasai_WindowParallax. Datos: Kudasai_HousePlanters.json.
 * Solo sustituye visualmente las jardineras inventariadas, encima de los cristales.
 * Conserva PNG arquitectónicos, sombras, mapas, puertas, eventos y colisiones.
 */
(function(){'use strict';
 window.$dataKudasaiHousePlanters=null;
 DataManager._databaseFiles.push({name:'$dataKudasaiHousePlanters',src:'Kudasai_HousePlanters.json'});
 var create=Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer=function(){create.apply(this,arguments);var data=$dataKudasaiHousePlanters,c=data&&data.maps[$gameMap.mapId()];if(!c||c.width!==$gameMap.width()||c.height!==$gameMap.height())return;
  var layer=new Sprite(),bitmap=ImageManager.loadParallax(data.asset);layer.z=2.3;this._tilemap.addChild(layer);this._housePlanterLayer=layer;this._housePlanterSprites=[];var self=this;
  data.models[c.model].forEach(function(p){var s=new Sprite(bitmap);s.x=p.x;s.y=p.y;s._planterId=p.id;layer.addChild(s);self._housePlanterSprites.push(s);bitmap.addLoadListener(function(b){if(s.bitmap)s.scale.set(p.width/b.width,p.height/b.height);});});
 };
 var update=Spriteset_Map.prototype.update;Spriteset_Map.prototype.update=function(){update.apply(this,arguments);if(this._housePlanterLayer){this._housePlanterLayer.x=-Math.floor($gameMap.displayX()*48);this._housePlanterLayer.y=-Math.floor($gameMap.displayY()*48);}};
 function dispose(s){if(!s||!s._housePlanterLayer)return;s._housePlanterSprites.forEach(function(p){if(p.parent)p.parent.removeChild(p);p.bitmap=null;p.destroy({texture:false,baseTexture:false});});if(s._housePlanterLayer.parent)s._housePlanterLayer.parent.removeChild(s._housePlanterLayer);s._housePlanterLayer.destroy({texture:false,baseTexture:false});s._housePlanterLayer=null;s._housePlanterSprites=null;}
 var terminate=Scene_Map.prototype.terminate;Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);dispose(this._spriteset);};
 var destroy=Spriteset_Map.prototype.destroy;Spriteset_Map.prototype.destroy=function(){dispose(this);destroy.apply(this,arguments);};
})();
