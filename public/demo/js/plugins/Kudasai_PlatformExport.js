/* Export-only web/mobile adapter. The editable game and Windows keep their input unchanged. */
(function () {
    'use strict';
    if (Utils.isNwjs()) return;
    var touch = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(navigator.userAgent);
    window.KudasaiPlatformExport = {version:'20261110.1', touch:touch};
    // Match the framebuffer to the screen instead of forcing desktop 1080p on phones.
    Graphics._updateRenderer = function () {
        if (!this._renderer) return;
        var resolution = Math.min(1.5, Math.max(0.5,
            Math.min(innerWidth / 1280, innerHeight / 720) * (devicePixelRatio || 1)));
        this._renderer.resolution = resolution;
        if (this._renderer.rootRenderTarget) {
            this._renderer.rootRenderTarget.resolution = resolution;
            this._renderer.rootRenderTarget.size.width = -1;
        }
        this._renderer.resize(this._width, this._height);
        this._centerElement(this._canvas);
    };
    if (!touch) return;
    var releases = {}, held = {}, panel, combat;
    function clear() {
        Object.keys(held).concat(Object.keys(releases)).forEach(function(s){Input._currentState[s]=false;});
        held={}; releases={};
    }
    addEventListener('blur', clear);
    document.addEventListener('visibilitychange', function(){if(document.hidden)clear();});
    var inputUpdate = Input.update;
    Input.update = function () {
        inputUpdate.apply(this, arguments);
        Object.keys(releases).forEach(function(s){
            if (--releases[s] <= 0) { if(!held[s])Input._currentState[s]=false; delete releases[s]; }
        });
    };
    function button(parent, label, symbols, title) {
        var b=document.createElement('button'); b.type='button';b.textContent=label;
        b.setAttribute('aria-label',title || label);b.dataset.symbols=symbols.join(',');parent.appendChild(b);
        function stop(e){e.preventDefault();e.stopPropagation();}
        b.addEventListener('pointerdown',function(e){
            stop(e); b.setPointerCapture(e.pointerId);b.classList.add('held');
            if(window.$gameTemp)$gameTemp.clearDestination();
            symbols.forEach(function(s){held[s]=true;delete releases[s];Input._currentState[s]=true;});
        });
        function up(e){stop(e);b.classList.remove('held');symbols.forEach(function(s){delete held[s];releases[s]=2;});}
        b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);
        ['touchstart','touchend','mousedown','mouseup','click','contextmenu'].forEach(function(n){b.addEventListener(n,stop,{passive:false});});
    }
    function create() {
        var style=document.createElement('style');style.textContent=
            '#kudasai-touch{position:fixed;inset:0;z-index:100;pointer-events:none;user-select:none;-webkit-user-select:none}'+
            '#kudasai-touch button{pointer-events:auto;touch-action:none;color:#f8efd9;background:rgba(22,23,36,.78);border:1px solid #ad99be;border-radius:12px;min-width:44px;min-height:44px;font:600 12px sans-serif;box-shadow:0 2px 6px #0006}'+
            '#kudasai-touch button.held{background:#72537f}'+
            '#kudasai-pad{position:absolute;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,44px);gap:3px}'+
            '#kudasai-actions{position:absolute;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(2,68px);gap:6px}'+
            '#kudasai-actions button{min-height:52px}'+
            '#kudasai-nav{position:absolute;right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;gap:6px}'+
            '@media(max-height:390px){#kudasai-pad{transform:scale(.85);transform-origin:bottom left}#kudasai-actions{transform:scale(.85);transform-origin:bottom right}}';
        document.head.appendChild(style);panel=document.createElement('div');panel.id='kudasai-touch';document.body.appendChild(panel);
        var pad=document.createElement('div');pad.id='kudasai-pad';panel.appendChild(pad);
        [['↖',['up','left']],['↑',['up']],['↗',['up','right']],['←',['left']],['',null],['→',['right']],['↙',['down','left']],['↓',['down']],['↘',['down','right']]].forEach(function(x){
            if(x[1])button(pad,x[0],x[1]);else pad.appendChild(document.createElement('span'));
        });
        combat=document.createElement('div');combat.id='kudasai-actions';panel.appendChild(combat);
        button(combat,'Q · Ataque',['kabsAttack']);button(combat,'W · Habilidad',['kabsMagic']);
        button(combat,'E · Dash',['kabsDodge']);button(combat,'R · Elegir',['kabsSelect']);
        var nav=document.createElement('div');nav.id='kudasai-nav';panel.appendChild(nav);
        button(nav,'Aceptar',['ok']);button(nav,'Menú / Atrás',['escape']);
    }
    var boot=Scene_Boot.prototype.start;
    Scene_Boot.prototype.start=function(){boot.apply(this,arguments);create();};
    var update=SceneManager.updateInputData;
    SceneManager.updateInputData=function(){
        update.apply(this,arguments);
        if(panel){
            var ready=window.KudasaiABS && window.$gameSystem && KudasaiABS.isRunning();
            combat.style.display=ready?'grid':'none';
            if(!ready)['kabsAttack','kabsMagic','kabsDodge','kabsSelect'].forEach(function(s){delete held[s];delete releases[s];Input._currentState[s]=false;});
        }
    };
})();
