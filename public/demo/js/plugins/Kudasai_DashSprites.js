/*:
 * @plugindesc v20261110.1 Dash de Loussiana: cuatro poses, cabello al viento y estela breve.
 * @author Kudasai
 * @requiredAssets img/characters/Kudasai_Loussiana_Dash_20261110
 * @help
 * Después de Kudasai_ABS y Kudasai_PlayerMovement.
 * Hoja 384x216, cuatro columnas y tres filas (abajo/derecha/arriba).
 * Izquierda reflejada y diagonales orientadas hacia su componente lateral.
 * Solo cambia la imagen durante el dash de Loussiana. Resto del elenco intacto.
 * Estela y copias se liberan al salir; hoja compartida compatible con cifrado MV.
 */
(function(){
    'use strict';
    var sheet='Kudasai_Loussiana_Dash_20261110',width=96,height=72;
    function eligible(){return window.KudasaiABS&&KudasaiABS.isEnabled()&&$gamePlayer.characterName()==='$Kudasai_Loussiana';}
    function direction(d){
        return {row:d===2?0:d===8?2:1,flip:d===4||d===1||d===7?-1:1,
            x:d===4||d===1||d===7?-1:d===6||d===3||d===9?1:0,
            y:d===8||d===7||d===9?-1:d===2||d===1||d===3?1:0};
    }
    function ensure(sprite,bitmap){
        if(sprite._kabsDashFx)return sprite._kabsDashFx;
        var root=new Sprite(),ghosts=[];
        for(var i=0;i<3;i++){
            var ghost=new Sprite(bitmap);ghost.anchor.set(.5,1);ghost.tint=0xe7a5c8;ghost.visible=false;root.addChild(ghost);ghosts.push(ghost);
        }
        var wind=new PIXI.Graphics();root.addChild(wind);
        var body=new Sprite(bitmap);body.anchor.set(.5,1);root.addChild(body);sprite.addChild(root);
        return sprite._kabsDashFx={root:root,body:body,ghosts:ghosts,wind:wind,history:[],pose:null,tick:0,lastAge:-1,lastFrame:-1};
    }
    function hideBody(sprite){
        sprite.setFrame(0,0,0,0);
        if(sprite._upperBody)sprite._upperBody.visible=false;
        if(sprite._lowerBody)sprite._lowerBody.visible=false;
        if(sprite._kabsKatana)sprite._kabsKatana.visible=false;
    }
    function draw(sprite){
        var fx=sprite._kabsDashFx,p=$gamePlayer,pose=p._kabsDash;
        if(!eligible()){
            if(fx){fx.root.visible=false;fx.history=[];fx.pose=null;}
            return;
        }
        if(!pose&&!fx)return;
        var bitmap=ImageManager.loadCharacter(sheet);bitmap.smooth=false;
        if(!bitmap.isReady())return;
        fx=ensure(sprite,bitmap);fx.root.visible=true;
        var frameCount=Graphics.frameCount;
        if(pose){
            if(fx.pose!==pose){fx.history=[];fx.lastAge=-1;fx.pose=pose;}
            fx.tick=pose.age;
        }else if(fx.lastFrame!==frameCount&&KudasaiABS.isRunning())fx.tick++;
        fx.lastFrame=frameCount;
        var view=direction(pose?pose.direction:fx.direction||p.direction());
        var frame=pose?(!pose.moving?3:pose.age<2?0:pose.stepsTaken>=2||pose.age>=6?2:1):3;
        fx.body.visible=!!pose;
        if(pose){
            fx.direction=pose.direction;
            fx.body.setFrame(frame*width,view.row*height,width,height);fx.body.scale.x=view.flip;
            hideBody(sprite);
            if(pose.moving&&p.isMoving()&&pose.age!==fx.lastAge&&pose.age%2===0){
                fx.history.unshift({x:p._realX,y:p._realY,age:pose.age,frame:frame,row:view.row,flip:view.flip});
                fx.history=fx.history.slice(0,3);
            }
            fx.lastAge=pose.age;
        }
        fx.ghosts.forEach(function(ghost,i){
            var record=fx.history[i],age=record?fx.tick-record.age:99;
            ghost.visible=!!record&&age<8&&age>0;
            if(!ghost.visible)return;
            ghost.setFrame(record.frame*width,record.row*height,width,height);ghost.scale.x=record.flip;
            ghost.x=Math.round($gameMap.deltaX(record.x,p._realX)*48);ghost.y=Math.round($gameMap.deltaY(record.y,p._realY)*48);
            ghost.opacity=Math.round(102*(1-age/8));
        });
        var wind=fx.wind;wind.clear();
        if(pose&&pose.moving&&pose.age>=2){
            var length=view.x&&view.y?Math.SQRT1_2:1,dx=view.x*length,dy=view.y*length;
            for(var i=0;i<3;i++){
                var offset=(i-1)*7,tail=39+i*4;
                wind.lineStyle(i===1?2:1,0xf3dce9,i===1?.62:.36);
                wind.moveTo(Math.round(-dx*tail-dy*offset),Math.round(-24-dy*tail+dx*offset));
                wind.lineTo(Math.round(-dx*6-dy*offset),Math.round(-24-dy*6+dx*offset));
            }
        }
        if(!pose&&!fx.ghosts.some(function(ghost){return ghost.visible;}))fx.root.visible=false;
    }
    function dispose(sprite){
        var fx=sprite&&sprite._kabsDashFx;if(!fx)return;
        if(fx.root.parent)fx.root.parent.removeChild(fx.root);
        fx.body.bitmap=null;fx.ghosts.forEach(function(ghost){ghost.bitmap=null;});
        fx.root.destroy({children:true,texture:false,baseTexture:false});sprite._kabsDashFx=null;
    }
    var updateFrame=Sprite_Character.prototype.updateFrame;
    Sprite_Character.prototype.updateFrame=function(){updateFrame.apply(this,arguments);if(this._character===$gamePlayer)draw(this);};
    var create=Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects=function(){create.apply(this,arguments);if(eligible())ImageManager.loadCharacter(sheet).smooth=false;};
    var terminate=Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate=function(){var set=this._spriteset;terminate.apply(this,arguments);if(set)(set._characterSprites||[]).forEach(dispose);};
    var destroy=Sprite_Character.prototype.destroy;
    Sprite_Character.prototype.destroy=function(){dispose(this);return destroy.apply(this,arguments);};
    window.KudasaiDashSprites={version:'20261110.1',sheet:sheet,frameWidth:width,frameHeight:height};
})();
