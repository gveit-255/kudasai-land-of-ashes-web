/*:
 * @plugindesc v10 Prólogo del claro y llegada a la Gruta de los Ecos.
 * @author Gstv_ / Kudasai
 * @requiredAssets img/parallaxes/Kudasai_Prologo_Claro_Brisa
 * @help
 * Escena actual: mapa 27, eventos 1 Libu / 2 Loussiana / 3 guion.
 * Acompañantes: 4 Norte, 5 Maxbrath, 6 Akemi y 7 Urnao.
 * KudasaiPrologue begin
 * KudasaiPrologue shot OPENING
 * KudasaiPrologue clash / rewind / arrival
 * KudasaiPrologue finish
 * Plano ilustrado fijo: fondo y posiciones de los actores al final del archivo.
 * Tras el choque, «1 semana antes» y llegada a la Gruta (33), 31,33.
 * Guardados antiguos de mapas 28–31 se redirigen al nuevo inicio o a Alba.
 * Manual: docs/Kudasai_Prologue_HD2D.md.
 * Comandos KudasaiCine de mapas 24–26 conservados por compatibilidad.
 */

(function(){
 'use strict';
 var command=Game_Interpreter.prototype.pluginCommand;
 Game_Interpreter.prototype.pluginCommand=function(name,args){
  command.apply(this,arguments);if(name.toLowerCase()!=='kudasaicine')return;
  var action=(args[0]||'').toLowerCase(),state=$gameSystem._kudasaiCine;
  if(action==='interlocutores'){
   $gameTemp._kudasaiDialogueActors=args.slice(1).map(Number).filter(function(n){return isFinite(n)&&n>=0&&Math.floor(n)===n;});
  }else if(action==='iniciar'){
   if(state)return;
   var id={dia:24,'día':24,tarde:25,noche:26}[(args[1]||'dia').toLowerCase()];if(!id)return;
   $gameSystem._kudasaiCine={map:$gameMap.mapId(),x:$gamePlayer.x,y:$gamePlayer.y,d:$gamePlayer.direction(),menu:$gameSystem.isMenuEnabled(),save:$gameSystem.isSaveEnabled()};
   $gameSystem.disableMenu();$gameSystem.disableSave();$gameTemp.clearDestination();
   $gamePlayer.reserveTransfer(id,24,14,2,0);this.setWaitMode('transfer');
  }else if(action==='terminar'){
   if(!state)return;
   state.menu?$gameSystem.enableMenu():$gameSystem.disableMenu();
   state.save?$gameSystem.enableSave():$gameSystem.disableSave();
   $gamePlayer.reserveTransfer(state.map,state.x,state.y,state.d,0);
   delete $gameSystem._kudasaiCine;this.setWaitMode('transfer');
  }
 };
 var canMove=Game_Player.prototype.canMove;
 Game_Player.prototype.canMove=function(){if($gameSystem._kudasaiCine)return false;return canMove.apply(this,arguments);};
})();

// Presentation is separate from event dialogue: existing Show Text stays editable.
(function(){
 'use strict';
 function cinematic(){
  return typeof $gameMap!=='undefined' && $gameMap && $dataMap &&
   (/<KudasaiDirected2D>/.test($dataMap.note||'') || ($gameMap.mapId()>=27 && $gameMap.mapId()<=31));
 }
 var start=Window_Message.prototype.startMessage;
 Window_Message.prototype.startMessage=function(){
  this._kudasaiPresentation=!!cinematic();
  var width=this._kudasaiPresentation?Math.min(Graphics.boxWidth-32,960):this.windowWidth();
  this.width=width;this.height=this.windowHeight();this.x=(Graphics.boxWidth-width)/2;
  this.createContents();
  start.apply(this,arguments);
 };
 var font=Window_Message.prototype.standardFontFace;
 Window_Message.prototype.standardFontFace=function(){return this._kudasaiPresentation?'Georgia, Times New Roman, serif':font.apply(this,arguments);};
 var size=Window_Message.prototype.standardFontSize;
 Window_Message.prototype.standardFontSize=function(){return this._kudasaiPresentation?26:size.apply(this,arguments);};
 var placement=Window_Message.prototype.updatePlacement;
 Window_Message.prototype.updatePlacement=function(){
  placement.apply(this,arguments);
  if(this._kudasaiPresentation){
   // Preserve event position (top/middle/bottom); use top for a reference-like shot.
   var p=$gameMessage.positionType();
   this.y=p===0?48:p===1?Math.round((Graphics.boxHeight-this.height)/2):Graphics.boxHeight-this.height-12;
   this._goldWindow.y=this.y>0?0:Graphics.boxHeight-this._goldWindow.height;
  }
 };
 var background=Window_Message.prototype.updateBackground;
 Window_Message.prototype.updateBackground=function(){
  background.apply(this,arguments);
  if(this._kudasaiPresentation && $gameMessage.background()!==2)this.setBackgroundType(1);
 };
 var color=Window_Message.prototype.normalColor;
 Window_Message.prototype.normalColor=function(){return this._kudasaiPresentation?'#fff3d8':color.apply(this,arguments);};
})();

(function(){
 'use strict';
 var text=Game_Interpreter.prototype.command101;
 Game_Interpreter.prototype.command101=function(){
  if(!$gameMessage.isBusy())$gameTemp._kudasaiDialogueSpeaker=this._eventId;
  return text.apply(this,arguments);
 };
 var setup=Game_Map.prototype.setup;
 Game_Map.prototype.setup=function(){
  setup.apply(this,arguments);
  $gameTemp._kudasaiDialogueActors=null;$gameTemp._kudasaiDialogueSpeaker=0;
 };
})();

/* Dirección del prólogo: MV 1.6, Chromium 65, PIXI 4. */
(function () {
 'use strict';
 var P = window.KudasaiPrologue = { version: 10, presentation: 'HD-2D', shots: {}, camera: null, active: false, exiting: false };
 var alba = {map:8,x:24,y:14,d:2};
 var cave = {map:33,x:31,y:33,d:8};
 function prologueMap() { return $gameMap && $gameMap.mapId() >= 27 && $gameMap.mapId() <= 31; }
 function caveIntro() { return $gameMap && $gameMap.mapId()===cave.map && $gameSwitches.value(22); }
 function target(s) {
  var ids = s.actors || (s.actor ? [s.actor] : []), chars = ids.map(function(id){return $gameMap.event(id);}).filter(Boolean);
  if(chars.length) return {x:chars.reduce(function(a,c){return a+c._realX;},0)/chars.length+(s.dx||0), y:chars.reduce(function(a,c){return a+c._realY;},0)/chars.length+(s.dy||0), z:s.zoom||1};
  return {x:s.x,y:s.y,z:s.zoom||1};
 }
 P.applyCamera = function () {
  var c=P.camera;if(!c || !prologueMap())return;
  $gameScreen.setZoom(0,0,window.KudasaiMV3D&&KudasaiMV3D.isActive()?1:c.z);
  // MV's default bounds ignore zoom. These non-looping scene maps use the
  // visible world rectangle so a close shot can reach either edge safely.
  var x=Math.max(0,Math.min(Math.max(0,$dataMap.width-Graphics.width/(48*c.z)),c.x+.5-Graphics.width/(96*c.z)));
  var y=Math.max(0,Math.min(Math.max(0,$dataMap.height-Graphics.height/(48*c.z)),c.y+.5-Graphics.height*.42/(48*c.z)));
  $gameMap._displayX=x;$gameMap._displayY=y;$gameMap._parallaxX=x;$gameMap._parallaxY=y;
 };
 P.shot = function (id) {
  var s=P.shots[id];if(!s || s.map!==$gameMap.mapId())throw new Error('Plano incompatible: '+id);
  var t=target(s);t.z=Math.max(1,Math.min(1.5,t.z));
  P.id=id; P.spec=s;P.elapsed=0;P.duration=Math.max(0,Math.round((s.seconds||0)*60));
  P.from=P.camera?JSON.parse(JSON.stringify(P.camera)):t;
  P.to=t; if(s.cut || !P.camera || !P.duration){P.camera=t;P.duration=0;}P.applyCamera();
 };
 P.tick = function () {
  if(!P.active || P.exiting || !P.camera)return;
  if(P.duration && P.elapsed<P.duration){P.elapsed++;var t=P.elapsed/P.duration;t=t*t*(3-2*t);P.camera={};['x','y','z'].forEach(function(k){P.camera[k]=P.from[k]+(P.to[k]-P.from[k])*t;});}
  else if(P.spec && P.spec.follow) {var dest=target(P.spec);P.camera.x+=(dest.x-P.camera.x)*.14;P.camera.y+=(dest.y-P.camera.y)*.14;}
  P.applyCamera();
 };
 P.begin = function () {
  if(P.exiting)return;
  P.active=true;P.camera=null;P.id=null;
  delete $gameSystem._kudasaiCine; $gameTemp._kudasaiDialogueActors=null;$gameTemp._kudasaiDialogueSpeaker=0;
  $gameSwitches.setValue(22,true);$gameSystem.disableMenu();$gameSystem.disableSave();
  $gamePlayer.setTransparent(true);$gamePlayer.followers().hide();$gameTemp.clearDestination();
 };
 P.clear = function () {
  P.active=false;P.camera=null;P.spec=null;P.id=null;P.duration=0;P.elapsed=0;
  delete $gameSystem._kudasaiCine;delete $gameSystem._kudasaiPrologue;
  $gameTemp._kudasaiDialogueActors=null;$gameTemp._kudasaiDialogueSpeaker=0;$gameTemp.clearDestination();
  $gameScreen.clearZoom();$gameScreen.clearShake();$gameScreen.clearFlash();
  $gameScreen.startTint([0,0,0,0],0);$gameScreen.changeWeather('none',0,0);
  if(window.KudasaiMV3D)KudasaiMV3D.clear();
  // Preserve gameplay pictures; atmospheric resources are owned separately.
  $gameMap.events().concat([$gamePlayer]).forEach(function(c){c._moveRouteForcing=false;c._waitCount=0;c._balloonId=0;c._animationId=0;});
 };
 P.finish = function (arrival) {
  if(P.exiting || P.finishRequested || $gameMap.mapId()===alba.map && $gameSwitches.value(21) && !P.active)return;
  var fromClearing = $gameMap.mapId()===27 && P.active;
  P.finishRequested = {target:fromClearing?cave:caveIntro()?null:alba,arrival:!!arrival&&fromClearing};
  Input.clear();TouchInput.clear();
 };
 P.performFinish = function () {
  var ending=P.finishRequested;
  if(!ending||P.exiting)return;
  var destination=ending.target;
  var scene=SceneManager._scene;
  // Keep control locked until the final cave dialogue has fully closed.
  // The player should not scroll the camera while the cinematic layers are closing.
  if(!destination&&caveIntro()&&scene&&scene._messageWindow&&!scene._messageWindow.isClosed())return;
  P.finishRequested=null;
  P.exiting=!!destination;
  clearCue(scene);
  $gameMap._interpreter.clear();$gameMap.events().forEach(function(e){if(e._interpreter)e._interpreter.clear();});
  $gameMessage.clear();
  if(scene && scene._messageWindow){var w=scene._messageWindow;w._textState=null;w.pause=false;w.close();w._choiceWindow.close();w._choiceWindow.deactivate();}
  if(!destination&&caveIntro()&&window.KudasaiCave)KudasaiCave.finishArrival();
  P.clear();
  $gameSwitches.setValue(21,!ending.arrival);$gameSwitches.setValue(22,ending.arrival);
  $gamePlayer.setTransparent(ending.arrival);$gamePlayer._moveRouteForcing=false;
  if(!ending.arrival){$gamePlayer.followers().show();$gameSystem.enableMenu();$gameSystem.enableSave();}
  Input.clear();TouchInput.clear();
  if(!destination){$gameScreen.clearFade();return;}
  AudioManager.stopBgm();AudioManager.stopBgs();AudioManager.stopMe();AudioManager.stopSe();
  if(destination===cave){
   // The normal dungeon exit still uses ABS RETURN. Its story origin is Alba.
   $gameSystem._kabsReturnStack=[{map:alba.map,x:alba.x,y:alba.y,d:alba.d,transparent:false}];
  }else AudioManager.playBgm({name:'Town1',volume:45,pitch:100,pan:0});
  $gamePlayer.reserveTransfer(destination.map,destination.x,destination.y,destination.d,ending.arrival?2:0);
 };
 function clearCue(scene){
  var cue=scene&&scene._prologueCue;
  if(!cue)return;
  scene._prologueCue=null;
  var bitmap=cue.bitmap;
  cue.destroy();
  bitmap._baseTexture.destroy();
 }
 function showCue(intertitle,duration,lines){
  var scene=SceneManager._scene;
  clearCue(scene);
  var width=Graphics.width,height=Graphics.height;
  var bitmap=new Bitmap(width,height), cue=new Sprite(bitmap);
  if(intertitle){
   bitmap.fillAll('#000000');
   bitmap.fontFace='Georgia, Times New Roman, serif';
   bitmap.fontSize=46;
   bitmap.textColor='#fff3d8';
   bitmap.outlineWidth=0;
   if(lines){
    var lineSize=Math.min(30,Math.round(width*.038));
    var lineHeight=lineSize+12;
    var y=Math.round((height-lines.length*lineHeight)/2);
    bitmap.fontSize=lineSize;
    bitmap.textColor='#d7c9e4';
    lines.forEach(function(line,index){
     bitmap.drawText(line,0,y+index*lineHeight,width,lineHeight,'center');
    });
   }else bitmap.drawText('1 semana antes',0,(height-70)/2,width,70,'center');
  }else{
   // Warm light and violet shadow meet in the center while the world shakes beneath.
   var ctx=bitmap._context;
   var beam=ctx.createLinearGradient(0,height*.41,width,height*.59);
   beam.addColorStop(0,'rgba(255,196,104,.12)');
   beam.addColorStop(.40,'rgba(255,204,126,.46)');
   beam.addColorStop(.484,'rgba(255,232,181,.82)');
   beam.addColorStop(.497,'rgba(255,253,240,1)');
   beam.addColorStop(.503,'rgba(255,248,255,1)');
   beam.addColorStop(.515,'rgba(176,93,218,.82)');
   beam.addColorStop(.63,'rgba(48,16,77,.64)');
   beam.addColorStop(1,'rgba(12,5,31,.78)');
   ctx.fillStyle=beam;
   ctx.fillRect(0,0,width,height);
   bitmap._setDirty();
  }
  cue.opacity=0;
  cue.duration=duration;
  cue.elapsed=0;
  cue.intertitle=intertitle;
  scene._prologueCue=cue;
  scene.addChildAt(cue,scene.getChildIndex(scene._windowLayer));
 }
 function updateCue(scene){
  var cue=scene._prologueCue;
  if(!cue)return;
  if(++cue.elapsed>=cue.duration){clearCue(scene);return;}
  var fadeIn=cue.intertitle?20:3, fadeOut=cue.intertitle?24:29;
  cue.opacity=255*Math.min(1,cue.elapsed/fadeIn,(cue.duration-cue.elapsed)/fadeOut);
 }
 var cmd=Game_Interpreter.prototype.pluginCommand;
 Game_Interpreter.prototype.pluginCommand=function(name,args){
  cmd.apply(this,arguments);if(name.toLowerCase()!=='kudasaiprologue')return;
  switch((args[0]||'').toLowerCase()){
   case 'begin':P.begin();break;
   case 'shot':P.shot(args[1]);break;
   case 'clash':showCue(false,44);this.wait(44);break;
   case 'rewind':showCue(true,150);this.wait(150);break;
   case 'echoes':showCue(true,255,args.slice(1).join(' ').split('|'));this.wait(255);break;
   case 'arrival':P.finish(true);break;
   case 'finish':P.finish();break;
   case 'clear':P.clear();break;
  }
 };
 var wait=Game_Interpreter.prototype.updateWaitMode;
 Game_Interpreter.prototype.updateWaitMode=function(){if(this._waitMode==='prologueCamera'){if(P.active&&P.elapsed<P.duration)return true;this._waitMode='';return false;}return wait.apply(this,arguments);};
 var scroll=Game_Player.prototype.updateScroll;
 Game_Player.prototype.updateScroll=function(){if(P.active&&prologueMap())return;scroll.apply(this,arguments);};
 var move=Game_Player.prototype.canMove;
 Game_Player.prototype.canMove=function(){return P.active||P.exiting?false:move.apply(this,arguments);};
 var updateMap=Game_Map.prototype.update;
 Game_Map.prototype.update=function(){updateMap.apply(this,arguments);if(P.finishRequested)P.performFinish();else P.tick();};
 var setup=Game_Map.prototype.setup;
 Game_Map.prototype.setup=function(id){setup.apply(this,arguments);P.camera=null;P.id=null;P.spec=null;
  if(id===cave.map&&P.exiting){P.exiting=false;P.active=caveIntro();if(!P.active)$gameScreen.clearFade();}
  else if(id===alba.map&&P.exiting){P.exiting=false;P.restoreBgm=true;$gameScreen.startFadeIn(24);}
  else if(!prologueMap() && (P.active || $gameSwitches.value(22) || $gameSystem._kudasaiCine && $gameSystem._kudasaiCine.prologue)){P.clear();$gameSwitches.setValue(22,false);$gameSystem.enableMenu();$gameSystem.enableSave();$gamePlayer.setTransparent(false);}
 };
 var autoplay=Game_Map.prototype.autoplay;
 Game_Map.prototype.autoplay=function(){autoplay.apply(this,arguments);if(P.restoreBgm&&this.mapId()===8){P.restoreBgm=false;AudioManager.stopBgs();AudioManager.playBgm({name:'Town1',volume:45,pitch:100,pan:0});}};
 function redirectLoadedPrologue(){
  if(!prologueMap())return;
  if($gameSwitches.value(21)){
   // Reserve the transfer before Scene_Map attempts to open a retired map.
   if(!P.exiting){P.finishRequested={target:alba,arrival:false};P.performFinish();}
   else $gamePlayer.reserveTransfer(alba.map,alba.x,alba.y,alba.d,0);
  }else{
   $gameMap._interpreter.clear();$gameMap.events().forEach(function(e){if(e._interpreter)e._interpreter.clear();});
   $gameMessage.clear();P.clear();
   $gamePlayer.reserveTransfer(27,24,22,2,2);$gameScreen.startFadeOut(1);
  }
  $gamePlayer.requestMapReload();
 }
 var extract=DataManager.extractSaveContents;
 DataManager.extractSaveContents=function(contents){extract.apply(this,arguments);redirectLoadedPrologue();};
 var reload=Scene_Load.prototype.reloadMapIfUpdated;
 Scene_Load.prototype.reloadMapIfUpdated=function(){reload.apply(this,arguments);redirectLoadedPrologue();};
 var fast=Scene_Map.prototype.isFastForward;
 Scene_Map.prototype.isFastForward=function(){return P.active?false:fast.apply(this,arguments);};
 var update=Scene_Map.prototype.update;
 Scene_Map.prototype.update=function(){
  update.apply(this,arguments);updateCue(this);
 };
 var terminate=Scene_Map.prototype.terminate;
 Scene_Map.prototype.terminate=function(){terminate.apply(this,arguments);clearCue(this);};
 var startMap=Scene_Map.prototype.start;
 Scene_Map.prototype.start=function(){startMap.apply(this,arguments);if(caveIntro())this._mapNameWindow.hide();};
 // Size resets when moving from the prologue back into gameplay dialogue.
 var start=Window_Message.prototype.startMessage;
 Window_Message.prototype.startMessage=function(){if(!prologueMap()){this._kudasaiPresentation=false;this.width=this.windowWidth();this.height=this.windowHeight();this.x=0;this.createContents();}start.apply(this,arguments);};
})();

KudasaiPrologue.fixedCamera = Object.freeze({
 x:24,y:22,yaw:15,pitch:60,distance:10.714285714285714,height:.65,fov:42
});
KudasaiPrologue.shots = {
 OPENING:{map:27,cut:true,zoom:1,x:24,y:22,follow:false,
 yaw:15,pitch:60,distance:10.714285714285714,height:.65,driftYaw:0,driftZoom:0}
};

// Fixed illustrated stage. Map events still own the sprites, routes and effects.
(function(){
 'use strict';
 var marks = {
  1: {x: .370, y: .600, tileX: 22, tileY: 22, scale: 1.8}, // Libu
  2: {x: .633, y: .639, tileX: 26, tileY: 22, scale: 1.9}, // Loussiana
  4: {x: .285, y: .582, tileX: 21, tileY: 22, scale: 1.60}, // Norte
  5: {x: .3203, y: .628, tileX: 21, tileY: 23, scale: 1.74}, // Maxbrath
  6: {x: .719, y: .615, tileX: 27, tileY: 22, scale: 1.80}, // Akemi
  7: {x: .6906, y: .6861, tileX: 27, tileY: 23, scale: 1.828} // Urnao, same visible height as Akemi
 };
 // Coordinates in the painted backdrop, from left to right: center, radius,
 // canopy top, fixed trunk line, and maximum bend in source pixels.
 var crowns = [
  [44,126,138,344,6.8], [145,57,305,367,1.3], [226,99,209,353,5.3],
  [390,41,298,363,1.1], [530,74,247,361,3.0], [750,88,239,372,4.9],
  [875,82,226,356,3.1], [1007,54,302,362,1.0], [1140,49,304,362,1.0],
  [1251,91,191,359,5.5], [1479,61,272,364,2.3], [1605,127,138,345,6.8]
 ];
 // Leaf centers match the 64 × 36 cells below the 1672 × 941 plate.
 var leafMarks = [
  [372,486], [352,534], [92,647], [452,735], [774,869], [1245,594],
  [1315,585], [1398,636], [1471,646], [1500,485], [1469,857], [1470,887]
 ];
 function illustratedMap(){
  return $gameMap && $dataMap && $gameMap.mapId() === 27 && $dataMap.meta.KudasaiPrologueBackdrop;
 }
 function smoothstep(start,end,value){
  var p = Math.max(0,Math.min(1,(value-start)/(end-start)));
  return p*p*(3-2*p);
 }
 function breeze(time,x){
  var phase = time-x*.0012;
  return .74*Math.sin(phase*1.13)+.26*Math.sin(phase*2.31+.7);
 }
 function canopyWeights(mesh,width,top){
  var points = [];
  for(var i=0;i<mesh.vertices.length;i+=2){
   var x = mesh.vertices[i], y = top+mesh.vertices[i+1];
   var edge = smoothstep(0,24,Math.min(x,width-x));
   var weights = [];
   crowns.forEach(function(crown,index){
    var center=crown[0], radius=crown[1], tip=crown[2], trunk=crown[3];
    var across = 1-smoothstep(radius*.53,radius,Math.abs(x-center));
    var up = smoothstep(tip-22,tip+13,y)*(1-smoothstep(tip+(trunk-tip)*.24,trunk,y));
    var strength = edge*across*up*crown[4];
    if(strength)weights.push({index:index,strength:strength});
   });
   if(weights.length)points.push({offset:i,x:x,weights:weights});
  }
  return points;
 }
 function createWindStage(set){
  var art = ImageManager.reserveParallax('Kudasai_Prologo_Claro_Brisa');
  var stage = new PIXI.Container();
  set._prologueWindStage = stage;
  set._baseSprite.addChildAt(stage,set._baseSprite.getChildIndex(set._tilemap));
  art.addLoadListener(function(){
   if(set._prologueWindStage!==stage)return;
   var width=art.width, height=941, forestTop=110, forestBottom=393;
   function texture(x,y,w,h){
    return new PIXI.Texture(art.baseTexture,new PIXI.Rectangle(x,y,w,h));
   }
   art.checkDirty();
   stage.pivot.set(width/2,height/2);
   stage.position.set(Graphics.width/2,Graphics.height/2);
   stage.scale.set(Math.max(Graphics.width/width,Graphics.height/height));
   stage.addChild(new PIXI.Sprite(texture(0,0,width,height)));

   // Deform the original crowns inside a narrow band with fixed outer edges.
   var forest = new PIXI.mesh.Plane(texture(0,forestTop,width,forestBottom-forestTop),65,21);
   forest.y = forestTop;
   stage.addChild(forest);
   var points = canopyWeights(forest,width,forestTop);
   var gusts = new Float32Array(crowns.length);
   var leaves = leafMarks.map(function(mark,index){
    var sprite = new PIXI.Sprite(texture(2+index*68,943,64,36));
    sprite.anchor.set(.5);
    sprite.position.set(mark[0],mark[1]);
    stage.addChild(sprite);
    return sprite;
   });
   var frame = 0;
   stage.update = function(){
    if(!KudasaiPrologue.active || KudasaiPrologue.exiting)return;
    var time = ++frame/60;
    var motion = .6*smoothstep(0,1.4,time);
    crowns.forEach(function(crown,index){gusts[index]=breeze(time,crown[0])*motion;});
    points.forEach(function(point){
     var x = point.x;
     point.weights.forEach(function(w){x+=gusts[w.index]*w.strength;});
     forest.vertices[point.offset]=x;
    });
    leaves.forEach(function(sprite,index){
     var mark=leafMarks[index], depth=(mark[1]-480)/410;
     var gust=breeze(time,mark[0]), phase=time*(2+index%4*.23)+index*2.399;
     var lift=smoothstep(.1,.93,gust*.66+.34*Math.sin(phase));
     sprite.x=mark[0]+motion*(11+depth*37)*(.76*gust+.24*Math.sin(phase*.71));
     sprite.y=mark[1]+motion*((2+depth*4)*Math.sin(phase)-(4+depth*13)*lift);
     sprite.rotation=motion*(.11*gust+(.08+.13*lift)*Math.sin(phase));
     sprite.scale.y=1-motion*(.11+.25*lift)*(.5+.5*Math.cos(phase*1.4));
    });
   };
  });
 }
 function destroyWindStage(set){
  var stage = set._prologueWindStage;
  if(!stage)return;
  var forest = stage.children[1];
  if(forest){
   // PIXI 4's mesh inherits Container.destroy and owns these buffers separately.
   Object.keys(forest._glDatas).forEach(function(id){
    var gl = forest._glDatas[id];
    gl.vao.destroy();
    gl.vertexBuffer.destroy();
    gl.uvBuffer.destroy();
    gl.indexBuffer.destroy();
   });
   forest.texture.destroy(false);
  }
  stage.destroy({children:true,texture:true,baseTexture:false});
  set._prologueWindStage = null;
 }
 function contactShadow(){
  var bitmap = new Bitmap(64,20), ctx = bitmap._context;
  ctx.scale(1,20/64);
  var fade = ctx.createRadialGradient(32,32,3,32,32,31);
  fade.addColorStop(0,'rgba(26,38,19,.72)');
  fade.addColorStop(.45,'rgba(30,49,22,.43)');
  fade.addColorStop(1,'rgba(30,49,22,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0,0,64,64);
  bitmap._setDirty();
  return bitmap;
 }
 function stageActor(actor,mark,tilemap,bitmap){
  var shadow = new Sprite(bitmap);
  shadow.anchor.set(.5,.5);
  shadow.z = 2;
  tilemap.addChild(shadow);
  actor.scale.set(mark.scale);
  var position = actor.updatePosition;
  actor.updatePosition = function(){
   position.call(this);
   var resolution = window.KudasaiAkemiResolution;
   var nativeScale = resolution ? resolution.factor(this.bitmap,this._characterName) : 1;
   this.scale.set(mark.scale*nativeScale);
   var event = this._character;
   this.x = Math.round(Graphics.width*(mark.x+(event._realX-mark.tileX)*.06575));
   var groundY = Math.round(Graphics.height*(mark.y+(event._realY-mark.tileY)*.055));
   this.y = groundY-event.jumpHeight();
   shadow.move(this.x+5,groundY-3);
   shadow.opacity = this.visible ? event.opacity() : 0;
  };
 }
 var lower = Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer = function(){
  lower.apply(this,arguments);
  if(!illustratedMap())return;
  createWindStage(this);

  // Remove only the visual tile data. Keep the native actor and animation layer.
  this._tilemap.setData(0,0,[]);
  this.updateKudasaiTrees = function(){};
  var shadow = contactShadow();
  this._prologueActorShadow = shadow;
  this._characterSprites.forEach(function(actor){
   var mark = marks[actor._character._eventId];
   if(mark)stageActor(actor,mark,this._tilemap,shadow);
  },this);
 };
 var updateTone=Spriteset_Map.prototype.updateToneChanger;
 Spriteset_Map.prototype.updateToneChanger=function(){
  updateTone.apply(this,arguments);
  // The neutral prologue needs no offscreen WebGL pass. Event tints still work.
  if(this._prologueActorShadow&&this._toneFilter){
   this._toneFilter.enabled=this._tone.some(function(channel){return channel!==0;});
  }
 };
 var start = Scene_Map.prototype.start;
 Scene_Map.prototype.start = function(){
  start.apply(this,arguments);
  if(illustratedMap())this._mapNameWindow.hide();
 };
 var terminate = Scene_Map.prototype.terminate;
 Scene_Map.prototype.terminate = function(){
  terminate.apply(this,arguments);
  destroyWindStage(this._spriteset);
  var shadow=this._spriteset._prologueActorShadow;
  if(shadow){
   shadow._baseTexture.destroy();
   this._spriteset._prologueActorShadow=null;
  }
 };

 var textColor = Window_Message.prototype.textColor;
 Window_Message.prototype.textColor = function(index){
  if(this._kudasaiPresentation && illustratedMap()){
   if(index === 14)return '#e9ad77';
   if(index === 0)return '#fff3d8';
  }
  return textColor.apply(this,arguments);
 };
})();
