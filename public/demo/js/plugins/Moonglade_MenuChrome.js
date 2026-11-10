/* Lucide icons: https://lucide.dev
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
/*:
 * @plugindesc Kudasai: ventanas y menús in-game rediseñados (inventario, habilidades, equipo, estado, guardado, salir).
 * @author Gstv_
 * @requiredAssets img/pictures/Kudasai_Pausa_Promo
 * @help
 * Fragmento extraído de Moonglade_Presentation.js para mantenerlo como
 * módulo independiente. Colocar después de Kudasai_Branding y de las
 * correcciones de escala.
 * El fondo de pausa comparte la animación y el sombreado de Moonglade_TitleScene.
 * Rediseña la apariencia de las ventanas de Scene_Menu, Scene_Item,
 * Scene_Skill, Scene_Equip, Scene_Status, Scene_File y Scene_GameEnd.
 * Las acciones nativas del juego (moverse por los comandos, confirmar,
 * cancelar) siguen siendo las del motor; solo cambia el dibujo y el chrome.
 * No modifica el guardado, los mapas ni las reglas de combate.
 */
/* Kudasai: bespoke in-game menus. Native game actions remain authoritative. */
(function(){
 'use strict';
 var IVORY='#f5f0e4',MUTED='#9daeb5',EDGE='rgba(199,212,213,.18)';
 var labels={item:'Inventario',skill:'Habilidades',equip:'Equipo',status:'Estado',formation:'Formación',options:'Opciones',save:'Guardar',gameEnd:'Salir'};
 function ink(b,text,x,y,w,size,color,align){b.fontFace=size>=25?'Georgia':'Arial';b.fontSize=size;b.textColor=color||IVORY;b.outlineWidth=0;b.drawText(String(text),x,y,w,38,align||'left');}
 function skin(win){
  if(!win||win._kudasaiSkin)return;win._kudasaiSkin=true;
  win.standardFontFace=function(){return 'Georgia';};win.standardFontSize=function(){return 21;};
  win.normalColor=function(){return IVORY;};win.systemColor=function(){return MUTED;};
  win.crisisColor=function(){return '#d4b2a6';};win.deathColor=function(){return '#cf9797';};win.mpCostColor=function(){return '#a1bdcd';};win.tpCostColor=function(){return '#bcb7d0';};
  win.gaugeBackColor=function(){return '#26343c';};win.hpGaugeColor1=function(){return '#687f73';};win.hpGaugeColor2=function(){return '#adc3a5';};
  win.mpGaugeColor1=function(){return '#526e88';};win.mpGaugeColor2=function(){return '#a1bdcd';};
  win.tpGaugeColor1=function(){return '#817da0';};win.tpGaugeColor2=function(){return '#bcb7d0';};
  win.resetFontSettings=function(){this.contents.fontFace=this.standardFontFace();this.contents.fontSize=this.standardFontSize();this.contents.outlineWidth=0;this.resetTextColor();};
  if(win instanceof Window_Help){
   win.standardFontSize=function(){return 18;};win.lineHeight=function(){return 24;};
   win.refresh=function(){this.contents.clear();this.resetFontSettings();var y=0,self=this;
    String(this._text||'').split('\n').forEach(function(paragraph){var line='';paragraph.split(' ').forEach(function(word){var next=line?line+' '+word:word;if(line&&self.textWidth(next)>self.contentsWidth()-12){self.drawTextEx(line,6,y);y+=24;line=word;}else line=next;});self.drawTextEx(line,6,y);y+=24;});
   };
  }
  win.drawGauge=function(x,y,width,rate,c1,c2){var gy=y+this.lineHeight()-7;this.contents.fillRect(x,gy,width,4,this.gaugeBackColor());this.contents.gradientFillRect(x,gy,Math.floor(width*Math.max(0,Math.min(1,rate))),4,c1,c2);};
  win._refreshBack=function(){
   var b=new Bitmap(Math.max(1,this.width),Math.max(1,this.height)),c=b._context;
   var g=c.createLinearGradient(0,0,b.width,b.height);g.addColorStop(0,'#101f29');g.addColorStop(1,'#09131c');c.fillStyle=g;c.fillRect(0,0,b.width,b.height);
   c.strokeStyle=EDGE;c.lineWidth=1;c.beginPath();c.moveTo(0,0.5);c.lineTo(b.width,.5);c.stroke();b._setDirty();
   if(this._kudasaiBack&&this._kudasaiBack._baseTexture)this._kudasaiBack._baseTexture.destroy();this._kudasaiBack=b;
   this._windowBackSprite.bitmap=b;this._windowBackSprite.setFrame(0,0,b.width,b.height);this._windowBackSprite.move(0,0);
  };
  win._refreshFrame=function(){this._windowFrameSprite.visible=false;};
  win._refreshCursor=function(){
   var pad=this.padding,r=this._cursorRect,x=r.x+pad-this.origin.x,y=r.y+pad-this.origin.y;
   var left=Math.max(x,pad),top=Math.max(y,pad),w=Math.max(0,Math.min(x+r.width,this.width-pad)-left),h=Math.max(0,Math.min(y+r.height,this.height-pad)-top);
   var b=new Bitmap(Math.max(1,w),Math.max(1,h));
   if(w&&h){b.gradientFillRect(0,0,w,h,'rgba(245,240,228,.10)','rgba(245,240,228,.02)');b.fillRect(0,0,2,h,IVORY);}
   if(this._kudasaiCursor&&this._kudasaiCursor._baseTexture)this._kudasaiCursor._baseTexture.destroy();this._kudasaiCursor=b;
   this._windowCursorSprite.bitmap=b;this._windowCursorSprite.setFrame(0,0,w,h);this._windowCursorSprite.move(left,top);
  };
  win.backOpacity=235;win.opacity=255;win._refreshAllParts();win.resetFontSettings();
 }
 function box(win,x,y,w,h){if(!win)return;skin(win);win.move(x,y,w,h);win.createContents();win.resetFontSettings();if(win.refresh)win.refresh();if(win.updateCursor)win.updateCursor();}
 function emblem(c,x,y,r){c.save();c.translate(x,y);c.strokeStyle='#b2c1c4';c.lineWidth=1;c.beginPath();c.moveTo(0,-r);c.lineTo(r*.66,0);c.lineTo(0,r);c.lineTo(-r*.66,0);c.closePath();c.stroke();c.beginPath();c.moveTo(0,-r*.55);c.lineTo(0,r*.55);c.stroke();c.restore();}
 function chrome(scene,title){
  var w=Graphics.boxWidth,h=Graphics.boxHeight;
  if(scene._backgroundSprite)scene._backgroundSprite.opacity=70;
  var b=new Bitmap(w,h),sp=new Sprite(b),c=b._context;
  var g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(5,13,20,.96)');g.addColorStop(.58,'rgba(9,24,33,.88)');g.addColorStop(1,'rgba(5,13,20,.96)');c.fillStyle=g;c.fillRect(0,0,w,h);
  // A large, faint seal replaces the engine window decoration.
  c.save();c.globalAlpha=.12;emblem(c,w-200,h/2,220);c.restore();b._setDirty();
  var brand=KudasaiBranding.wordmark();
  ink(b,brand.name,48,25,290,36);ink(b,brand.subtitle,51,64,270,11,MUTED);
  ink(b,title,358,38,w-410,30);b.fillRect(48,113,w-96,1,EDGE);
  ink(b,'‹  Volver',52,h-57,180,17);var place=$gameMap.displayName()||($dataMapInfos[$gameMap.mapId()]||{}).name||'';
  ink(b,place,300,h-57,w-350,14,MUTED,'right');
  scene.addChildAt(sp,scene.children.indexOf(scene._windowLayer));scene._kudasaiChrome=sp;
  bindMenuPointer(scene);
 }
 function bindMenuPointer(scene){
  scene._kudasaiPause=true;
  var backdrop=scene._pauseBackdrop;
  function menuPoint(e){var canvas=document.getElementById('GameCanvas'),r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*Graphics.width/r.width-(Graphics.width-Graphics.boxWidth)/2,y:(e.clientY-r.top)*Graphics.height/r.height-(Graphics.height-Graphics.boxHeight)/2};}
  scene._kudasaiMove=function(e){
   var point=menuPoint(e),x=point.x,y=point.y;
   if(backdrop){
    backdrop.pointer.x=x+scene._windowLayer.x;
    backdrop.pointer.y=y+scene._windowLayer.y;
   }
   var active=scene._windowLayer.children.filter(function(v){return v instanceof Window_Selectable&&v.active&&v.visible&&v.isOpen();});
   active.forEach(function(v){var index=v.hitTest(x-v.x,y-v.y);if(index>=0&&index!==v.index()){v.select(index);}});
  };document.addEventListener('mousemove',scene._kudasaiMove);
  if(backdrop){
   backdrop.resetPointer=function(){backdrop.pointer.x=-1;backdrop.pointer.y=-1;};
   document.addEventListener('mouseleave',backdrop.resetPointer);
   window.addEventListener('blur',backdrop.resetPointer);
  }
  scene._kudasaiBackClick=function(e){var p=menuPoint(e);if(p.x>=40&&p.x<220&&p.y>Graphics.boxHeight-64&&p.y<Graphics.boxHeight)scene._kudasaiBackRequested=true;};
  document.addEventListener('pointerdown',scene._kudasaiBackClick);
 }
 var menuUpdate=Scene_MenuBase.prototype.update;
 Scene_MenuBase.prototype.update=function(){
  menuUpdate.call(this);if(!this._kudasaiPause)return;
  if(this._kudasaiBackRequested){
   this._kudasaiBackRequested=false;
   var active=this._windowLayer.children.filter(function(v){return v instanceof Window_Selectable&&v.active&&v.isHandled('cancel');})[0];
   if(active)active.processCancel();else{SoundManager.playCancel();this.popScene();}
  }
 };
 var menuTerminate=Scene_MenuBase.prototype.terminate;
 Scene_MenuBase.prototype.terminate=function(){
  if(this._kudasaiMove)document.removeEventListener('mousemove',this._kudasaiMove);
  if(this._kudasaiBackClick)document.removeEventListener('pointerdown',this._kudasaiBackClick);
  menuTerminate.call(this);
  if(this._kudasaiChrome&&this._kudasaiChrome.bitmap._baseTexture)this._kudasaiChrome.bitmap._baseTexture.destroy();
  var backdrop=this._pauseBackdrop;
  if(backdrop){
   document.removeEventListener('mouseleave',backdrop.resetPointer);
   window.removeEventListener('blur',backdrop.resetPointer);
   if(backdrop.vertices)backdrop.effects.release(this._backgroundSprite);
   this._pauseBackdrop=null;
  }
 };
 function partyDraw(index){
  var actor=$gameParty.members()[index],r=this.itemRect(index);if(!actor)return;
  var big=this.itemHeight()>260,portrait=big?144:96,x=r.x+20,y=r.y+22,infoX=x+portrait+28;
  this.changePaintOpacity(actor.isBattleMember());this.drawActorFace(actor,x,y,portrait,portrait);this.changePaintOpacity(true);
  ink(this.contents,actor.name(),infoX,y-6,r.width-portrait-90,big?36:28);
  ink(this.contents,actor.currentClass().name+'  ·  Nivel '+actor.level,infoX,y+34,r.width-portrait-90,14,MUTED);
  this.resetFontSettings();this.drawActorHp(actor,infoX,y+73,Math.min(285,r.width-portrait-90));
  this.drawActorMp(actor,infoX,y+113,Math.min(285,r.width-portrait-90));
  this.drawActorIcons(actor,r.x+r.width-160,y+12,120);
  if(big){
   var stats=[['Ataque',actor.atk],['Defensa',actor.def],['Agilidad',actor.agi]],row=y+216;
   stats.forEach(function(pair,i){var sx=x+i*(r.width-40)/3;ink(this.contents,pair[0].toUpperCase(),sx,row,220,11,MUTED);ink(this.contents,pair[1],sx,row+34,220,32);},this);
   var item=actor.equips()[0];ink(this.contents,item?item.name:'Sin arma equipada',x,y+335,r.width-40,18,MUTED);
  }
  if(this.pendingIndex&&index===this.pendingIndex())this.contents.fillRect(r.x,r.y,3,r.height,'#c5d2d4');
 }
 function partyWindow(win){win.numVisibleRows=function(){return $gameParty.members().length===1?1:2;};win.drawItem=partyDraw;}

 var menuIcons={"item":[["path",{"d":"M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"}],["path",{"d":"M8 10h8"}],["path",{"d":"M8 18h8"}],["path",{"d":"M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"}],["path",{"d":"M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"}]],"skill":[["path",{"d":"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{"d":"M20 2v4"}],["path",{"d":"M22 4h-4"}],["circle",{"cx":"4","cy":"20","r":"2"}]],"equip":[["path",{"d":"m13 19 6-6"}],["path",{"d":"M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5"}],["path",{"d":"m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586"}],["path",{"d":"m16 16 4 4"}],["path",{"d":"m19 21 2-2"}],["path",{"d":"m5 14 4 4"}],["path",{"d":"m5 21-2-2"}],["path",{"d":"M7.5 16.5 4 20"}]],"status":[["circle",{"cx":"12","cy":"8","r":"5"}],["path",{"d":"M20 21a8 8 0 0 0-16 0"}]],"formation":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87"}],["circle",{"cx":"9","cy":"7","r":"4"}]],"options":[["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]],"save":[["path",{"d":"M15 12h-5"}],["path",{"d":"M15 8h-5"}],["path",{"d":"M19 17V5a2 2 0 0 0-2-2H4"}],["path",{"d":"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"}]],"gameEnd":[["path",{"d":"m16 17 5-5-5-5"}],["path",{"d":"M21 12H9"}],["path",{"d":"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}]]};
 function menuIcon(b,symbol,x,y,size,enabled){
  var c=b._context;c.save();c.translate(x,y);c.scale(size/24,size/24);c.strokeStyle=enabled?IVORY:MUTED;c.globalAlpha=enabled?1:.35;c.lineWidth=1.6;c.lineCap='round';c.lineJoin='round';
  (menuIcons[symbol]||menuIcons.item).forEach(function(node){var a=node[1];c.beginPath();
   if(node[0]==='path'){c.stroke(new Path2D(a.d));return;}
   if(node[0]==='circle')c.arc(+a.cx,+a.cy,+a.r,0,Math.PI*2);
   if(node[0]==='rect')c.rect(+a.x,+a.y,+a.width,+a.height);
   if(node[0]==='line'){c.moveTo(+a.x1,+a.y1);c.lineTo(+a.x2,+a.y2);}
   if(node[0]==='polyline'||node[0]==='polygon'){var p=a.points.trim().split(/[ ,]+/).map(Number);c.moveTo(p[0],p[1]);for(var i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);if(node[0]==='polygon')c.closePath();}
   c.stroke();
  });c.restore();b._setDirty();
 }
 var PAUSE_GOLD='#dfc499';
 function pauseChrome(scene,partyX){
  var w=Graphics.boxWidth,h=Graphics.boxHeight;
  var b=new Bitmap(w,h),c=b._context;
  if(scene._pauseBackdrop)scene._pauseBackdrop.effects.shade(c,w,h);
  b.gradientFillRect(0,0,w,69,'rgba(5,10,15,.72)','rgba(5,10,15,0)',true);
  b.gradientFillRect(0,h-72,w,72,'rgba(5,10,15,0)','rgba(5,10,15,.66)',true);
  b.gradientFillRect(0,50,345,h-110,'rgba(5,10,15,.30)','rgba(5,10,15,0)');
  b.gradientFillRect(partyX-36,50,w-partyX+36,h-50,'rgba(8,15,19,0)','rgba(8,15,19,.55)');
  b.fillRect(partyX,50,w-partyX,h-50,'rgba(8,15,19,.38)');
  b.fillRect(partyX,50,1,h-110,EDGE);
  b.fillRect(0,49,w,1,EDGE);
  ink(b,'Pausa',24,5,216,28);
  ink(b,$dataSystem.gameTitle.toUpperCase(),w-365,6,341,13,PAUSE_GOLD,'right');
  b.fillRect(partyX+22,143,w-partyX-46,1,EDGE);
  ink(b,'COMPAÑÍA',partyX+24,148,w-partyX-48,13,PAUSE_GOLD);

  c.strokeStyle=EDGE;
  c.strokeRect(43.5,h-47.5,38,25);
  ink(b,'Esc',44,h-54,38,12,PAUSE_GOLD,'center');
  ink(b,'Volver',94,h-55,120,17);
  var place=$gameMap.displayName()||($dataMapInfos[$gameMap.mapId()]||{}).name||'';
  ink(b,place,partyX+24,h-55,w-partyX-48,16,IVORY,'right');
  scene._kudasaiChrome=new Sprite(b);
  scene._kudasaiChrome.move(scene._windowLayer.x,scene._windowLayer.y);
  scene.addChildAt(scene._kudasaiChrome,scene.children.indexOf(scene._windowLayer));
  bindMenuPointer(scene);
 }

 function pauseWindow(win,x,y,width,height){
  win.opacity=0;
  win.standardPadding=function(){return 0;};
  win.updatePadding();
  win.move(x,y,width,height);
  win.createContents();
  win.refresh();
 }
 function pauseSelection(win){
  // The painted rows show selection while MV still owns input and scrolling.
  win.setCursorRect(0,0,0,0);
  win.updateCursor=function(){};
  var select=win.select;
  win.select=function(index){
   var previous=this.index();
   select.call(this,index);
   if(index!==previous)Window_Selectable.prototype.refresh.call(this);
  };
 }
 function pauseCommand(index){
  var b=this.contents,c=b._context,r=this.itemRect(index);
  var cmd=this._list[index],enabled=this.isCommandEnabled(index),selected=index===this.index();
  var y=r.y+3,height=r.height-6,width=r.width-(selected?1:18);
  var fill=c.createLinearGradient(0,y,0,y+height);
  fill.addColorStop(0,selected?'#314c73':'rgba(21,26,31,.90)');
  fill.addColorStop(.48,selected?'#152237':'rgba(7,12,16,.87)');
  fill.addColorStop(1,selected?'#233d60':'rgba(14,19,23,.91)');
  c.fillStyle=fill;
  c.strokeStyle=selected?'#b8cbe9':'rgba(223,196,153,.40)';
  c.beginPath();
  c.moveTo(0,y+.5);
  c.lineTo(width-21,y+.5);
  c.lineTo(width,y+height/2);
  c.lineTo(width-21,y+height-.5);
  c.lineTo(0,y+height-.5);
  c.fill();
  c.stroke();
  if(selected){
   c.fillStyle=PAUSE_GOLD;
   c.beginPath();
   c.moveTo(13,y+height/2-5);
   c.lineTo(21,y+height/2);
   c.lineTo(13,y+height/2+5);
   c.fill();
  }
  menuIcon(b,cmd.symbol,31,r.y+(r.height-22)/2,22,enabled);
  ink(b,labels[cmd.symbol]||cmd.name,67,r.y+(r.height-38)/2,width-102,22,enabled?IVORY:MUTED);
 }
 function pauseGauge(b,label,value,max,x,y,width,light,dark){
  ink(b,label,x,y-9,39,11,light);
  ink(b,value+' / '+max,x+39,y-9,width-39,15,IVORY,'right');
  b.fillRect(x,y+24,width,3,'rgba(186,209,219,.22)');
  b.gradientFillRect(x,y+24,max>0?Math.floor(width*value/max):0,3,dark,light);
 }
 function pauseParty(index){
  var actor=$gameParty.members()[index],r=this.itemRect(index),b=this.contents;
  var y=r.y,x=12,portrait=66,infoX=x+portrait+16,width=r.width-infoX-12;
  if(index===this.index()){
   b.gradientFillRect(0,y+2,r.width,r.height-4,'rgba(92,131,172,.44)','rgba(92,131,172,.14)');
   b.fillRect(0,y+2,2,r.height-4,'#b8cbe9');
  }
  if(index===this.pendingIndex())b.fillRect(x,y+14,portrait,2,PAUSE_GOLD);
  b.fillRect(x,y+16,portrait,portrait,'rgba(10,17,22,.75)');
  var face=ImageManager.loadFace(actor.faceName()),faceIndex=actor.faceIndex();
  var sw=Window_Base._faceWidth,sh=Window_Base._faceHeight;
  this.changePaintOpacity(actor.isBattleMember());
  b.blt(face,faceIndex%4*sw,Math.floor(faceIndex/4)*sh,sw,sh,x,y+16,portrait,portrait);
  this.changePaintOpacity(true);
  ink(b,'NV. '+actor.level,x,y+77,portrait,11,PAUSE_GOLD,'center');
  ink(b,actor.name(),infoX,y+3,width,22);
  pauseGauge(b,TextManager.hpA,actor.hp,actor.mhp,infoX,y+32,width,'#a9c7a2','#557c68');
  pauseGauge(b,TextManager.mpA,actor.mp,actor.mmp,infoX,y+59,width,'#b0cce2','#5b81a7');
  this.drawActorIcons(actor,infoX,y+87,width);
  b.fillRect(x,y+r.height-1,r.width-24,1,EDGE);
 }

 // The masks follow the hair and coat in the original 1533 × 1024 illustration.
 function pauseCoverVertices(mesh,effects){
  var hair=[[721,521],[783,512],[821,564],[873,593],[929,603],[951,641],
   [936,680],[900,720],[858,724],[808,689],[756,675],[718,616]];
  var coat=[[723,597],[793,604],[820,657],[848,735],[882,797],[881,846],
   [826,870],[769,865],[691,850],[681,809],[697,744],[683,712],[710,645]];
  var moving=[];
  for(var i=0;i<mesh.vertices.length;i+=2){
   var x=mesh.vertices[i],y=mesh.vertices[i+1];
   var hairWeight=effects.influence(x,y,hair,20);
   var coatWeight=effects.influence(x,y,coat,22);
   if(hairWeight||coatWeight)moving.push({
    index:i,x:x,y:y,
    hair:hairWeight*(2+Math.max(0,x-747)*.038),
    coat:coatWeight*(2+Math.max(0,y-665)*.017)
   });
  }
  return moving;
 }
 function animatePauseCover(scene){
  var state=scene._pauseBackdrop,back=scene._backgroundSprite;
  var w=Graphics.width,h=Graphics.height,tick=++state.tick;
  var effects=state.effects,scale=state.scale*effects.overscan(tick);
  effects.move(back,state.motion,state.pointer,tick,w,h,h+9);
  back.scale.set(scale,scale);
  if(!state.vertices)return;
  var phase=(tick%360)*Math.PI*2/360,breath=(1-Math.cos(phase))*.5;
  var characterAmplitude=.2;
  state.vertices.forEach(function(v){
   var hairOffset=v.hair*Math.sin(phase+(v.x-755)*.012)*characterAmplitude;
   var sway=Math.sin(phase+(v.y-650)*.013);
   var bodyAmplitude=v.coat*characterAmplitude;
   back.vertices[v.index]=v.x+hairOffset+bodyAmplitude*sway*.7;
   back.vertices[v.index+1]=v.y-hairOffset*.37-bodyAmplitude*breath*.48;
  });
 }
 Scene_Menu.prototype.createBackground=function(){
  var art=ImageManager.reservePicture('Kudasai_Pausa_Promo'),sprite=new Sprite(art);
  sprite.anchor.set(.5,1);
  sprite.move(Graphics.width/2,Graphics.height);
  this._backgroundSprite=sprite;
  this.addChild(sprite);
  var scene=this,effects=window.KudasaiCoverEffects;
  if(effects)this._pauseBackdrop={effects:effects,tick:0,pointer:{x:-1,y:-1},motion:{x:0,y:0},scale:1};
  art.addLoadListener(function(){
   var scale=Math.max(Graphics.width/art.width,Graphics.height/art.height);
   sprite.scale.set(scale,scale);
   var state=scene._pauseBackdrop;
   if(!state)return;
   state.scale=scale;
   // The canvas renderer keeps the drift without redrawing a grid of triangles.
   if(Graphics.isWebGL()){
    scene._backgroundSprite=effects.mesh(sprite,65,41);
    state.vertices=pauseCoverVertices(scene._backgroundSprite,effects);
   }
   animatePauseCover(scene);
  });
 };
 var pauseUpdate=Scene_Menu.prototype.update;
 Scene_Menu.prototype.update=function(){
  pauseUpdate.call(this);
  if(this._pauseBackdrop)animatePauseCover(this);
 };
 var main=Scene_Menu.prototype.create;
 Scene_Menu.prototype.create=function(){
  main.call(this);
  var w=Graphics.boxWidth,h=Graphics.boxHeight;
  var partyWidth=308,partyX=w-partyWidth;
  pauseChrome(this,partyX);

  var commands=this._commandWindow;
  commands.itemHeight=function(){return 52;};
  commands.drawItem=pauseCommand;
  pauseSelection(commands);
  var rows=Math.min(commands.maxItems(),Math.floor((h-180)/commands.itemHeight()));
  pauseWindow(commands,0,96,302,rows*commands.itemHeight());

  var party=this._statusWindow;
  party.itemHeight=function(){return 120;};
  party.drawItem=pauseParty;
  pauseSelection(party);
  var partyRows=Math.floor((h-240)/party.itemHeight());
  pauseWindow(party,partyX+16,182,partyWidth-34,partyRows*party.itemHeight());

  var gold=this._goldWindow;
  gold.refresh=function(){
   this._pausePlaytime=$gameSystem.playtimeText();
   this._pauseGold=this.value();
   var b=this.contents,width=b.width;
   b.clear();
   ink(b,'TIEMPO',0,-1,94,13,PAUSE_GOLD);
   ink(b,this._pausePlaytime,96,-1,width-96,19,IVORY,'right');
   ink(b,String(this.currencyUnit()).toUpperCase(),0,30,94,13,PAUSE_GOLD);
   ink(b,this._pauseGold,96,30,width-96,19,IVORY,'right');
  };
  var update=gold.update;
  gold.update=function(){
   update.call(this);
   if(this._pausePlaytime!==$gameSystem.playtimeText()||this._pauseGold!==this.value())this.refresh();
  };
  pauseWindow(gold,partyX+24,66,partyWidth-48,69);
 };
 function actorPopup(scene){var win=scene._actorWindow;if(!win)return;partyWindow(win);box(win,0,152,540,Graphics.boxHeight-232);}
 var itemCreate=Scene_Item.prototype.create;
 Scene_Item.prototype.create=function(){itemCreate.call(this);var w=Graphics.boxWidth,h=Graphics.boxHeight;chrome(this,'Inventario');
  this._categoryWindow.maxCols=function(){return 1;};this._categoryWindow.itemHeight=function(){return 54;};
  box(this._categoryWindow,48,144,270,280);box(this._itemWindow,342,144,w-390,h-344);box(this._helpWindow,342,h-184,w-390,114);actorPopup(this);
  // Draw the description outside the selectable windows' shared clearing mask.
  var help=this._helpWindow,layer=this._windowLayer,refresh=help.refresh;
  layer.removeChild(help);
  help.x+=layer.x;
  help.y+=layer.y;
  this.addChildAt(help,this.getChildIndex(layer));
  help.refresh=function(){
   refresh.call(this);
   this.visible=!!String(this._text||'').trim();
  };
  help.refresh();
 };
 var skillCreate=Scene_Skill.prototype.create;
 Scene_Skill.prototype.create=function(){skillCreate.call(this);var w=Graphics.boxWidth,h=Graphics.boxHeight;chrome(this,'Habilidades');
  box(this._skillTypeWindow,48,144,270,180);box(this._statusWindow,342,144,w-390,186);box(this._itemWindow,342,350,w-390,h-550);box(this._helpWindow,342,h-184,w-390,114);actorPopup(this);
 };
 var equipCreate=Scene_Equip.prototype.create;
 Scene_Equip.prototype.create=function(){equipCreate.call(this);var w=Graphics.boxWidth,h=Graphics.boxHeight;chrome(this,'Equipo');
  this._statusWindow.lineHeight=function(){return 48;};box(this._statusWindow,48,144,330,h-342);
  box(this._commandWindow,402,144,w-450,72);box(this._slotWindow,402,234,w-450,232);box(this._helpWindow,48,h-184,330,114);
  // Use the lower right panel for a scrollable equipment list.
  box(this._itemWindow,402,484,w-450,h-554);
 };
 var statusCreate=Scene_Status.prototype.create;
 Scene_Status.prototype.create=function(){statusCreate.call(this);var w=Graphics.boxWidth,h=Graphics.boxHeight;chrome(this,'Estado');
  var win=this._statusWindow;
  win.refresh=function(){this.contents.clear();var a=this._actor;if(!a)return;
   this.drawActorFace(a,24,28,144,144);ink(this.contents,a.name(),198,20,450,38);ink(this.contents,a.currentClass().name+' · Nivel '+a.level,198,65,450,16,MUTED);
   this.resetFontSettings();this.drawActorHp(a,198,110,270);this.drawActorMp(a,198,150,270);this.drawActorIcons(a,500,40,200);
   ink(this.contents,'ATRIBUTOS',24,218,300,12,MUTED);ink(this.contents,'EQUIPO',550,218,300,12,MUTED);
   for(var i=0;i<6;i++){var col=i%2,row=Math.floor(i/2),x=24+col*248,y=266+row*44;ink(this.contents,TextManager.param(i+2),x,y,165,17,MUTED);ink(this.contents,a.param(i+2),x+165,y,50,20,IVORY,'right');}
   a.equips().forEach(function(e,i){ink(this.contents,e?e.name:'—',550,260+i*34,400,18);},this);
   ink(this.contents,a.isMaxLevel()?'Nivel máximo':a.nextRequiredExp()+' EXP para el siguiente nivel',24,410,510,14,MUTED);
  };box(win,48,144,w-96,h-218);
 };
 var fileCreate=Scene_File.prototype.create;
 Scene_File.prototype.create=function(){fileCreate.call(this);var w=Graphics.boxWidth,h=Graphics.boxHeight;chrome(this,this.mode()==='save'?'Guardar partida':'Cargar partida');
  this._helpWindow.hide();var win=this._listWindow;win.maxVisibleItems=function(){return 5;};
  win.drawItem=function(index){var r=this.itemRectForText(index),id=index+1,info=DataManager.loadSavefileInfo(id),valid=DataManager.isThisGameFile(id);this.resetFontSettings();
   ink(this.contents,('0'+id).slice(-2),r.x+12,r.y+15,60,18,MUTED);ink(this.contents,info&&valid?'Crónica '+id:'Espacio vacío',r.x+90,r.y+15,350,26);
   if(info&&valid){ink(this.contents,info.playtime||'00:00',r.x+r.width-180,r.y+15,155,17,MUTED,'right');this.drawPartyCharacters(info,r.x+470,r.y+r.height-15);}
  };box(win,48,144,w-96,h-218);
 };
 var endCreate=Scene_GameEnd.prototype.create;
 Scene_GameEnd.prototype.create=function(){endCreate.call(this);chrome(this,'Salir de la partida');box(this._commandWindow,(Graphics.boxWidth-430)/2,280,430,150);};
})();
