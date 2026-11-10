/*:
 * @plugindesc Kudasai: modo de pantalla compartido por F4 y Opciones.
 * @author Gstv_
 * @help Recuerda el modo elegido con F4 u Opciones entre sesiones.
 * Sin configuración previa, inicia en pantalla completa. No restaura la ventana al entrar en pantalla completa.
 */
(function() {
  'use strict';
  var desktopWindow = null;
  var modeReady = false;
  var requestedMode = null;
  ConfigManager.kudasaiFullscreen = true;
  var makeData = ConfigManager.makeData;
  ConfigManager.makeData = function() {
    var data = makeData.call(this);
    data.kudasaiFullscreen = this.kudasaiFullscreen;
    return data;
  };
  var applyData = ConfigManager.applyData;
  ConfigManager.applyData = function(data) {
    applyData.call(this, data);
    this.kudasaiFullscreen = typeof data.kudasaiFullscreen === 'boolean' ? data.kudasaiFullscreen : true;
  };
  Graphics.kudasaiIsFullscreen = function() {
    return desktopWindow ? !!desktopWindow.isFullscreen : !!(
      document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement);
  };
  function syncMode() {
    if (!modeReady) return;
    var actual = Graphics.kudasaiIsFullscreen();
    // Ignore intermediate restore/resize events while NW.js changes mode.
    if (requestedMode !== null && actual !== requestedMode) return;
    requestedMode = null;
    if (ConfigManager.kudasaiFullscreen !== actual) {
      ConfigManager.kudasaiFullscreen = actual;
      ConfigManager.save();
    }
  }
  Graphics.kudasaiSetFullscreen = function(enabled) {
    enabled = !!enabled;
    requestedMode = enabled;
    ConfigManager.kudasaiFullscreen = enabled;
    ConfigManager.save();
    if (enabled === this.kudasaiIsFullscreen()) { syncMode(); return; }
    if (desktopWindow) {
      // restore() would cancel enterFullscreen(). show() only makes it visible.
      desktopWindow.show();
      if (enabled) desktopWindow.enterFullscreen();
      else desktopWindow.leaveFullscreen();
    } else {
      var target = enabled ? document.documentElement : document;
      var action = enabled ? (target.requestFullscreen || target.webkitRequestFullscreen) :
        (target.exitFullscreen || target.webkitExitFullscreen);
      if (action) {
        var result = action.call(target);
        if (result && result.catch) result.catch(function() { requestedMode = null; syncMode(); });
      }
    }
  };
  var initNwjs = SceneManager.initNwjs;
  SceneManager.initNwjs = function() {
    initNwjs.apply(this, arguments);
    if (Utils.isNwjs()) {
      desktopWindow = require('nw.gui').Window.get();
      desktopWindow.on('enter-fullscreen', syncMode);
      desktopWindow.on('leave-fullscreen', syncMode);
      desktopWindow.on('restore', syncMode);
      desktopWindow.show();
    }
  };
  var bootStart = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    modeReady = true;
    if (desktopWindow) Graphics.kudasaiSetFullscreen(ConfigManager.kudasaiFullscreen);
    bootStart.apply(this, arguments);
  };
  Graphics._switchFullScreen = function() {
    this.kudasaiSetFullscreen(!this.kudasaiIsFullscreen());
  };
  var onKeyDown = Graphics._onKeyDown;
  Graphics._onKeyDown = function(event) {
    if (event.keyCode === 115 && event.repeat) { event.preventDefault(); return; }
    onKeyDown.call(this, event);
  };
  document.addEventListener('fullscreenchange', syncMode);
  document.addEventListener('webkitfullscreenchange', syncMode);
})();

// Ajuste del lienzo y puntero. Comparte la misma geometría visible para
// hover, clic, arrastre y entrada táctil, incluso con escalado de Windows.
(function(){
  'use strict';
  // Ten_core reemplaza por error Graphics._canvas por su div de interfaz.
  // Conservamos su contenedor sin perder la referencia al lienzo del juego.
  if(Graphics._createTenCore){
    var createTenCore=Graphics._createTenCore;
    Graphics._createTenCore=function(){
      var gameCanvas=this._canvas;
      try{createTenCore.apply(this,arguments);this._kudasaiTenRoot=this._canvas;}
      finally{this._canvas=gameCanvas;}
    };
  }
  Graphics._defaultStretchMode=function(){return true;};
  Graphics._updateRealScale=function(){
    this._stretchEnabled=true;
    this._realScale=Math.min(window.innerWidth/this._width,window.innerHeight/this._height);
  };
  Graphics._switchStretchMode=function(){this._updateAllElements();};
  Graphics.pageToCanvasX=function(x){
    if(!this._canvas)return 0;
    var r=this._canvas.getBoundingClientRect();
    return r.width?Math.round((x-window.pageXOffset-r.left)*this.width/r.width):0;
  };
  Graphics.pageToCanvasY=function(y){
    if(!this._canvas)return 0;
    var r=this._canvas.getBoundingClientRect();
    return r.height?Math.round((y-window.pageYOffset-r.top)*this.height/r.height):0;
  };
  function refresh(){if(Graphics._canvas)Graphics._updateAllElements();}
  document.addEventListener('fullscreenchange',refresh);
  document.addEventListener('webkitfullscreenchange',refresh);
})();

// Keep engine and DOM overlays within the window's viewport at every resolution.
(function(){
 'use strict';
 var style=document.createElement('style');style.id='kudasai-viewport-bounds';
 style.textContent='html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;overscroll-behavior:none;}';
 document.head.appendChild(style);
 var update=Graphics._updateAllElements;
 Graphics._updateAllElements=function(){update.apply(this,arguments);window.scrollTo(0,0);};
})();
