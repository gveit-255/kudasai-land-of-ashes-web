/*:
 * @plugindesc Kudasai: resolución de salida 1080p, ventana y escalado proporcional. MV 1.6.
 * @author Gstv_
 * @help
 * Instalar al final de la lista, después de Moonglade_Fullscreen y TitleScene.
 * Opciones: resolución de salida y modo ventana/pantalla completa (F4).
 * La composición permanece en 1280x720; la salida por defecto es 1920x1080.
 * Las pantallas 4:3/ultrawide usan bandas negras sin recortar ni deformar.
 * Derecha aumenta resolución; izquierda la reduce. Salida mínima 800x600.
 * Preferencias independientes de las partidas, guardadas con ConfigManager.
 */
(function() {
  'use strict';
  var modes = [
    {w:1920,h:1080,label:'1920 × 1080'},
    {w:1680,h:1050,label:'1680 × 1050'},
    {w:1600,h:1024,label:'1600 × 1024'},
    {w:1600,h:900,label:'1600 × 900'},
    {w:1440,h:1080,label:'1440 × 1080'},
    {w:1440,h:900,label:'1440 × 900'},
    {w:1400,h:1050,label:'1400 × 1050'},
    {w:1366,h:768,label:'1366 × 768'},
    {w:1360,h:768,label:'1360 × 768'},
    {w:1280,h:1024,label:'1280 × 1024'},
    {w:1280,h:960,label:'1280 × 960'},
    {w:1280,h:800,label:'1280 × 800'},
    {w:1280,h:768,label:'1280 × 768'},
    {w:1280,h:720,label:'1280 × 720'},
    {w:1280,h:600,label:'1280 × 600'},
    {w:1176,h:664,label:'1176 × 664'},
    {w:1152,h:864,label:'1152 × 864'},
    {w:1024,h:768,label:'1024 × 768'},
    {w:800,h:600,label:'800 × 600'}
  ];
  function valid(value) {
    var n=Number(value);
    return isFinite(n)&&Math.floor(n)===n&&n>=0&&n<modes.length?n:0;
  }
  ConfigManager.kudasaiResolution=0;
  var make=ConfigManager.makeData, apply=ConfigManager.applyData;
  ConfigManager.makeData=function(){var data=make.call(this);data.kudasaiResolution=valid(this.kudasaiResolution);var m=modes[data.kudasaiResolution];data.kudasaiResolutionSize=m.w+'x'+m.h;return data;};
  ConfigManager.applyData=function(data){apply.call(this,data);var size=data.kudasaiResolutionSize;
    if(!size&&data.kudasaiResolution!==undefined){
      var old=['1920x1080','1600x900','1366x768','1280x720','1024x576','960x540','816x624'];
      size=old[Number(data.kudasaiResolution)];
    }
    var found=-1;
    modes.forEach(function(m,i){if(m.w+'x'+m.h===size)found=i;});
    this.kudasaiResolution=found>=0?found:0;};
  // Logical coordinates keep map cameras, cinematics and all menus consistent.
  SceneManager._screenWidth=SceneManager._boxWidth=1280;
  SceneManager._screenHeight=SceneManager._boxHeight=720;
  var desktop=null;
  var autoMaximized=false;
  var windowFitRevision=0;
  function dpi(){return Math.max(1,Number(window.devicePixelRatio)||1);}
  function nativeMode(){
    return {w:Math.round(screen.width*dpi()),h:Math.round(screen.height*dpi())};
  }
  function selected(){
    return Graphics.kudasaiIsFullscreen()?nativeMode():modes[valid(ConfigManager.kudasaiResolution)];
  }
  function resizeWindow(restored) {
    // NW.js enters fullscreen asynchronously; do not restore its window meanwhile.
    if(!desktop||ConfigManager.kudasaiFullscreen||Graphics.kudasaiIsFullscreen())return;
    var revision=++windowFitRevision;
    if(typeof desktop.setResizable==='function')desktop.setResizable(true);
    // The selected dimensions describe the client area, including at 1080p.
    // Restore before resizing: maximizing constrains it to the taskbar work area.
    if(!restored){
      desktop.unmaximize();autoMaximized=false;
      setTimeout(function(){
        if(revision===windowFitRevision)resizeWindow(true);
      },100);return;
    }
    var requested=modes[valid(ConfigManager.kudasaiResolution)];
    var mode={w:Math.round(requested.w/dpi()),h:Math.round(requested.h/dpi())};
    var chromeW=Math.max(0,window.outerWidth-window.innerWidth);
    var chromeH=Math.max(0,window.outerHeight-window.innerHeight);
    var w=mode.w+chromeW,h=mode.h+chromeH;
    desktop.setMinimumSize(320,240);
    desktop.resizeTo(w,h);
    var left=Number(screen.availLeft)||0,top=Number(screen.availTop)||0;
    var aw=screen.availWidth||screen.width,ah=screen.availHeight||screen.height;
    function position(){
      var x=window.outerWidth>=aw?left-Math.round(chromeW/2):left+(aw-window.outerWidth)/2;
      var y=window.outerHeight>=ah?top:top+(ah-window.outerHeight)/2;
      desktop.moveTo(Math.round(x),Math.round(y));
    }
    position();refreshViewport();
    // Use previous resize commands, rather than NW's differently rounded
    // width properties, to converge on the requested client area.
    var bestError=Infinity,bestW=w,bestH=h;
    function settle(attempt){
      if(revision!==windowFitRevision||Graphics.kudasaiIsFullscreen())return;
      var dx=mode.w-window.innerWidth,dy=mode.h-window.innerHeight;
      var error=Math.abs(dx)+Math.abs(dy);
      if(error<bestError){bestError=error;bestW=w;bestH=h;}
      if(Math.abs(dx)>.49||Math.abs(dy)>.49){
        if(attempt>=6){
          desktop.resizeTo(bestW,bestH);
          setTimeout(function(){if(revision===windowFitRevision){position();lockWindowResize();refreshViewport();}},80);return;
        }
        w=Math.round(w+dx);h=Math.round(h+dy);desktop.resizeTo(w,h);
        setTimeout(function(){settle(attempt+1);},80);
      }
      if(Math.abs(dx)<=.49&&Math.abs(dy)<=.49)lockWindowResize();
      position();refreshViewport();
    }
    setTimeout(function(){settle(0);},80);
  }
  Graphics.kudasaiDisplayMetrics=function(){
    var m=selected(),r=this._canvas.getBoundingClientRect(),d=dpi();
    return {requested:{width:m.w,height:m.h},viewport:{width:Math.round(window.innerWidth*d),height:Math.round(window.innerHeight*d)},
      canvas:{width:this._canvas.width,height:this._canvas.height},
      image:{width:r.width*d,height:r.height*d,left:r.left*d,top:r.top*d},dpi:d,fullscreen:this.kudasaiIsFullscreen()};
  };
  Graphics.kudasaiResolutionModes=function(){return modes.slice();};
  Graphics.kudasaiResolutionLabel=function(){var m=selected();return m.w+' × '+m.h;};
  Graphics.kudasaiSetResolution=function(index){
    if(this.kudasaiIsFullscreen())return false;
    ConfigManager.kudasaiResolution=valid(index);
    if(this._canvas)this._updateAllElements();
    resizeWindow();ConfigManager.save();return true;
  };
  function outputScale(){var mode=selected();return Math.min(mode.w/1280,mode.h/720);}
  var createRenderer=Graphics._createRenderer;
  Graphics._createRenderer=function(){createRenderer.apply(this,arguments);this._updateRenderer();};
  Graphics._updateRenderer=function(){
    if(!this._renderer)return;
    var res=outputScale();
    this._renderer.resolution=res;
    if(this._renderer.rootRenderTarget){
      var target=this._renderer.rootRenderTarget;
      if(target.resolution!==res){target.resolution=res;target.size.width=-1;}
    }
    this._renderer.resize(this._width,this._height);
    // Some renderer versions update CSS dimensions when resizing: restore fit.
    this._centerElement(this._canvas);
  };
  // _centerElement in MV uses the element's physical size. The renderer's
  // framebuffer has higher resolution than the shared logical viewport.
  var center=Graphics._centerElement;
  Graphics._centerElement=function(element){
    if(element===this._canvas||element===this._upperCanvas||element===this._video){
      element.style.position='fixed';element.style.margin='0';
      element.style.left=element.style.top='50%';
      element.style.right=element.style.bottom='auto';
      element.style.transform='translate(-50%, -50%)';
      element.style.width=(this._width*this._realScale)+'px';
      element.style.height=(this._height*this._realScale)+'px';
    }else center.call(this,element);
  };
  var init=SceneManager.initNwjs;
  SceneManager.initNwjs=function(){init.apply(this,arguments);if(Utils.isNwjs()){
    desktop=require('nw.gui').Window.get();
    if(typeof desktop.setResizable==='function')desktop.setResizable(false);
    desktop.on('enter-fullscreen',refreshViewport);
    desktop.on('leave-fullscreen',function(){resizeWindow();refreshViewport();});
    desktop.on('resize',refreshViewport);
    desktop.on('restore',refreshViewport);
    desktop.on('maximize',refreshViewport);
  }};
  // NW.js emits native window events independently of DOM fullscreenchange.
  // Refresh after the OS completes its transition and also detect viewport
  // changes each frame; this covers DPI changes and missing resize events.
  function refreshViewport(){
    cursorNeedsRecovery=true;
    if(Graphics._canvas)Graphics._updateAllElements();
    requestAnimationFrame(function(){if(Graphics._canvas)Graphics._updateAllElements();});
  }
  var updateMain=SceneManager.updateMain;
  var viewportW=0,viewportH=0,viewportDpr=0,viewportFullscreen=null;
  var setFullscreen=Graphics.kudasaiSetFullscreen;
  Graphics.kudasaiSetFullscreen=function(enabled){
    ++windowFitRevision;
    if(desktop&&typeof desktop.setResizable==='function')desktop.setResizable(true);
    setFullscreen.call(this,enabled);refreshViewport();
  };
  SceneManager.updateMain=function(){
    if(Graphics._canvas&&(viewportW!==window.innerWidth||viewportH!==window.innerHeight||viewportDpr!==window.devicePixelRatio||viewportFullscreen!==Graphics.kudasaiIsFullscreen())){
      viewportW=window.innerWidth;viewportH=window.innerHeight;viewportDpr=window.devicePixelRatio;viewportFullscreen=Graphics.kudasaiIsFullscreen();
      Graphics._updateAllElements();
    }
    updateMain.apply(this,arguments);
  };
  var boot=Scene_Boot.prototype.start;
  Scene_Boot.prototype.start=function(){
    Graphics._updateAllElements();boot.apply(this,arguments);resizeWindow();
  };
  // Native MV options remain usable if another scene opens them directly.
  var add=Window_Options.prototype.addGeneralOptions;
  Window_Options.prototype.addGeneralOptions=function(){add.call(this);this.addCommand('Resolución','kudasaiResolution');this.addCommand('Pantalla completa','kudasaiFullscreen');};
  var status=Window_Options.prototype.statusText;
  Window_Options.prototype.statusText=function(index){return this.commandSymbol(index)==='kudasaiResolution'?Graphics.kudasaiResolutionLabel():status.call(this,index);};
  var change=Window_Options.prototype.changeValue;
  Window_Options.prototype.changeValue=function(symbol,value){
    if(symbol==='kudasaiResolution'){Graphics.kudasaiSetResolution(value);this.redrawItem(this.findSymbol(symbol));SoundManager.playCursor();}
    else if(symbol==='kudasaiFullscreen'){Graphics.kudasaiSetFullscreen(value);this.redrawItem(this.findSymbol(symbol));SoundManager.playCursor();}
    else change.call(this,symbol,value);
  };
  ['processOk','cursorRight','cursorLeft'].forEach(function(method){
    var original=Window_Options.prototype[method];
    Window_Options.prototype[method]=function(){
      if(this.commandSymbol(this.index())==='kudasaiResolution'){
        var delta=method==='cursorLeft'?1:-1;
        this.changeValue('kudasaiResolution',Math.max(0,Math.min(modes.length-1,valid(ConfigManager.kudasaiResolution)+delta)));
      }else original.apply(this,arguments);
    };
  });
  function lockWindowResize(){
    if(desktop&&!Graphics.kudasaiIsFullscreen()&&typeof desktop.setResizable==='function')desktop.setResizable(false);
    cursorNeedsRecovery=true;
    recoverGameCursor();
  }
  var cursorNeedsRecovery=true,cursorRecoveryPending=false,cursorTarget=null;
  function applyGameCursor(cursor,event){
    if(!cursor)return;
    [document.documentElement,document.body,Graphics._canvas,Graphics._upperCanvas,Graphics._video,Graphics._kudasaiTenRoot,cursorTarget,event&&event.target].forEach(function(element){
      if(element&&element.style&&(element.style.getPropertyValue('cursor')!==cursor||element.style.getPropertyPriority('cursor')!=='important'))element.style.setProperty('cursor',cursor,'important');
    });
  }
  function restoreGameCursor(event){
    if(event&&event.target&&event.target.style)cursorTarget=event.target;
    if(!cursorRecoveryPending)applyGameCursor(Graphics.kudasaiCursorValue,event);
  }
  function recoverGameCursor(event){
    restoreGameCursor(event);
    if(cursorRecoveryPending||!Graphics.kudasaiCursorValue)return;
    cursorRecoveryPending=true;
    // Chromium can cache the custom cursor while Windows replaces it with a
    // resize cursor. A real style change across frames refreshes that cache.
    applyGameCursor('default',event);
    window.getComputedStyle(Graphics._canvas||document.documentElement).cursor;
    requestAnimationFrame(function(){
      cursorRecoveryPending=false;
      applyGameCursor(Graphics.kudasaiCursorValue);
    });
  }
  function geometryCursorChanged(event){
    cursorNeedsRecovery=true;restoreGameCursor(event);
  }
  function pointerCursorMoved(event){
    restoreGameCursor(event);
    if(cursorNeedsRecovery){cursorNeedsRecovery=false;recoverGameCursor(event);}
  }
  window.addEventListener('focus',geometryCursorChanged);
  window.addEventListener('resize',geometryCursorChanged);
  document.addEventListener('mouseenter',pointerCursorMoved,true);
  document.addEventListener('mouseleave',function(event){if(event.target===document.documentElement)cursorNeedsRecovery=true;},true);
  document.addEventListener('mousemove',pointerCursorMoved,true);
  document.addEventListener('fullscreenchange',geometryCursorChanged);
  document.addEventListener('webkitfullscreenchange',geometryCursorChanged);
  restoreGameCursor();
  document.body.style.backgroundColor='#000';
})();
