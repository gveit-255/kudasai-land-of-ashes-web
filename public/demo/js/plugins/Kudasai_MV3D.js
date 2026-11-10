/*:
 * @plugindesc v2 Prólogo del claro: cámara fija, árboles y hojas pequeñas con brisa.
 * @author Kudasai
 * @help
 * Orden: mv3d -> Kudasai_Cinematics -> Kudasai_MV3D. Solo mapa 27.
 * Cámara bloqueada a KudasaiPrologue.fixedCamera. Gameplay normal en 2D.
 * Hojas: dibujo y brisa originales de Kudasai_Parallax / AnimatedTrees.
 * Guion: evento 3 de Map027. Manual: docs/MV3D_Uso_Kudasai.md.
 */
(function(){
 'use strict';
 var M=window.mv3d,P=window.KudasaiPrologue;
 if(!M||!P)throw new Error('Kudasai_MV3D requiere mv3d y Kudasai_Cinematics.');
 var owned=[],trees=[],leaves=[],frame=0,generation=0,ready=true;
 function scope(){return $gameMap&&$dataMap&&$gameMap.mapId()===27;}
 function active(){return scope()&&P.active&&!P.exiting&&!M.isDisabled();}
 function clearFoliage(){generation++;owned.forEach(function(o){o.dispose();});owned=[];trees=[];leaves=[];frame=0;ready=true;}
 window.KudasaiMV3D={isActive:active,clear:function(){
  if(M.blendPanX){M.blendPanX.setValue(0,0);M.blendPanY.setValue(0,0);}
  M.setCameraTrack(null);M.resetCameraTarget();
 },stats:function(){return {trees:trees.length,leaves:leaves.length,frame:frame,leafPositions:leaves.slice(0,3).map(function(l){return l.mesh.position.asArray();})};}};
 var disabled=M.isDisabled;
 M.isDisabled=function(){return !scope()||!Graphics.isWebGL()||disabled.apply(this,arguments);};
 var clearColor=M.updateClearColor;
 M.updateClearColor=function(){clearColor.apply(this,arguments);if(scope()&&M.scene){var c=M.blendFogColor.currentComponents();M.scene.clearColor.set(c[0],c[1],c[2],1);}};
 // Whole rooted trees replace the four source pieces only in MV3D's view.
 var tileData=M.getTileData;
 M.getTileData=function(x,y){var data=tileData.apply(this,arguments);if(scope())for(var i=2;i<4;i++)if([112,113,120,121].indexOf(data[i])>=0)data[i]=0;return data;};
 function set(blender,value){blender.setValue(value,0);}
 function camera(){
  if(!active()||!P.camera)return;
  var c=P.fixedCamera;P.camera.x=c.x;P.camera.y=c.y;P.camera.z=1;
  if(M.cameraMode!=='PERSPECTIVE')M.cameraMode='PERSPECTIVE';
  M.cameraTargets.length=0;M.cameraTargets.push($gamePlayer);M.setCameraTrack(null);
  set(M.blendCameraYaw,c.yaw);set(M.blendCameraPitch,c.pitch);set(M.blendCameraDist,c.distance);
  set(M.blendCameraHeight,c.height);set(M.blendCameraZoom,1);set(M.blendCameraRoll,0);
  set(M.blendPanX,c.x-$gamePlayer._realX);set(M.blendPanY,c.y-$gamePlayer._realY);$gameScreen.setZoom(0,0,1);
 }
 function wind(seed){return window.KudasaiTreeBreeze?KudasaiTreeBreeze(frame,seed):Math.sin(frame/300*Math.PI*2+seed);}
 function breeze(){
  frame++;
  trees.forEach(function(t){var gust=wind(t.seed)*.045,positions=t.base.slice();for(var i=0;i<positions.length;i+=3)if(positions[i+1]>0){positions[i]+=gust;positions[i+2]-=gust*.3;}t.mesh.updateVerticesData('position',positions);});
  leaves.forEach(function(l){var gust=wind(l.seed);l.mesh.position.set(l.x+gust*.15,.035,-(l.y+gust*.045));l.mesh.rotation.y=l.seed+gust*.09;});
 }
 var update=M.update;
 M.update=function(){if(scope()&&($gamePlayer.isTransferring()||SceneManager.isSceneChanging()))return;camera();if(active())breeze();update.apply(this,arguments);if(active())M.camera.fov=P.fixedCamera.fov*Math.PI/180;};
 // MV3D 0.6 cell batches must finish before their textures are disposed.
 var transfer=Scene_Map.prototype.updateTransferPlayer;
 Scene_Map.prototype.updateTransferPlayer=function(){if(scope()&&$gamePlayer.isTransferring()&&M.mapUpdating)return;transfer.apply(this,arguments);};
 var interpreter=Game_Map.prototype.updateInterpreter;
 Game_Map.prototype.updateInterpreter=function(){if(P.exiting)return;interpreter.apply(this,arguments);};
 var starting=Game_Map.prototype.setupStartingEvent;
 Game_Map.prototype.setupStartingEvent=function(){if(P.finishRequested||P.exiting)return false;return starting.apply(this,arguments);};
 var clearMap=M.clearMap;
 M.clearMap=function(){clearFoliage();clearMap.apply(this,arguments);};
 function makeMesh(name,positions,uvs,mat,updatable){
  var source=M.scene.meshes.filter(function(m){return m.getClassName()==='Mesh';})[0];
  var mesh=new source.constructor(name,M.scene),indices=[],normals=[];
  for(var i=0;i<positions.length/3;i+=4){indices.push(i,i+1,i+2,i,i+2,i+3);for(var j=0;j<4;j++)normals.push(0,1,0);}
  mesh.setVerticesData('position',positions,!!updatable);mesh.setVerticesData('normal',normals);mesh.setVerticesData('uv',uvs);mesh.setIndices(indices);
  mesh.material=mat;mesh.renderingGroupId=M.enumRenderGroups.MAIN;mesh.isPickable=false;owned.push(mesh);return mesh;
 }
 function material(name,bitmap,base,token){
  var Texture=base.constructor,texture=new Texture(bitmap._canvas.toDataURL(),M.scene,true,true,1);
  return M.waitTextureLoaded(texture).then(function(){
   if(token!==generation){texture.dispose();return null;}
   var Material=M.scene.defaultMaterial.constructor,mat=new Material(name,M.scene);
   mat.diffuseTexture=texture;texture.hasAlpha=true;mat.backFaceCulling=false;mat.twoSidedLighting=true;
   mat.alphaCutOff=.08;mat.ambientColor.set(1,1,1);mat.specularColor.set(0,0,0);owned.push(mat,texture);
   if(bitmap._baseTexture)bitmap._baseTexture.destroy();return mat;
  });
 }
 function buildFoliage(){
  if(!scope()||M.isDisabled())return;
  clearFoliage();ready=false;var token=generation,map=$dataMap,anchors=[],n=map.width*map.height;
  for(var y=0;y<map.height-1;y++)for(var x=0;x<map.width-1;x++){var k=y*map.width+x;if(map.data[2*n+k]===112&&map.data[2*n+k+1]===113&&map.data[2*n+k+map.width]===120&&map.data[2*n+k+map.width+1]===121)anchors.push({x:x+.5,y:y+1.5});}
  var source=ImageManager.loadTileset($gameMap.tileset().tilesetNames[5]);
  Promise.all([M.waitBitmapLoaded(source),M.createTexture('img/MV3D/shadow.png')]).then(function(results){
   if(token!==generation)return null;
   owned.push(results[1]);var treeBitmap=new Bitmap(96,96);treeBitmap.blt(source,0,14*48,96,96,0,0);
   var jobs=[material('Kudasai clearing tree',treeBitmap,results[1],token)];
   KudasaiLeafArt.colors.forEach(function(color,i){jobs.push(material('Kudasai small leaf '+i,KudasaiLeafArt.create(color),results[1],token));});return Promise.all(jobs);
  }).then(function(mats){
   if(token!==generation||!mats)return;
   anchors.forEach(function(t,i){
    var pos=[],uv=[];[Math.PI/4,-Math.PI/4].forEach(function(a){var dx=Math.cos(a),dy=Math.sin(a);pos.push(-dx,0,dy,dx,0,-dy,dx,2.2,-dy,-dx,2.2,dy);uv.push(0,0,1,0,1,1,0,1);});
    var mesh=makeMesh('Kudasai clearing tree '+i,pos,uv,mats[0],true);mesh.position.set(t.x,0,-t.y);trees.push({mesh:mesh,base:pos,seed:t.x*.37+t.y*.21});
   });
   var match=/<KudasaiOpeningLeaves:(\{[^>]+\})>/.exec(map.note),area=match?JSON.parse(match[1]):{x:17,y:16,w:16,h:14,count:42};
   for(var i=0;i<area.count;i++){
    var u=Math.sin((i+1)*127.1)*43758.5453,v=Math.sin((i+1)*311.7)*19273.919;
    var x=area.x+(u-Math.floor(u))*area.w,y=area.y+(v-Math.floor(v))*area.h;
    var mesh=makeMesh('Kudasai small leaf '+i,[-.195,0,.14,.195,0,.14,.195,0,-.14,-.195,0,-.14],[0,0,1,0,1,1,0,1],mats[1+i%3],false);
    mesh.position.set(x,.035,-y);leaves.push({mesh:mesh,x:x,y:y,seed:i*2.399});
   }ready=true;
  }).catch(function(error){ready=true;console.error('Kudasai clearing foliage',error);});
 }
 var loaded=Scene_Map.prototype.onMapLoaded;
 Scene_Map.prototype.onMapLoaded=function(){loaded.apply(this,arguments);buildFoliage();};
 var isReady=Scene_Map.prototype.isReady;
 Scene_Map.prototype.isReady=function(){return isReady.apply(this,arguments)&&ready&&(!scope()||!M.mapUpdating);};
 var lower=Spriteset_Map.prototype.createLowerLayer;
 Spriteset_Map.prototype.createLowerLayer=function(){
  lower.apply(this,arguments);if(!scope()||M.isDisabled())return;
  this._parallax.visible=false;this._tilemap.visible=false;this._clearingContainer=M.pixiContainer;
  this._clearingGrade=new PIXI.Filter(null,[
   'precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform vec4 filterArea;',
   'void main(){vec2 uv=vTextureCoord;vec4 c=texture2D(uSampler,uv);float r=smoothstep(.18,.48,abs(uv.y-.48))*1.8;',
   'vec2 d=vec2(r)/filterArea.xy;vec3 b=(texture2D(uSampler,uv+d).rgb+texture2D(uSampler,uv-d).rgb)*.5;',
   'float v=1.0-.20*smoothstep(.28,.72,length((uv-vec2(.5,.46))*vec2(1.0,.8)));gl_FragColor=vec4(mix(c.rgb,b,.65)*v,c.a);}'
  ].join('\n'));this._clearingContainer.filters=[this._clearingGrade];
 };
 var destroy=Spriteset_Map.prototype.destroy;
 Spriteset_Map.prototype.destroy=function(){if(this._clearingGrade){this._clearingContainer.filters=null;this._clearingGrade.destroy();this._clearingGrade=null;this._clearingContainer=null;}destroy.apply(this,arguments);};
 var title=Scene_Title.prototype.start;
 Scene_Title.prototype.start=function(){KudasaiMV3D.clear();title.apply(this,arguments);};
})();
