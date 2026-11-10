/*:
 * @plugindesc v1.2 ABS: retroceso, magia seleccionable y mazmorras. MV 1.6.
 * @author Gstv_
 * @requiredAssets img/characters/Kudasai_Loussiana_Katana
 * @requiredAssets img/characters/Kudasai_Enemigos_Ataques
 * @requiredAssets img/characters/$Kudasai_Guardian_Basalto_Combate
 * @requiredAssets img/characters/$Kudasai_Miku_Corrompido
 * @requiredAssets img/characters/Kudasai_Miku_Ataques
 * @requiredAssets img/pictures/Kudasai_Basalto_Tierra
 * @requiredAssets audio/se/Slash1
 * @requiredAssets audio/se/Damage2
 * @requiredAssets audio/se/Earth4
 * @requiredAssets audio/se/Earth5
 * @requiredAssets audio/se/Splash
 * @param MagicSkill
 * @text Habilidad de magia
 * @type skill
 * @default 10
 * @param HealSkill
 * @text Habilidad de curación
 * @type skill
 * @default 8
 * @param DemoMap
 * @type number
 * @default 32
 * @param CaveMap
 * @text Mapa de la cueva
 * @type number
 * @default 33
 * @param EnemyTempo
 * @text Tiempo de ataque enemigo (%)
 * @type number
 * @min 25
 * @max 200
 * @default 50
 * @help
 * Añadir <KudasaiABS> a las notas del mapa.
 * Evento enemigo: <ABS Enemy: 2> en notas o comentario de página activa.
 * Evento jefe: <ABS Boss: 7> (ID de Enemigos, no ID del evento).
 * También admite <ABS Enemy: 7> <ABS Boss> en la misma línea o separadas.
 * Opcionales: <ABS Boss> <ABS Aggro: 7> <ABS Skill: 11>
 * <ABS Windup: 40> <ABS Cooldown: 90> <ABS Range: 1.25>
 * <ABS AttackSpeed: 85> fija el ritmo individual al 85% del habitual.
 * <ABS DeathSwitch: D> (A/B/C/D; por defecto D).
 * <ABS Pattern: Basalt> activa los patrones y fases de Miku corrompido.
 * Crear una página vacía condicionada al interruptor local elegido.
 * El gráfico del enemigo es el gráfico normal del evento.
 *
 * Flechas: mover. J: atacar. M o botón «Elegir magia»: equipar. K: lanzar.
 * L: esquivar. H: curar. Mando: Select/Back abre el selector.
 * Mando: X atacar, Y magia, L1 esquivar, R1 curar (botones 2/3/4/5).
 * No modifica los atajos originales fuera de mapas ABS.
 * Pausa durante mensajes, eventos, menú, transferencias y cinemáticas.
 * No hay encuentros aleatorios en mapas ABS. Combates de evento normales
 * siguen disponibles. Controla al líder; aliados no combaten en el mapa.
 * Magia: alcance 6 casillas, cono frontal, sin atravesar paredes.
 * Usa habilidades aprendidas, fórmulas, equipo, costes y estados de MV.
 * Un turno de estados equivale a 180 actualizaciones activas (~3 s).
 * Alcances admitidos: enemigo único/todos/aleatorios, aliado vivo/usuario (líder).
 * No admite invocaciones, resurrección, contraataques/reflejo ni IA de tropa.
 * IA usa ABS Skill (por defecto Golpe enemigo), no patrones de la base de datos.
 *
 * Comandos de plugin:
 * KudasaiABS ON / OFF       (pausa persistente global, solo mapas etiquetados)
 * KudasaiABS RESET          (revive enemigos del mapa; también al volver)
 * KudasaiABS ENTER mapa x y [direccion] (guarda origen y transfiere)
 * KudasaiABS SAVE_RETURN    (guarda origen antes de transferencia nativa)
 * KudasaiABS RETURN         (vuelve al último origen, incluso anidado)
 * KudasaiABS MAGIC id       (selecciona una habilidad ofensiva disponible)
 * KudasaiABS DEMO           (visita arena; conserva punto de regreso)
 * KudasaiABS CAVE / CAVE_RETURN (alias antiguos, siguen funcionando)
 * F7 durante prueba de juego abre directamente la cueva.
 * F6 durante prueba de juego abre la arena desde título o mapa libre.
 * En título comienza una partida nueva de prueba, sin tocar guardados.
 *
 * Los enemigos muertos quedan registrados en la partida por mapa/evento.
 * Guardar/cargar conserva HP, IA y tiempos del mapa actual. Al abandonar
 * un mapa, los enemigos vivos recuperan HP al volver. RESET es explícito.
 * Instalar debajo de plugins de cámara. Manual: docs/Kudasai_ABS.md.
 * El selector admite habilidades conocidas (también por equipo), alcance
 * enemigo único/todos/aleatorios, ocasión Siempre/Batalla. Excluye ataque y defensa.
 * Las habilidades del elemento Oscuridad se añaden al aprenderlas.
 * Personaliza su efecto con <ABS Shadow: Spike>, Wave, Chains u Orbit.
 * Sin etiqueta el plugin asigna un efecto de oscuridad por ID de habilidad.
 * EnemyTempo ajusta preparación y recuperación, también en los jefes.
 * Los enemigos comunes atacan un 50% más rápido con ese mismo ajuste.
 * Retroceso: una casilla cuando hay daño HP positivo; no cruza obstáculos.
 */
(function() {
    'use strict';
    var params = PluginManager.parameters('Kudasai_ABS');
    var magicId = Number(params.MagicSkill || 10);
    var healId = Number(params.HealSkill || 8);
    var demoMap = Number(params.DemoMap || 32);
    var caveMap = Number(params.CaveMap || 33);
    var tempo = Math.max(25,Math.min(200,Number(params.EnemyTempo)||50))/100;
    var bossTempo = tempo/.75;
    var popups = [], slashes = [], eruptions = [];
    var katanaSheet = 'Kudasai_Loussiana_Katana';
    var enemyAttackSheet = 'Kudasai_Enemigos_Ataques';
    var basaltSheet = '$Kudasai_Guardian_Basalto_Combate';
    var mikuSheet = '$Kudasai_Miku_Corrompido';
    var mikuAttacks = 'Kudasai_Miku_Ataques';
    var basaltGround = 'Kudasai_Basalto_Tierra';
    var enemyDefaultSkill = 11;
    var enemyImpactTime = enemyFrames(14,bossTempo);
    var commonAttackTime = 1/1.5;
    var katanaCuts = [
        {hit:8, duration:22, range:1.55},
        {hit:7, duration:22, range:1.55},
        {hit:10, duration:28, range:1.9}
    ];
    var keys = {74:'kabsAttack',75:'kabsMagic',76:'kabsDodge',72:'kabsHeal',77:'kabsSelect'};
    Object.keys(keys).forEach(function(k) { if (!Input.keyMapper[k]) Input.keyMapper[k] = keys[k]; });
    if (!Input.keyMapper[117]) Input.keyMapper[117] = 'kabsDemo';
    if (!Input.keyMapper[118]) Input.keyMapper[118] = 'kabsCave';

    function tagged() { return !!($dataMap && /<KudasaiABS>/i.test($dataMap.note || '')); }
    function enabled() { return tagged() && $gameSystem._kabsEnabled !== false; }
    function state() {
        if (!$gameSystem._kabs) $gameSystem._kabs = {stamina:100, attack:0, magic:0, heal:0, dodge:0, invuln:0, steps:0, turn:0, dead:{}};
        if (!$gameSystem._kabs.magicByActor) $gameSystem._kabs.magicByActor={};
        return $gameSystem._kabs;
    }
    function selectingMagic() {return !!(SceneManager._scene&&SceneManager._scene._kabsMagicWindow&&SceneManager._scene._kabsMagicWindow.active);}
    function caveEnding() { return window.KudasaiCave && KudasaiCave.isEnding(); }
    function running() {
        return enabled() && SceneManager._scene instanceof Scene_Map && SceneManager._scene.isActive() &&
            !selectingMagic() && !caveEnding() &&
            !SceneManager.isSceneChanging() && !$gameMap.isEventRunning() && !$gameMessage.isBusy() &&
            !$gamePlayer.isTransferring() && !$gamePlayer.isMoveRouteForcing() && !$gameSystem._kudasaiCine &&
            !($gameMap.mapId() >= 24 && $gameMap.mapId() <= 31);
    }
    function tag(text, name, fallback) {
        var m = new RegExp('<ABS ' + name + ':\\s*([^>]+)>', 'i').exec(text);
        return m ? m[1].trim() : fallback;
    }
    function number(text, name, fallback, min, max) {
        var n = Number(tag(text, name, fallback));
        return isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    }
    function enemyFrames(frames,multiplier) {
        return Math.max(1,Math.round(frames*multiplier));
    }
    function adjustRemaining(left,previous,next) {
        return previous===next||!previous||left<=0?left:Math.min(next,enemyFrames(left,next/previous));
    }
    function enemyDefinition(text) {
        var match=/<\s*ABS\s+(?:Enemy|Boss)\s*:\s*(\d+)\s*>/i.exec(text);
        return {id:match?Number(match[1]):0,boss:/<\s*ABS\s+Boss(?:\s*:\s*\d+)?\s*>/i.test(text)};
    }
    function key(event) { return $gameMap.mapId() + ':' + event.eventId(); }
    function actor() { return $gameParty.leader(); }
    function usesKatana() { return !!actor() && actor().actorId()===1 && $gamePlayer.characterName()==='$Kudasai_Loussiana'; }
    function isShadowSkill(skill) {
        return skill.damage&&skill.damage.elementId===9;
    }
    function offensiveSkills() {
        var a=actor();
        return a?a.skills().filter(function(skill){return skill && skill.id!==a.attackSkillId() && skill.id!==a.guardSkillId() &&
            skill.scope>=1 && skill.scope<=6 && (skill.occasion===0||skill.occasion===1);}).sort(function(a,b){return a.id-b.id;}):[];
    }
    function selectedMagic() {
        var a=actor(),list=offensiveSkills();if(!a)return 0;
        var id=state().magicByActor[a.actorId()];
        if(!list.some(function(s){return s.id===id;})){
            id=list.some(function(s){return s.id===magicId;})?magicId:list.length?list[0].id:0;
            state().magicByActor[a.actorId()]=id;
        }
        return id;
    }
    function selectMagic(id) {
        id=Number(id);if(!actor()||!offensiveSkills().some(function(s){return s.id===id;}))return false;
        state().magicByActor[actor().actorId()]=id;return true;
    }
    function enemies() { return $gameMap.events().filter(function(e) { return e._kabs && !e._erased && e._pageIndex >= 0 && !e._kabs.dead && e._kabs.battler.isAlive(); }); }
    function delta(a, b) { return {x:$gameMap.deltaX(b._realX, a._realX), y:$gameMap.deltaY(b._realY, a._realY)}; }
    function distance(a, b) { var d = delta(a,b); return Math.sqrt(d.x*d.x + d.y*d.y); }
    function forward(d) { return {x:d===6?1:d===4?-1:0, y:d===2?1:d===8?-1:0}; }
    function inFront(a,b,range,direction,width) {
        var d=delta(a,b), f=forward(direction||a.direction());
        return distance(a,b)<=range && d.x*f.x+d.y*f.y >= 0.25 && Math.abs(d.x*f.y-d.y*f.x)<=Math.max(0.7,range*0.5,width||0);
    }
    // Grid ray traversal checks both sides of each tile edge, including corners.
    function sight(a,b) {
        var x=a.x,y=a.y, dx=$gameMap.deltaX(b.x,x),dy=$gameMap.deltaY(b.y,y);
        var nx=Math.abs(dx),ny=Math.abs(dy),ix=0,iy=0,sx=dx<0?4:6,sy=dy<0?8:2;
        function edge(cx,cy,d) {
            var tx=$gameMap.roundXWithDirection(cx,d),ty=$gameMap.roundYWithDirection(cy,d);
            return $gameMap.isPassable(cx,cy,d) && $gameMap.isPassable(tx,ty,10-d) &&
                !$gameMap.eventsXyNt(tx,ty).some(function(e){return e!==a && e!==b && e.isNormalPriority();});
        }
        while(ix<nx || iy<ny) {
            var cross=(1+2*ix)*ny-(1+2*iy)*nx;
            if(cross===0) {
                if(!edge(x,y,sx)||!edge(x,y,sy))return false;
                var xx=$gameMap.roundXWithDirection(x,sx), yy=$gameMap.roundYWithDirection(y,sy);
                if(!edge(xx,y,sy)||!edge(x,yy,sx))return false;
                x=xx;y=yy;ix++;iy++;
            } else if(cross<0) {if(!edge(x,y,sx))return false;x=$gameMap.roundXWithDirection(x,sx);ix++;}
            else {if(!edge(x,y,sy))return false;y=$gameMap.roundYWithDirection(y,sy);iy++;}
        }
        return true;
    }
    function popup(character,text,color) {popups.push({x:character._realX,y:character._realY,text:String(text),color:color||'#fff0c0',life:60});}
    function sound(name,volume,pitch) { AudioManager.playSe({name:name,volume:volume,pitch:pitch,pan:0}); }
    function canUse(b,skill) {
        return !!skill && (skill.occasion===0 || skill.occasion===1) && b.canMove() &&
            b.isSkillWtypeOk(skill) && b.canPaySkillCost(skill) && !b.isSkillSealed(skill.id) && !b.isSkillTypeSealed(skill.stypeId);
    }
    function actionFor(b,skillId) {
        var action=new Game_Action(b);
        // Enemy battlers live on events, not in $gameTroop. Never mutate the troop.
        action.subject=function(){return b;};
        action.setSkill(skillId);
        return action;
    }
    function knockback(character,source) {
        if(!source||character===source||character._kabsPush||character.isJumping())return;
        var d=delta(source,character),dir=Math.abs(d.x)>Math.abs(d.y)?(d.x>=0?6:4):(d.y>=0?2:8);
        if(Math.abs(d.x)+Math.abs(d.y)<0.01)dir=source.direction();
        character._kabsPush={dir:dir,pending:true,frames:12};
        if(character===$gamePlayer){
            $gameTemp.clearDestination();state().steps=0;state().dodge=0;
            character._kabsSwing=null;character._kabsChain=null;character._kabsRoll=null;
        }
    }
    var characterUpdate=Game_CharacterBase.prototype.update;
    Game_CharacterBase.prototype.update=function(){
        var push=this._kabsPush;
        if(push&&enabled()&&!running())return;
        if(push&&enabled()&&running()){
            if(push.pending&&!this.isMoving()){
                push.pending=false;
                if(this.canPass(this.x,this.y,push.dir)){
                    var facing=this.direction(),fixed=this.isDirectionFixed();this.setDirectionFix(true);
                    this.moveStraight(push.dir);this.setDirectionFix(fixed);this.setDirection(facing);
                }
            }
            if(!push.pending&&push.frames>0)push.frames--;
        }
        characterUpdate.apply(this,arguments);
        if(push&&!push.pending&&push.frames<=0&&!this.isMoving())this._kabsPush=null;
    };
    var stepDistance=Game_CharacterBase.prototype.distancePerFrame;
    Game_CharacterBase.prototype.distancePerFrame=function(){return this._kabsPush&&!this._kabsPush.pending&&enabled()?0.25:stepDistance.apply(this,arguments);};
    var locateCharacter=Game_CharacterBase.prototype.locate;
    Game_CharacterBase.prototype.locate=function(){
        this._kabsPush=null;
        if(this===$gamePlayer){this._kabsSwing=null;this._kabsChain=null;this._kabsRoll=null;}
        locateCharacter.apply(this,arguments);
    };
    function apply(action,target,character,source,customImpact) {
        var repeats=action.numRepeats(),damaged=false;
        for(var i=0;i<repeats && target.isAlive();i++) {
            action.apply(target);
            var r=target.result();
            if(r.isHit()&&r.hpDamage>0)damaged=true;
            if(r.missed||r.evaded)popup(character,'FALLO','#c3c8dd');
            else if(r.hpAffected)popup(character,(r.hpDamage<0?'+':'')+Math.abs(r.hpDamage)+(r.critical?' !':''),r.hpDamage<0?'#83edb4':'#ffffff');
            else if(r.mpDamage)popup(character,'PM '+(-r.mpDamage),'#81d5ff');
        }
        var id=action.item().animationId;
        if(id<0)id=action.subject().isActor()?action.subject().attackAnimationId1():1;
        var animation=$dataAnimations[id];
        if(!customImpact&&animation){
            var shadow=isShadowSkill(action.item())&&source===$gamePlayer;
            var assetNames=[animation.name,animation.animation1Name,animation.animation2Name].join(' ');
            if(!shadow||/oscur|umbr|dark|shadow|sombra/i.test(assetNames))character.requestAnimation(id);
        }
        if(target.isDead() && character._kabs)defeat(character);
        else if(target.isAlive()&&damaged&&!(character._kabs&&character._kabs.basalt))knockback(character,source);
        return damaged;
    }
    function defeat(event) {
        var e=event._kabs;
        if(!e || e.dead || state().dead[key(event)])return;
        e.dead=true;state().dead[key(event)]=true;
        $gameParty.gainGold(e.battler.gold());
        $gameParty.allMembers().forEach(function(a){a.gainExp(e.battler.exp());});
        e.battler.makeDropItems().forEach(function(item){$gameParty.gainItem(item,1);});
        if(e.battler.exp()||e.battler.gold())popup(event,'+'+e.battler.exp()+' EXP  +'+e.battler.gold()+' G','#f4d378');
        $gameSelfSwitches.setValue([$gameMap.mapId(),event.eventId(),e.deathSwitch],true);
        if(window.KudasaiCave && KudasaiCave.startBossEnding(event)) {
            $gamePlayer._kabsSwing=$gamePlayer._kabsRoll=$gamePlayer._kabsPush=null;
            popups=[];slashes=[];eruptions=[];
        }
        event.erase();
    }
    function setupEnemy(event) {
        if(!tagged() || !event.page()) {event._kabs=null;return;}
        var comments=event.list().filter(function(c){return c.code===108||c.code===408;}).map(function(c){return c.parameters[0];}).join('\n');
        var text=comments+'\n'+(event.event().note||'');
        var definition=enemyDefinition(text),id=definition.id;
        if(!$dataEnemies[id]) {event._kabs=null;return;}
        if(state().dead[key(event)]) {event._erased=true;event._kabs=null;event.refresh();return;}
        var attackSpeed=number(text,'AttackSpeed',100,25,400)/100;
        var attackTime=(definition.boss?1:commonAttackTime)/attackSpeed;
        var patternTempo=bossTempo/attackSpeed;
        var windup=enemyFrames(number(text,'Windup',40,12,240),tempo*attackTime);
        var cooldown=enemyFrames(number(text,'Cooldown',90,20,600),tempo*attackTime);
        var impactLength=enemyFrames(enemyImpactTime,attackTime);
        var basalt=definition.boss&&tag(text,'Pattern','').toLowerCase()==='basalt';
        var skill=number(text,'Skill',enemyDefaultSkill,1,9999);
        // Existing saves may still have the shared walking sprite cached on the event.
        if(basalt&&(event.characterName()===basaltSheet||
            (event.characterName()==='Kudasai_Monster'&&event.characterIndex()===3))){
            event.setImage(mikuSheet,0);
        }
        if(event._kabs && event._kabs.enemyId===id){
            var enemy=event._kabs;
            enemy.wind=basalt?0:adjustRemaining(enemy.wind,enemy.windup,windup);
            enemy.cd=adjustRemaining(enemy.cd,enemy.cooldown,cooldown);
            enemy.impactPose=adjustRemaining(enemy.impactPose||0,enemy.impactLength||14,impactLength);
            enemy.impactLength=impactLength;
            if(basalt&&enemy.cast){
                var length=basaltWindup(enemy.cast.kind,enemy.cast.phase,patternTempo);
                enemy.cast.left=adjustRemaining(enemy.cast.left,enemy.cast.length,length);
                enemy.cast.length=length;
            }
            if(basalt&&enemy.recover>0&&enemy.bossTempo!==patternTempo){
                enemy.recover=enemyFrames(enemy.recover,patternTempo/(enemy.bossTempo||1));
            }
            if(!basalt)enemy.cast=null;
            enemy.boss=definition.boss;enemy.basalt=basalt;enemy.bossTempo=patternTempo;
            enemy.windup=windup;enemy.cooldown=cooldown;enemy.skill=skill;
            return;
        }
        event._kabs={enemyId:id,battler:new Game_Enemy(id,0,0),boss:definition.boss,basalt:basalt,dead:false,
            aggro:number(text,'Aggro',7,1,30),skill:skill,
            range:number(text,'Range',1.25,0.5,6),windup:windup,
            cooldown:cooldown,deathSwitch:tag(text,'DeathSwitch','D').toUpperCase(),
            cd:enemyFrames(18,bossTempo*attackTime),wind:0,stun:0,targetX:0,targetY:0,
            impactLength:impactLength,bossTempo:patternTempo};
        if(!/^[ABCD]$/.test(event._kabs.deathSwitch))event._kabs.deathSwitch='D';
    }
    var setupPage=Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage=function(){setupPage.apply(this,arguments);setupEnemy(this);};
    var eventStop=Game_Event.prototype.updateStop;
    Game_Event.prototype.updateStop=function(){if(enabled()&&this._kabs)Game_CharacterBase.prototype.updateStop.call(this);else eventStop.apply(this,arguments);};
    var eventUpdate=Game_Event.prototype.update;
    Game_Event.prototype.update=function(){if(enabled()&&this._kabs&&!running())return;eventUpdate.apply(this,arguments);};
    var eventStart=Game_Event.prototype.start;
    Game_Event.prototype.start=function(){if(enabled()&&this._kabs)return;eventStart.apply(this,arguments);};
    var mapSetup=Game_Map.prototype.setup;
    Game_Map.prototype.setup=function(id){
        popups=[];slashes=[];eruptions=[];
        mapSetup.apply(this,arguments);
        var s=state();s.steps=0;s.dodge=0;s.invuln=0;
        $gamePlayer._kabsPush=null;$gamePlayer._kabsSwing=null;$gamePlayer._kabsChain=null;$gamePlayer._kabsRoll=null;
    };
    var encounter=Game_Player.prototype.executeEncounter;
    Game_Player.prototype.executeEncounter=function(){return enabled()?false:encounter.apply(this,arguments);};
    var walkTurn=Game_Actor.prototype.turnEndOnMap;
    Game_Actor.prototype.turnEndOnMap=function(){if(enabled()&&this===actor())return;walkTurn.apply(this,arguments);};
    var moveInput=Game_Player.prototype.moveByInput;
    Game_Player.prototype.moveByInput=function(){
        if(enabled() && (!actor() || !actor().canMove() || state().steps>0 || this._kabsPush ||
            this._kabsSwing || this._kabsRoll || Input.isTriggered('kabsDodge') || selectingMagic()))return;
        moveInput.apply(this,arguments);
    };
    var realSpeed=Game_Player.prototype.realMoveSpeed;
    Game_Player.prototype.realMoveSpeed=function(){return enabled()&&state().dodge>0?6:realSpeed.apply(this,arguments);};

    function enemyFamily(event) {
        if(event.characterName()===basaltSheet||event.characterName()===mikuSheet)return 3;
        return event.characterName()==='Kudasai_Monster'?event.characterIndex():-1;
    }
    function enemyAttackPose(enemy) {
        if(enemy.cast)return {frame:0,charge:1-enemy.cast.left/enemy.cast.length};
        if(enemy.wind>0)return {frame:0,charge:1-enemy.wind/enemy.windup};
        if(enemy.impactPose>0){
            var recovery=Math.round(enemy.impactLength*8/14);
            return {frame:enemy.impactPose>recovery?1:2,charge:0};
        }
        return null;
    }
    function hideCharacterFrame(sprite) {
        sprite.setFrame(0,0,0,0);
        if(sprite._upperBody)sprite._upperBody.visible=false;
        if(sprite._lowerBody)sprite._lowerBody.visible=false;
    }
    function scaleEnemyPose(sprite,x,y) {
        var base=sprite._kabsEnemyBaseScale;
        if(!base){
            if(x===1&&y===1)return;
            base={x:sprite.scale.x,y:sprite.scale.y};
            sprite._kabsEnemyBaseScale=base;
        }
        sprite.scale.set(base.x*x,base.y*y);
        if(x===1&&y===1)sprite._kabsEnemyBaseScale=null;
    }
    function drawEnemyPose(sprite,event) {
        var enemy=enabled()&&event._kabs;
        var pose=enemy&&!enemy.dead&&enemyAttackPose(enemy);
        var attack=sprite._kabsEnemyAttack;
        var miku=event.characterName()===mikuSheet;
        var magnify=enemy&&enemy.basalt&&!miku?1.16:1;
        if(attack)attack.visible=false;
        if(!pose){
            scaleEnemyPose(sprite,magnify,magnify);
            return;
        }
        var family=enemyFamily(event);
        var kind=enemy.cast?enemy.cast.kind:enemy.impactKind;
        var direction=event.direction();
        var lean=forward(direction);
        if(family>=0&&family<4){
            if(!attack){
                attack=new Sprite();
                attack.anchor.set(.5,1);
                sprite.addChild(attack);
                sprite._kabsEnemyAttack=attack;
            }
            var bitmap=ImageManager.loadCharacter(miku?mikuAttacks:enemyAttackSheet);
            if(attack.bitmap!==bitmap)attack.bitmap=bitmap;
            if(bitmap.isReady()){
                var row=direction===2?0:direction===8?2:1;
                var strip=family;
                if(enemy.basalt&&family===3){
                    if(kind==='fault')strip=4;
                    if(kind==='fracture')strip=5;
                }
                var frameSize=miku?96:64;
                var column=miku?pose.frame:strip*3+pose.frame;
                attack.setFrame(column*frameSize,row*frameSize,frameSize,frameSize);
                attack.scale.x=direction===4?-1:1;
                var lunge=miku&&kind==='fault'?15:6;
                var offset=pose.frame===0?-3*pose.charge:pose.frame===1?lunge:2;
                attack.x=Math.round(lean.x*offset);
                var jump=kind==='fracture'&&pose.frame===1?9:0;
                attack.y=Math.round(lean.y*offset)-jump;
                attack.visible=true;
                scaleEnemyPose(sprite,magnify,magnify);
                hideCharacterFrame(sprite);
                return;
            }
        }
        // Unknown enemy sheets keep their own art and show a distinct recoil.
        var push=pose.frame===1?.14:0;
        scaleEnemyPose(sprite,magnify*(1+pose.charge*.12-push*.5),magnify*(1-pose.charge*.16+push));
    }
    var characterFrame=Sprite_Character.prototype.updateFrame;
    Sprite_Character.prototype.updateFrame=function(){
        characterFrame.apply(this,arguments);
        if(this._character!==$gamePlayer){
            drawEnemyPose(this,this._character);
            return;
        }
        var swing=$gamePlayer._kabsSwing;
        if(this._kabsKatana)this._kabsKatana.visible=false;
        if(!swing||!enabled()||!usesKatana())return;
        if(!this._kabsKatana){
            var sprite=new Sprite(ImageManager.loadCharacter(katanaSheet));
            sprite.anchor.set(0.5,1);this.addChild(sprite);this._kabsKatana=sprite;
        }
        var blade=this._kabsKatana;
        if(!blade.bitmap.isReady())return;
        var cut=katanaCuts[swing.cut],age=swing.age;
        var frame=age<3?0:age<cut.hit?1:age<cut.hit+5?2:3;
        var row=swing.direction===2?0:swing.direction===8?2:1;
        blade.scale.x=swing.direction===4?-1:1;
        blade.setFrame(frame*104,row*72,104,72);
        blade.visible=true;
        hideCharacterFrame(this);
    };

    function pressed(name,button,repeat) {
        // Poll gamepad only on ABS maps, preserving MV's global mapper.
        var down=false;
        if(navigator.getGamepads) {
            var pads=navigator.getGamepads();
            for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].buttons[button]&&pads[i].buttons[button].pressed)down=true;
        }
        var s=state(),k='pad'+button,trigger=down&&!s[k];s[k]=down;
        return (repeat?Input.isPressed(name):Input.isTriggered(name)) || (repeat?down:trigger);
    }
    function playerTargets(action,range,direction,cleave) {
        if(action.isForFriend()&&!action.isForDeadFriend())return [$gamePlayer];
        if(!action.isForOpponent())return [];
        var targets=enemies().filter(function(e){return inFront($gamePlayer,e,range,direction,cleave?1.15:0)&&sight($gamePlayer,e);});
        targets.sort(function(a,b){return distance($gamePlayer,a)-distance($gamePlayer,b);});
        if(action.isForAll()||cleave)return targets;
        if(action.isForRandom()&&targets.length){
            return Array.from({length:action.numTargets()},function(){
                return targets[Math.randomInt(targets.length)];
            });
        }
        return targets.slice(0,1);
    }
    function resolvePlayer(action,targets,customImpact) {
        var a=action.subject(),hit=false;
        a.useItem(action.item());
        targets.forEach(function(e){
            if(e!==$gamePlayer&&(!e._kabs||e._kabs.dead))return;
            if(!apply(action,e===$gamePlayer?a:e._kabs.battler,e,$gamePlayer,customImpact))return;
            hit=true;
            if(customImpact)eruptions.push({kind:'hit',x:e._realX,y:e._realY,life:13,length:13});
            if(e._kabs&&!e._kabs.dead&&!e._kabs.basalt){e._kabs.stun=8;e._kabs.wind=0;e._kabs.impactPose=0;}
        });
        action.applyGlobal();a.onAllActionsEnd();
        return hit;
    }
    var shadowForms=['spike','wave','chains','orbit'];
    function shadowCast(skill,targets) {
        var p=$gamePlayer,id=skill.id;
        var form=tag(skill.note||'','Shadow','').toLowerCase();
        if(shadowForms.indexOf(form)<0)form=shadowForms[(id-1)%shadowForms.length];
        var points=targets.filter(function(e,i){return targets.indexOf(e)===i;}).map(function(e){
            return {x:e._realX,y:e._realY};
        });
        var duration=22+id%7;
        slashes.push({spell:form,id:id,x:p._realX,y:p._realY,d:p.direction(),
            points:points,life:duration,length:duration});
    }
    function usePlayer(skillId,slot,range,cooldown,basic) {
        var a=actor(),s=state(),skill=$dataSkills[skillId];
        if(s[slot]>0||s.dodge>0||$gamePlayer._kabsPush||$gamePlayer._kabsSwing||!canUse(a,skill)||(!basic&&!a.hasSkill(skillId)))return;
        var action=actionFor(a,skillId);
        if(!action.isForOpponent()&&(!action.isForFriend()||action.isForDeadFriend()))return;
        var targets=playerTargets(action,range);
        if(action.isForOpponent()&&!basic&&!targets.length){popup($gamePlayer,'Sin objetivo','#b7c2dc');s[slot]=12;return;}
        s[slot]=cooldown;
        if(action.isForOpponent()){
            if(isShadowSkill(skill))shadowCast(skill,targets);
            else slashes.push({x:$gamePlayer._realX,y:$gamePlayer._realY,d:$gamePlayer.direction(),life:14,magic:!basic});
        }
        resolvePlayer(action,targets,false);
    }
    function startKatana() {
        var p=$gamePlayer,a=actor(),s=state(),id=a.attackSkillId();
        if(s.attack>0||s.dodge>0||p._kabsPush||p._kabsSwing||!canUse(a,$dataSkills[id]))return;
        var chain=p._kabsChain,index=chain&&chain.time>0?chain.next:0;
        p._kabsSwing={cut:index,age:0,skill:id,direction:p.direction()};
        p._kabsChain={next:(index+1)%katanaCuts.length,time:katanaCuts[index].duration+16};
        s.attack=katanaCuts[index].duration;
        $gameTemp.clearDestination();
    }
    function updateKatana() {
        var p=$gamePlayer,swing=p._kabsSwing;
        if(p._kabsChain&&--p._kabsChain.time<=0)p._kabsChain=null;
        if(!swing)return;
        var cut=katanaCuts[swing.cut],a=actor();
        if(!usesKatana()||!a.canMove()||++swing.age>=cut.duration){p._kabsSwing=null;return;}
        if(swing.age!==cut.hit||!canUse(a,$dataSkills[swing.skill]))return;
        var action=actionFor(a,swing.skill),finisher=swing.cut===2;
        var targets=playerTargets(action,cut.range,swing.direction,finisher);
        slashes.push({x:p._realX,y:p._realY,d:swing.direction,life:finisher?19:14,dark:true,cut:swing.cut});
        sound('Slash1',52,finisher?83:110-swing.cut*13);
        if(resolvePlayer(action,targets,true)){
            sound('Damage2',37,finisher?88:106);
            if(finisher)$gameScreen.startShake(2,6,9);
        }
    }
    function dodge(d) {
        var s=state();
        if(s.dodge>0||s.stamina<30||!actor().canMove()||$gamePlayer._kabsPush||$gamePlayer.isMoving()||!$gamePlayer.canPass($gamePlayer.x,$gamePlayer.y,d))return;
        var swing=$gamePlayer._kabsSwing;
        if(swing&&swing.age<katanaCuts[swing.cut].hit+4)return;
        $gamePlayer._kabsSwing=null;
        $gameTemp.clearDestination();$gamePlayer.setDirection(d);
        s.stamina-=30;s.dodge=24;s.invuln=Math.max(s.invuln,24);s.steps=2;s.dodgeDir=d;
        return true;
    }
    var basaltPatterns = {
        slam: {title:'Golpe sísmico',wind:43,recover:56,reach:2.65,radius:1.08},
        fault: {title:'Falla de basalto',wind:49,recover:49,reach:4.7,width:0.61},
        fracture: {title:'Erupción triple',wind:46,recover:64,reach:4.7,radius:0.92}
    };
    function basaltWindup(kind,phase,patternTempo) {
        return enemyFrames(basaltPatterns[kind].wind-(phase===2?8:0),patternTempo);
    }
    function basaltCast(event,kind,dist,phase) {
        var p=$gamePlayer,d=delta(event,p);
        var cast={kind:kind,phase:phase,length:basaltWindup(kind,phase,event._kabs.bossTempo)};
        cast.left=cast.length;
        if(kind==='fault'){
            cast.x=event._realX;cast.y=event._realY;
            cast.dx=d.x/dist;cast.dy=d.y/dist;
        }else{
            cast.centers=[{x:p._realX,y:p._realY}];
            if(kind==='fracture')[-1.65,1.65].forEach(function(offset){
                cast.centers.push({x:$gameMap.roundX(p._realX-d.y/dist*offset),y:$gameMap.roundY(p._realY+d.x/dist*offset)});
            });
        }
        return cast;
    }
    function basaltHits(cast,character) {
        var pattern=basaltPatterns[cast.kind];
        function dx(x){return $gameMap.deltaX(character._realX,x);}
        function dy(y){return $gameMap.deltaY(character._realY,y);}
        if(cast.centers)return cast.centers.some(function(p){
            var x=dx(p.x),y=dy(p.y);
            return x*x+y*y<=pattern.radius*pattern.radius;
        });
        var x=dx(cast.x),y=dy(cast.y),along=x*cast.dx+y*cast.dy;
        return along>=0&&along<=pattern.reach&&Math.abs(x*cast.dy-y*cast.dx)<=pattern.width;
    }
    function updateBasalt(event) {
        var e=event._kabs,b=e.battler,p=$gamePlayer,dist=distance(event,p);
        if(!b.canMove()){e.cast=null;return;}
        if(e.phase!==2&&b.hpRate()<=0.5){
            e.phase=2;e.cast=null;e.recover=enemyFrames(57,e.bossTempo);e.sequence=0;e.impactPose=0;
            var phaseEffect=enemyFrames(42,e.bossTempo);
            eruptions.push({kind:'phase',x:event._realX,y:event._realY,life:phaseEffect,length:phaseEffect});
            popup(event,'Núcleo agrietado','#ffc895');sound('Earth5',59,83);
            $gameScreen.startShake(3,5,21);
            return;
        }
        if(e.cast){
            var cast=e.cast;
            if(--cast.left>0)return;
            e.cast=null;e.recover=enemyFrames(basaltPatterns[cast.kind].recover,e.bossTempo);
            e.impactPose=e.impactLength;e.impactKind=cast.kind;
            var impactLength=enemyFrames(22,e.bossTempo);
            eruptions.push({cast:cast,life:impactLength,length:impactLength});
            sound('Earth4',61,cast.kind==='fracture'?75:97);
            if(dist<=7)$gameScreen.startShake(cast.phase===2?4:2,6,12);
            var skill=$dataSkills[e.skill];
            if(!canUse(b,skill))return;
            var action=actionFor(b,e.skill);
            if(!action.isForOpponent())return;
            b.useItem(skill);
            if(state().invuln<=0&&basaltHits(cast,p)&&sight(event,p)&&apply(action,actor(),p,event,true))state().invuln=36;
            action.applyGlobal();b.onAllActionsEnd();
            return;
        }
        if(e.recover>0){e.recover--;return;}
        if(e.cd>0)e.cd--;
        if(event.isMoving()||dist>e.aggro)return;
        var phase=e.phase||1,sequence=phase===2?['fracture','fault','slam']:['slam','fault'];
        var i=e.sequence||0,kind=sequence[i%sequence.length];
        if(dist>0.05&&dist<=basaltPatterns[kind].reach&&sight(event,p)){
            event.turnTowardCharacter(p);
            if(e.cd===0&&canUse(b,$dataSkills[e.skill])){
                e.cast=basaltCast(event,kind,dist,phase);
                e.sequence=i+1;
            }
        }else{
            var dir=event.findDirectionTo(p.x,p.y);
            if(dir)event.moveStraight(dir);
        }
    }
    function updateEnemy(event) {
        var e=event._kabs,b=e.battler;
        if(e.impactPose>0)e.impactPose--;
        if(event._kabsPush)return;
        if(e.basalt){updateBasalt(event);return;}
        if(e.stun>0){e.stun--;return;}
        if(!b.canMove()){e.wind=0;return;}
        if(e.cd>0)e.cd--;
        if(e.wind>0) {
            e.wind--;
            if(e.wind===0) {
                var dx=$gameMap.deltaX($gamePlayer._realX,e.targetX),dy=$gameMap.deltaY($gamePlayer._realY,e.targetY);
                var skill=$dataSkills[e.skill];
                if(canUse(b,skill)) {
                    var action=actionFor(b,e.skill);
                    if(action.isForOpponent()) {
                        b.useItem(skill);
                        var basic=e.skill===1||e.skill===enemyDefaultSkill;
                        e.impactPose=e.impactLength;
                        var family=enemyFamily(event);
                        eruptions.push({kind:'enemyStrike',family:family,boss:e.boss,
                            x:event._realX,y:event._realY,d:event.direction(),targetX:e.targetX,targetY:e.targetY,
                            life:e.impactLength,length:e.impactLength});
                        if(basic)sound(family===1?'Splash':family===3?'Earth4':'Slash1',e.boss?49:37,family===0?140:96);
                        if(Math.abs(dx)<0.8&&Math.abs(dy)<0.8&&distance(event,$gamePlayer)<=e.range+0.3&&sight(event,$gamePlayer)&&state().invuln<=0) {
                            if(apply(action,actor(),$gamePlayer,event,basic))state().invuln=36;
                        }
                        action.applyGlobal();b.onAllActionsEnd();
                    }
                }
                e.cd=e.cooldown;
            }
            return;
        }
        if(event.isMoving())return;
        var dist=distance(event,$gamePlayer);
        if(dist>e.aggro)return;
        if(dist<=e.range&&sight(event,$gamePlayer)) {
            event.turnTowardCharacter($gamePlayer);
            if(e.cd===0&&canUse(b,$dataSkills[e.skill])){e.wind=e.windup;e.targetX=$gamePlayer._realX;e.targetY=$gamePlayer._realY;}
        } else {
            var dir=event.findDirectionTo($gamePlayer.x,$gamePlayer.y);
            if(dir)event.moveStraight(dir);
        }
    }
    function tickStates(b,character) {
        b.clearResult();b.regenerateAll();b.updateStateTurns();b.updateBuffTurns();b.removeStatesAuto(1);b.removeStatesAuto(2);b.removeBuffsAuto();
        if(b.result().hpDamage)popup(character,Math.abs(b.result().hpDamage),b.result().hpDamage<0?'#83edb4':'#fff');
        if(b.isDead()&&character._kabs)defeat(character);
    }
    function updateCombat() {
        if(!running()||!actor())return;
        if(pressed('kabsSelect',8,false)){SceneManager._scene.openKudasaiMagic();return;}
        var s=state();
        if(actor().isDead()){SceneManager.goto(Scene_Gameover);return;}
        ['attack','magic','heal','dodge','invuln'].forEach(function(k){s[k]=Math.max(0,s[k]-1);});
        updateKatana();
        s.stamina=Math.min(100,s.stamina+0.35);
        if(!s.dodge)s.steps=0;
        if(s.steps>0&&!$gamePlayer.isMoving()){$gamePlayer.moveStraight(s.dodgeDir);s.steps--;if(!$gamePlayer.isMovementSucceeded())s.steps=0;}
        var attack=pressed('kabsAttack',2,true),magic=pressed('kabsMagic',3,false),roll=pressed('kabsDodge',4,false),heal=pressed('kabsHeal',5,false);
        var player=$gamePlayer;
        if(roll&&!s.dodge&&s.stamina>=30&&!player._kabsPush){
            player._kabsRoll={direction:Input.dir4||player.direction(),frames:16};
        }
        var request=player._kabsRoll;
        if(request&&(dodge(request.direction)||(!player.isMoving()&&!player._kabsSwing)||--request.frames<=0))player._kabsRoll=null;
        if(attack&&!player._kabsRoll){
            if(usesKatana())startKatana();
            else usePlayer(actor().attackSkillId(),'attack',1.55,26,true);
        }
        if(magic)usePlayer(selectedMagic(),'magic',6,75,false);
        if(heal)usePlayer(healId,'heal',0,180,false);
        if(caveEnding())return;
        enemies().forEach(updateEnemy);
        s.turn++;
        if(s.turn>=180){
            s.turn=0;
            tickStates(actor(),$gamePlayer);
            if(!actor().isDead())enemies().forEach(function(e){tickStates(e._kabs.battler,e);});
        }
        popups.forEach(function(p){p.life--;});popups=popups.filter(function(p){return p.life>0;}).slice(-32);
        slashes.forEach(function(p){p.life--;});slashes=slashes.filter(function(p){return p.life>0;});
        eruptions.forEach(function(p){p.life--;});eruptions=eruptions.filter(function(p){return p.life>0;});
        if(actor().isDead())SceneManager.goto(Scene_Gameover);
    }
    function resetEnemies() {
        $gameMap.events().forEach(function(e){
            delete state().dead[key(e)];
            var text=(e.event().note||'')+'\n'+e.event().pages.map(function(p){return p.list.filter(function(c){return c.code===108||c.code===408;}).map(function(c){return c.parameters[0];}).join('\n');}).join('\n');
            if(!enemyDefinition(text).id)return;
            var letter=e._kabs?e._kabs.deathSwitch:tag(text,'DeathSwitch','D').toUpperCase();
            $gameSelfSwitches.setValue([$gameMap.mapId(),e.eventId(),letter],false);
            e._kabs=null;e._kabsPush=null;e._erased=false;e.refresh();setupEnemy(e);e.locate(e.event().x,e.event().y);
        });
    }
    function returnStack(){if(!$gameSystem._kabsReturnStack)$gameSystem._kabsReturnStack=[];return $gameSystem._kabsReturnStack;}
    function hasReturnPoint(){return !!(returnStack().length||$gameSystem._kabsCaveReturn||$gameSystem._kabsReturn);}
    function rememberOrigin(){
        if($gamePlayer.isTransferring()||$gamePlayer.isInVehicle()||!$gameMap.mapId())return false;
        returnStack().push({map:$gameMap.mapId(),x:$gamePlayer.x,y:$gamePlayer.y,d:$gamePlayer.direction(),transparent:$gamePlayer.isTransparent()});return true;
    }
    function enterDungeon(map,x,y,d){
        map=Number(map);x=Number(x);y=Number(y);d=d===undefined?2:Number(d);
        if(!$dataMapInfos[map]||![map,x,y].every(function(n){return isFinite(n)&&n>=0&&Math.floor(n)===n;})||[2,4,6,8].indexOf(d)<0||!rememberOrigin())return false;
        $gamePlayer.setTransparent(false);$gamePlayer.reserveTransfer(map,x,y,d,0);return true;
    }
    function returnToOrigin(){
        if($gamePlayer.isTransferring()||$gamePlayer.isInVehicle())return false;
        var stack=returnStack(),p=stack.length?stack[stack.length-1]:$gameSystem._kabsCaveReturn||$gameSystem._kabsReturn;
        if(!p||!$dataMapInfos[p.map])return false;
        if(stack.length)stack.pop();
        else if($gameSystem._kabsCaveReturn)delete $gameSystem._kabsCaveReturn;
        else delete $gameSystem._kabsReturn;
        $gameSystem._kabsReturnGuard={map:p.map,x:p.x,y:p.y};
        $gamePlayer.setTransparent(!!p.transparent);$gamePlayer.reserveTransfer(p.map,p.x,p.y,p.d,0);return true;
    }
    function enterDemo(){if($gameMap.mapId()!==demoMap)return enterDungeon(demoMap,17,21,8);return false;}
    function returnDemo(){return returnToOrigin();}
    function enterCave(){if($gameMap.mapId()!==caveMap)return enterDungeon(caveMap,22,31,8);return false;}
    function returnCave(){
        if(returnToOrigin())return true;
        // Legacy F7 test entry has no origin; its old exit still leads to arena.
        if(!$gamePlayer.isTransferring()&&$gameMap.mapId()===caveMap&&$dataMapInfos[demoMap]){
            $gamePlayer.reserveTransfer(demoMap,17,21,8,0);return true;
        }
        return false;
    }
    var startMapEvent=Game_Player.prototype.startMapEvent;
    Game_Player.prototype.startMapEvent=function(x,y,triggers,normal){
        var g=$gameSystem._kabsReturnGuard;
        if(g&&this.isTransferring())return;
        if(g){
            if(g.map!==$gameMap.mapId()||this.x!==g.x||this.y!==g.y)delete $gameSystem._kabsReturnGuard;
            else if(x===g.x&&y===g.y&&triggers.indexOf(0)<0)return;
        }
        startMapEvent.apply(this,arguments);
    };
    var command=Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand=function(name,args){
        command.apply(this,arguments);
        if(name.toLowerCase()!=='kudasaiabs')return;
        switch((args[0]||'').toUpperCase()) {
        case 'ON':$gameSystem._kabsEnabled=true;break;
        case 'OFF':$gameSystem._kabsEnabled=false;break;
        case 'RESET':resetEnemies();break;
        case 'ENTER':if(enterDungeon(args[1],args[2],args[3],args[4]))this.setWaitMode('transfer');break;
        case 'SAVE_RETURN':rememberOrigin();break;
        case 'MAGIC':selectMagic(args[1]);break;
        case 'DEMO':enterDemo();break;
        case 'RETURN':if(returnToOrigin())this.setWaitMode('transfer');break;
        case 'CAVE':enterCave();break;
        case 'CAVE_RETURN':returnCave();break;
        }
    };

    function MagicWindow(){this.initialize.apply(this,arguments);}
    MagicWindow.prototype=Object.create(Window_Command.prototype);MagicWindow.prototype.constructor=MagicWindow;
    MagicWindow.prototype.windowWidth=function(){return Math.min(560,Graphics.boxWidth-48);};
    MagicWindow.prototype.numVisibleRows=function(){return Math.min(7,Math.max(1,this.maxItems()),Math.max(1,Math.floor((Graphics.boxHeight-220)/this.lineHeight())));};
    MagicWindow.prototype.makeCommandList=function(){
        var equipped=selectedMagic();
        offensiveSkills().forEach(function(skill){
            var a=actor(),cost=[];if(a.skillMpCost(skill))cost.push(a.skillMpCost(skill)+' PM');if(a.skillTpCost(skill))cost.push(a.skillTpCost(skill)+' PT');
            var label=skill.name+'   '+(cost.length?cost.join(' / '):'Sin coste');
            if(skill.id===equipped)label+='   • Equipada';
            this.addCommand(label,'magic',true,skill.id);
        },this);
        if(!this.maxItems())this.addCommand('No conoces habilidades ofensivas compatibles','none',false,0);
    };
    MagicWindow.prototype.updateHelp=function(){
        var skill=$dataSkills[this.currentExt()];
        if(this._helpWindow)this._helpWindow.setText('MAGIA DE ATAQUE  |  Enter: equipar  |  K: lanzar\n'+(skill?(skill.description||skill.name+' - alcance frontal de 6 casillas.'):'Aprende una habilidad ofensiva para equiparla aquí.'));
    };
    Scene_Map.prototype.openKudasaiMagic=function(){
        if(!running()||!actor())return;
        $gameTemp.clearDestination();
        if(!this._kabsMagicWindow){
            this._kabsMagicHelp=new Window_Help(3);this._kabsMagicHelp.width=Math.min(560,Graphics.boxWidth-48);
            this._kabsMagicHelp.standardFontSize=function(){return 18;};this._kabsMagicHelp.lineHeight=function(){return 24;};
            this._kabsMagicHelp.height=this._kabsMagicHelp.fittingHeight(3);this._kabsMagicHelp.createContents();
            this._kabsMagicWindow=new MagicWindow(0,0);this._kabsMagicWindow.setHelpWindow(this._kabsMagicHelp);
            this._kabsMagicWindow.setHandler('magic',function(){selectMagic(this._kabsMagicWindow.currentExt());this.closeKudasaiMagic();}.bind(this));
            this._kabsMagicWindow.setHandler('cancel',this.closeKudasaiMagic.bind(this));
            this.addWindow(this._kabsMagicHelp);this.addWindow(this._kabsMagicWindow);
        }
        var win=this._kabsMagicWindow,help=this._kabsMagicHelp;win.refresh();win.height=win.windowHeight();win.createContents();win.drawAllItems();
        var top=Math.max(12,(Graphics.boxHeight-win.height-help.height)/2);
        help.x=win.x=(Graphics.boxWidth-win.width)/2;help.y=top;win.y=top+help.height;
        help.show();win.show();win.open();win.activate();
        var index=win._list.map(function(c){return c.ext;}).indexOf(selectedMagic());win.select(Math.max(0,index));win.updateHelp();
    };
    Scene_Map.prototype.closeKudasaiMagic=function(){
        this._kabsMagicWindow.deactivate();this._kabsMagicWindow.hide();this._kabsMagicHelp.hide();this._kabsInputLock=2;$gameTemp.clearDestination();
    };
    function magicButton() {
        var width=172;
        return {x:Math.round((Graphics.width-width)/2),y:Graphics.height-99,width:width,height:27};
    }
    var mapTouch=Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch=function(){
        if(selectingMagic()||this._kabsInputLock)return;
        if(TouchInput.isTriggered()&&running()){
            var box=magicButton(),x=TouchInput.x,y=TouchInput.y;
            if(x>=box.x&&x<box.x+box.width&&y>=box.y&&y<box.y+box.height){
                this._touchCount=0;
                this.openKudasaiMagic();
                return;
            }
        }
        mapTouch.apply(this,arguments);
    };
    var menuCalled=Scene_Map.prototype.isMenuCalled;
    Scene_Map.prototype.isMenuCalled=function(){return selectingMagic()||this._kabsInputLock>0?false:menuCalled.apply(this,arguments);};

    function drawShadowSpell(ctx,spell,screen) {
        var origin=screen(spell),t=1-spell.life/spell.length;
        var hue=263+(spell.id*31)%52,turn=(spell.id*.618034%1)*Math.PI*2;
        var core='hsl('+hue+',46%,18%)';
        var edge='hsl('+hue+',87%,78%)';
        var ember='hsl('+hue+',65%,57%)';
        var direction=forward(spell.d),facing=Math.atan2(direction.y,direction.x);
        ctx.save();
        ctx.globalAlpha=Math.min(1,(1-t)*3.6);
        ctx.strokeStyle=edge;ctx.fillStyle=core;ctx.lineWidth=2;
        if(spell.spell==='wave'){
            var radius=(36+spell.id%9)+t*106;
            for(var i=0;i<3;i++){
                var r=radius-i*9;
                ctx.strokeStyle=i===0?edge:ember;
                ctx.lineWidth=i===0?3:1.4;
                ctx.beginPath();ctx.arc(origin.x,origin.y-7,r,facing-.85+i*.11,facing+.85-i*.11);ctx.stroke();
            }
        }
        spell.points.forEach(function(point){
            var target=screen(point);
            ctx.save();
            ctx.translate(target.x,target.y-8);
            ctx.strokeStyle=edge;ctx.lineWidth=1.6;ctx.fillStyle=core;
            if(spell.spell==='spike'){
                ctx.rotate(Math.atan2(target.y-origin.y,target.x-origin.x));
                var length=34+t*(20+spell.id%11),width=(10+spell.id%6)*(1-t*.52);
                ctx.beginPath();ctx.moveTo(length*.42,0);ctx.lineTo(-length*.56,-width);
                ctx.lineTo(-length*.36,0);ctx.lineTo(-length*.57,width);ctx.closePath();
                ctx.fill();ctx.stroke();
            }else if(spell.spell==='chains'){
                var dx=origin.x-target.x,dy=origin.y-target.y;
                var span=Math.max(1,Math.sqrt(dx*dx+dy*dy));
                var links=7+spell.id%6;
                for(var j=0;j<links;j++){
                    var p=(j+t*.7)/links,offset=Math.sin(p*13+t*8+turn)*7;
                    ctx.beginPath();
                    ctx.ellipse(dx*p-dy/span*offset,dy*p+dx/span*offset,6,3,Math.atan2(dy,dx),0,Math.PI*2);
                    ctx.stroke();
                }
            }else if(spell.spell==='orbit'){
                var orbit=20+(spell.id%9)+t*18;
                for(var k=0;k<3;k++){
                    var angle=turn+k*Math.PI*2/3+t*7;
                    ctx.beginPath();ctx.ellipse(0,0,orbit+k*4,orbit*.54+k*2,0,angle,angle+1.18);ctx.stroke();
                }
                ctx.beginPath();ctx.arc(0,0,Math.max(1,13*(1-t)),0,Math.PI*2);ctx.fill();
            }else{
                var ripple=8+t*34;
                ctx.beginPath();ctx.ellipse(0,0,ripple,ripple*.57,0,0,Math.PI*2);ctx.stroke();
            }
            ctx.fillStyle=ember;
            var particles=4+spell.id%5;
            for(var n=0;n<particles;n++){
                var a=turn+n*Math.PI*2/particles+t*2;
                var distance=7+t*(22+n%3*4);
                ctx.fillRect(Math.round(Math.cos(a)*distance),Math.round(Math.sin(a)*distance-t*8),2+n%2,2);
            }
            ctx.restore();
        });
        ctx.restore();
    }
    function drawDarkCut(ctx,point,cut) {
        var direction=forward(cut.d),angle=Math.atan2(direction.y,direction.x);
        var limit=cut.cut===2?19:14,t=1-cut.life/limit;
        var spread=cut.cut===2?1.35:1.04,side=cut.cut===1?-1:1;
        var radius=(cut.cut===2?67:52)*(0.86+t*0.23);
        ctx.save();ctx.translate(point.x,point.y-11);ctx.rotate(angle);ctx.scale(1,side);
        var start=-spread+t*0.52,end=spread-0.35+t*0.62;
        function crescent(size,inset,color){
            ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,size,start,end);
            ctx.quadraticCurveTo(size*inset,-size*.1,size*Math.cos(start),size*Math.sin(start));
            ctx.fill();
        }
        ctx.globalAlpha=Math.min(.94,cut.life/7);
        var inner=2-(Math.cos(start)+Math.cos(end))*.5;
        crescent(radius+3,inner-.40,'#241332');
        crescent(radius,inner-.30,'#63329a');
        crescent(radius-1,inner-.13,'#b869ec');
        ctx.strokeStyle='#ead1ff';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,radius-1,start+.18,end-.27);ctx.stroke();
        ctx.fillStyle='#d69bff';
        for(var i=0;i<7;i++){
            var a=start+(end-start)*i/7,r=radius+5+((i*7)%13)*t;
            ctx.fillRect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),i%2?2:3,i%2?2:3);
        }
        ctx.restore();
    }
    function enemyInk(family) {
        if(family===0)return '#ffd3a9';
        if(family===1)return '#cdeaa4';
        return '#ffe6b4';
    }
    function drawEnemyWarning(ctx,event,screen) {
        var e=event._kabs,point=screen({x:e.targetX,y:e.targetY});
        var phase=(e.windup-e.wind)*.34;
        var ink=enemyInk(enemyFamily(event));
        ctx.save();
        ctx.translate(point.x,point.y+9);
        ctx.strokeStyle=ink;
        ctx.lineWidth=1.5;
        ctx.globalAlpha=.68+.19*Math.sin(phase);
        // Three landing marks fixed on the target, with no progress fill.
        for(var i=-1;i<=1;i++){
            var rise=Math.sin(phase+i*.8)*2;
            ctx.beginPath();
            ctx.moveTo(i*11-3,6-rise);
            ctx.lineTo(i*11+2,-2-rise);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawEnemyStrike(ctx,effect,screen) {
        var target=screen({x:effect.targetX,y:effect.targetY});
        var origin=screen(effect),dir=forward(effect.d);
        var t=1-effect.life/effect.length,ink=enemyInk(effect.family);
        var angle=Math.atan2(dir.y,dir.x);
        ctx.save();
        ctx.translate(target.x,target.y-6);
        ctx.globalAlpha=1-t;
        ctx.strokeStyle=ink;
        ctx.fillStyle=ink;
        if(effect.family===1){
            for(var i=0;i<9;i++){
                var a=i*Math.PI*2/9,r=8+t*(20+i%3*5);
                var y=Math.sin(a)*r*.55-Math.sin(t*Math.PI)*(12+i%4*3);
                ctx.fillRect(Math.round(Math.cos(a)*r),Math.round(y),i%3+2,i%2+2);
            }
        }else{
            if(Math.abs(target.x-origin.x)+Math.abs(target.y-origin.y)>4){
                angle=Math.atan2(target.y-origin.y,target.x-origin.x);
            }
            ctx.rotate(angle);
            if(effect.family===0){
                ctx.lineWidth=1.8;
                for(var j=-1;j<=1;j++){
                    ctx.beginPath();
                    ctx.moveTo(-11+t*19,j*7+3);
                    ctx.quadraticCurveTo(2+t*18,j*9,12+t*18,j*10-4);
                    ctx.stroke();
                }
            }else{
                var r=(effect.boss?32:23)+t*13;
                ctx.lineWidth=3;
                ctx.beginPath();ctx.arc(-15,0,r,-1.1+t*.37,1.12+t*.28);ctx.stroke();
                ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(-15,0,r+5,-.83,1.06);ctx.stroke();
                for(var k=-2;k<=2;k++){
                    ctx.fillRect(Math.round(5+t*26-Math.abs(k)*3),Math.round(k*(7+t*5)),3,2);
                }
            }
        }
        ctx.restore();
    }
    function drawCracks(ctx,x,y,rx,ry,phase) {
        for(var i=0;i<6;i++){
            var angle=i*Math.PI/3+.23;
            var kink=angle+(i%2?.27:-.22);
            ctx.beginPath();
            ctx.moveTo(x+Math.cos(angle)*rx*.24,y+Math.sin(angle)*ry*.24);
            ctx.lineTo(x+Math.cos(kink)*rx*.58,y+Math.sin(kink)*ry*.58);
            ctx.lineTo(x+Math.cos(angle)*rx*.84,y+Math.sin(angle)*ry*.84);
            ctx.stroke();
        }
        for(var j=0;j<4;j++){
            var a=j*Math.PI/2+.22;
            ctx.beginPath();
            ctx.ellipse(x,y,rx,ry,0,a+Math.sin(phase)*.035,a+.84+Math.sin(phase)*.035);
            ctx.stroke();
        }
    }
    function drawBasaltSpikes(ctx,point,rx,progress) {
        ctx.save();
        ctx.fillStyle='#603b35';
        ctx.strokeStyle='#ffd09a';
        ctx.lineWidth=1.4;
        for(var i=-1;i<=1;i++){
            var x=point.x+i*rx*(.32+progress*.38);
            var y=point.y+6-Math.abs(i)*3;
            var height=(i===0?40:28)*(1-progress*.64);
            ctx.beginPath();
            ctx.moveTo(x-7,y);
            ctx.lineTo(x-3,y-height*.65);
            ctx.lineTo(x+i*4+2,y-height);
            ctx.lineTo(x+7,y-height*.4);
            ctx.lineTo(x+5,y+2);
            ctx.closePath();ctx.fill();ctx.stroke();
        }
        ctx.restore();
    }
    function drawBasaltGround(ctx,cast,screen,progress,impact) {
        var art=ImageManager.loadPicture(basaltGround);
        if(!art.isReady()||(!impact&&progress<.54))return false;
        var tileWidth=$gameMap.tileWidth(),tileHeight=$gameMap.tileHeight();
        var shape=basaltPatterns[cast.kind];
        var cell=112;
        var column=impact?Math.min(3,1+Math.floor(progress*3)):0;
        var row=cast.kind==='slam'?0:cast.kind==='fault'?1:2;
        ctx.save();
        ctx.imageSmoothingEnabled=false;
        ctx.globalAlpha=impact?Math.min(1,(1-progress)*3.8):.54;
        function draw(x,y,width,height,anchor){
            ctx.drawImage(art._canvas||art._image,column*cell,row*cell,cell,cell,
                x-width*.5,y-height*anchor,width,height);
        }
        if(cast.centers){
            var width=shape.radius*tileWidth*2.25;
            var height=shape.radius*tileHeight*(row===2?2.66:2.04);
            cast.centers.forEach(function(center){
                var point=screen(center);
                draw(point.x,point.y,width,height,row===2?.80:.69);
            });
        }else{
            var origin=screen(cast);
            var dx=cast.dx*tileWidth*shape.reach,dy=cast.dy*tileHeight*shape.reach;
            var length=Math.sqrt(dx*dx+dy*dy);
            var segments=Math.max(1,Math.ceil(length/62));
            ctx.translate(origin.x,origin.y);
            ctx.rotate(Math.atan2(dy,dx));
            for(var i=0;i<segments;i++){
                draw(length*(i+.5)/segments,0,length/segments+12,shape.width*tileHeight*2.3,.65);
            }
        }
        ctx.restore();
        return true;
    }
    function drawBasaltArea(ctx,cast,screen,progress,impact) {
        if(drawBasaltGround(ctx,cast,screen,progress,impact)&&impact)return;
        var shape=basaltPatterns[cast.kind];
        var tw=$gameMap.tileWidth(),th=$gameMap.tileHeight();
        var phase=progress*14;
        ctx.save();
        ctx.globalAlpha=impact?1-progress:.78+.16*Math.sin(phase);
        ctx.strokeStyle=cast.phase===2?'#ffc28f':'#ffdd9f';
        ctx.fillStyle='#ffcf96';
        ctx.lineWidth=impact?2.8:1.65;
        if(cast.centers){
            cast.centers.forEach(function(center){
                var point=screen(center),rx=shape.radius*tw,ry=shape.radius*th;
                if(!impact){
                    drawCracks(ctx,point.x,point.y,rx,ry,phase);
                    return;
                }
                var ring=.32+.68*progress;
                ctx.beginPath();
                ctx.ellipse(point.x,point.y,rx*ring,ry*ring,0,0,Math.PI*2);
                ctx.stroke();
                if(cast.kind==='fracture')drawBasaltSpikes(ctx,point,rx,progress);
                for(var i=0;i<8;i++){
                    var a=i*Math.PI/4,r=.24+.67*progress;
                    var x=point.x+Math.cos(a)*rx*r,y=point.y+Math.sin(a)*ry*r;
                    var lift=Math.sin(progress*Math.PI)*(16+i%3*5);
                    ctx.beginPath();
                    ctx.moveTo(x-4,y-lift+4);
                    ctx.lineTo(x+2,y-lift-6-i%3);
                    ctx.lineTo(x+5,y-lift+1);
                    ctx.closePath();ctx.fill();
                }
            });
        }else{
            var origin=screen(cast),dx=cast.dx,dy=cast.dy;
            function trace(side,zigzag){
                ctx.beginPath();
                for(var i=0;i<=14;i++){
                    var variation=zigzag&&i%2?.18:0;
                    var cross=side+variation;
                    var x=origin.x+(dx*shape.reach*i/14-dy*cross)*tw;
                    var y=origin.y+(dy*shape.reach*i/14+dx*cross)*th;
                    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
                }
                ctx.stroke();
            }
            if(!impact){
                ctx.setLineDash([9,6]);
                trace(-shape.width,false);trace(shape.width,false);
                ctx.setLineDash([]);
            }
            trace(0,true);
            if(impact){
                for(var k=1;k<=11;k++){
                    var along=shape.reach*k/11,cross=(k%2?.32:-.32)*progress;
                    var x=origin.x+(dx*along-dy*cross)*tw;
                    var y=origin.y+(dy*along+dx*cross)*th;
                    var rise=Math.sin(progress*Math.PI)*(16+k%4*7);
                    ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x-1,y-rise);
                    ctx.lineTo(x+4,y-rise*.75);ctx.lineTo(x+6,y);ctx.closePath();ctx.fill();
                }
            }
        }
        ctx.restore();
    }
    function drawBurst(ctx,point,effect) {
        var t=1-effect.life/effect.length;
        ctx.save();ctx.globalAlpha=1-t;
        if(effect.kind==='phase'){
            ctx.strokeStyle='#ffb081';ctx.lineWidth=3;
            ctx.beginPath();ctx.ellipse(point.x,point.y,18+t*100,9+t*67,0,0,Math.PI*2);ctx.stroke();
        }else{
            ctx.fillStyle='#f4d4ff';
            for(var i=0;i<9;i++){
                var a=i*Math.PI*2/9,r=(5+t*30)*(1+(i%3)*0.24);
                ctx.fillRect(point.x+Math.cos(a)*r,point.y-14+Math.sin(a)*r,i%2?3:5,2+i%3);
            }
        }
        ctx.restore();
    }
    function HUD(){this.initialize.apply(this,arguments);}
    HUD.prototype=Object.create(Sprite.prototype);HUD.prototype.constructor=HUD;
    HUD.prototype.initialize=function(){Sprite.prototype.initialize.call(this);this._drawTick=0;this.bitmap=new Bitmap(Graphics.width,Graphics.height);};
    HUD.prototype.update=function(){
        Sprite.prototype.update.call(this);this.visible=enabled()&&!caveEnding()&&!$gameMessage.isBusy()&&!$gameMap.isEventRunning();
        if(this._prepareOnArrival&&this._prepareOnArrival.isReady()){
            this._prepareOnArrival=null;
            this.draw();
            var renderer=Graphics._renderer;
            if(Graphics.isWebGL()&&renderer.plugins.prepare){
                this.bitmap.checkDirty();
                renderer.plugins.prepare.upload(this.texture);
            }
        }
        if(!this.visible||!actor())return;
        if(this.bitmap.width!==Graphics.width||this.bitmap.height!==Graphics.height){var old=this.bitmap;this.bitmap=new Bitmap(Graphics.width,Graphics.height);if(old.destroy)old.destroy();}
        if(++this._drawTick%3!==0)return;
        this.draw();
    };
    HUD.prototype.draw=function(){
        var b=this.bitmap,w=b.width,h=b.height,a=actor(),s=state();b.clear();
        function text(t,x,y,width,size,color,align){b.fontFace='GameFont';b.fontSize=size||18;b.textColor=color||'#f4ecd9';b.outlineColor='rgba(7,9,18,0.95)';b.outlineWidth=3;b.drawText(t,x,y,width,26,align||'left');}
        function bar(x,y,width,rate,c1,c2){b.fillRect(x-1,y-1,width+2,12,'#857454');b.fillRect(x,y,width,10,'#111920');var fill=Math.max(0,Math.floor(width*Math.max(0,Math.min(1,rate))));if(fill)b.gradientFillRect(x,y,fill,10,c1,c2);}
        function screen(p){return {x:($gameMap.adjustX(p.x)+0.5)*$gameMap.tileWidth(),y:($gameMap.adjustY(p.y)+0.5)*$gameMap.tileHeight()};}
        var visibleEnemies=enemies(),ctx=b._context;
        visibleEnemies.forEach(function(e){
            var cast=e._kabs.cast;
            if(cast)drawBasaltArea(ctx,cast,screen,1-cast.left/cast.length,false);
            else if(e._kabs.wind>0)drawEnemyWarning(ctx,e,screen);
        });
        eruptions.forEach(function(effect){
            if(effect.cast)drawBasaltArea(ctx,effect.cast,screen,1-effect.life/effect.length,true);
            else if(effect.kind==='enemyStrike')drawEnemyStrike(ctx,effect,screen);
            else drawBurst(ctx,screen(effect),effect);
        });
        slashes.forEach(function(p){
            var xy=screen(p);
            if(p.spell){drawShadowSpell(ctx,p,screen);return;}
            if(p.dark){drawDarkCut(ctx,xy,p);return;}
            var f=forward(p.d),angle=Math.atan2(f.y,f.x);
            ctx.save();ctx.globalAlpha=p.life/14;ctx.strokeStyle=p.magic?'#a0caff':'#ffe6a0';ctx.lineWidth=5;
            ctx.beginPath();ctx.arc(xy.x,xy.y,40,angle-1.0,angle+1.0);ctx.stroke();ctx.restore();
        });
        b._setDirty();
        b.fillRect(10,10,294,113,'rgba(10,13,24,0.85)');
        b.drawCircle(57,63,42,'#c6b584');b.drawCircle(57,63,39,'#222338');
        var face=ImageManager.loadFace(a.faceName());
        if(face.isReady()) {
            var ctx=b._context,idx=a.faceIndex();ctx.save();ctx.beginPath();ctx.arc(57,63,37,0,Math.PI*2);ctx.clip();
            ctx.drawImage(face._canvas||face._image,(idx%4)*144,Math.floor(idx/4)*144,144,144,20,26,74,74);ctx.restore();b._setDirty();
        }
        text(a.name(),109,14,187,20);text('Nv. '+a.level,20,96,82,15);
        bar(111,48,180,a.hp/a.mhp,'#ad7536','#ead18a');
        bar(111,73,180,a.mp/Math.max(1,a.mmp),'#4079b8','#83ddfa');
        bar(111,98,180,s.stamina/100,'#46a478','#b5ec94');
        text(a.hp+'/'+a.mhp,114,38,173,13,'#ffffff','right');text(a.mp+'/'+a.mmp,114,63,173,13,'#ffffff','right');text('Energía '+Math.floor(s.stamina),114,88,173,13,'#ffffff','right');
        var bosses=visibleEnemies.filter(function(e){return e._kabs.boss&&distance(e,$gamePlayer)<=e._kabs.aggro+3;});
        var boss=bosses.filter(function(e){return e._kabs.basalt;})[0]||bosses[0];
        if(boss){var bw=Math.min(420,Math.max(160,w-340)),bx=w-bw-18;var bb=boss._kabs.battler;b.fillRect(bx-10,10,bw+20,64,'rgba(10,17,22,0.72)');text(bb.name(),bx,12,bw,21,'#eee0c2','center');bar(bx,46,bw,bb.hp/bb.mhp,'#783c29','#c68b51');text(bb.hp+'/'+bb.mhp,bx,53,bw,12,'#d5c5ab','center');}
        if(boss&&boss._kabs.basalt){
            var eb=boss._kabs,mode=eb.cast?basaltPatterns[eb.cast.kind].title:eb.recover>0?'Apertura':'';
            text(eb.phase===2?'FASE II':'FASE I',bx+5,51,58,11,'#f0bd8b');
            if(mode)text(mode,bx+bw-125,51,120,11,eb.cast?'#ffcf9a':'#e3bcfa','right');
        }
        popups.forEach(function(p){var xy=screen(p);b.paintOpacity=Math.min(255,p.life*12);text(p.text,xy.x-110,xy.y-65-(60-p.life)*0.55,220,19,p.color,'center');});b.paintOpacity=255;
        var chosen=selectedMagic(),chosenSkill=$dataSkills[chosen];
        var katana=usesKatana(),swing=$gamePlayer._kabsSwing;
        var boxes=[['J',katana?'Katana':'Ataque',s.attack,26,a.attackSkillId()],['K',chosenSkill?chosenSkill.name:'Magia',s.magic,75,chosen],['L','Esquiva',s.dodge,24,0],['H','Curar',s.heal,180,healId]],total=408,start=(w-total)/2;
        boxes.forEach(function(item,i){
            var x=start+i*104,y=h-66,status='',color='#b6c6bd',skill=$dataSkills[item[4]];
            if(i===0&&katana&&swing)status='Corte '+(swing.cut+1)+'/3';
            else if(item[2]>0)status=(item[2]/60).toFixed(1)+' s';
            else if(i===2&&s.stamina<30){status='Sin energía';color='#a79b86';}
            else if(i!==0&&i!==2&&!a.hasSkill(item[4])){status='Sin aprender';color='#8a9397';}
            else if(i!==2&&!canUse(a,skill)){status='No disponible';color='#a79b86';}
            else status=i===2?'30 energía':skill&&(a.skillMpCost(skill)||a.skillTpCost(skill))?[a.skillMpCost(skill)?a.skillMpCost(skill)+' PM':'',a.skillTpCost(skill)?a.skillTpCost(skill)+' PT':''].filter(Boolean).join(' '):'Disponible';
            b.fillRect(x,y,96,50,'rgba(10,17,22,0.86)');b.fillRect(x,y,96,1,'#857454');
            text(item[0],x+9,y+1,22,21,'#ddc389');text(item[1],x+33,y+1,61,14);
            text(status,x+4,y+22,88,11,color,'center');
            if(item[2]>0&&!(katana&&i===0))b.fillRect(x+4,y+46,88*(1-item[2]/item[3]),2,'#d4bb7c');
        });
        var magic=magicButton();
        b.fillRect(magic.x,magic.y,magic.width,magic.height,'rgba(18,13,34,0.88)');
        b.fillRect(magic.x,magic.y,magic.width,1,'#9071bb');
        text('M · Elegir magia',magic.x,magic.y,magic.width,14,'#eadcfc','center');
        if($gameMap.mapId()===demoMap)text('ARENA ABS · Entrenamiento',12,h-34,270,15,'#d4c49e');
    };
    var display=Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects=function(){
        display.apply(this,arguments);
        // Re-read tags after loading a save: keep HP, but update boss status.
        if(tagged())$gameMap.events().forEach(setupEnemy);
        if(enabled()&&usesKatana())ImageManager.loadCharacter(katanaSheet);
        if(enabled()){
            ImageManager.loadCharacter(enemyAttackSheet);
            if($gameMap.events().some(function(event){return event._kabs&&event._kabs.basalt;})){
                ImageManager.loadPicture(basaltGround);
                ImageManager.loadCharacter(mikuAttacks);
            }
        }
        this._kabsHud=new HUD();this.addChildAt(this._kabsHud,this.children.indexOf(this._windowLayer));
        if(enabled()&&actor()&&$gameMap.mapId()===caveMap&&$gameSwitches.value(22)){
            this._kabsHud._prepareOnArrival=ImageManager.loadFace(actor().faceName());
        }
        if(enabled()){this._mapNameWindow.x=Math.max(0,(Graphics.boxWidth-this._mapNameWindow.width)/2);this._mapNameWindow.y=126;}
    };
    var update=Scene_Map.prototype.updateMain;
    Scene_Map.prototype.updateMain=function(){
        if(selectingMagic())return;
        if(this._kabsInputLock>0){this._kabsInputLock--;return;}
        update.apply(this,arguments);updateCombat();
        if(Utils.isOptionValid('test')&&Input.isTriggered('kabsDemo')&&!$gameMap.isEventRunning()&&!$gameMessage.isBusy()&&!$gamePlayer.isTransferring())enterDemo();
        if(Utils.isOptionValid('test')&&Input.isTriggered('kabsCave')&&!$gameMap.isEventRunning()&&!$gameMessage.isBusy()&&!$gamePlayer.isTransferring())enterCave();
    };
    var titleUpdate=Scene_Title.prototype.update;
    Scene_Title.prototype.update=function(){
        titleUpdate.apply(this,arguments);
        if(Utils.isOptionValid('test')&&Input.isTriggered('kabsDemo')&&!SceneManager.isSceneChanging()) {
            DataManager.setupNewGame();$gamePlayer.setTransparent(false);$gamePlayer.reserveTransfer(demoMap,17,21,8,0);SceneManager.goto(Scene_Map);
        }
        if(Utils.isOptionValid('test')&&Input.isTriggered('kabsCave')&&!SceneManager.isSceneChanging()&&$dataMapInfos[caveMap]) {
            DataManager.setupNewGame();
            if($dataMapInfos[demoMap])returnStack().push({map:demoMap,x:17,y:21,d:8,transparent:false});
            $gamePlayer.setTransparent(false);$gamePlayer.reserveTransfer(caveMap,22,31,8,0);SceneManager.goto(Scene_Map);
        }
    };
    window.KudasaiABS={version:'1.2.0',isEnabled:enabled,isRunning:running,enterDemo:enterDemo,returnDemo:returnDemo,enterCave:enterCave,returnCave:returnCave,enter:enterDungeon,rememberOrigin:rememberOrigin,returnToOrigin:returnToOrigin,hasReturn:hasReturnPoint,offensiveSkills:offensiveSkills,selectedMagic:selectedMagic,selectMagic:selectMagic,reset:resetEnemies};
})();
