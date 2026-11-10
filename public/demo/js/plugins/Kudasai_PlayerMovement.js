/*:
 * @plugindesc v20261110.2 Correr siempre, desplazamiento +10% y diagonales con teclado o ratón.
 * @author Kudasai
 * @help
 * Después de Kudasai_ABS y Kudasai_PlayerGait. Flechas combinadas: diagonales.
 * Caminar, correr, dash, retroceso y saltos del jugador un 10% más rápidos.
 * Correr siempre activado al iniciar y cargar preferencias; sin ajuste en menú.
 * Los destinos de ratón usan rutas de ocho direcciones con coste diagonal real.
 * Conserva colisiones, bloqueos de eventos, rutas y movimiento por clic.
 * Diagonales sin velocidad extra; enemigos y vecinos no se aceleran.
 */
(function(){
    'use strict';
    var factor=1.1;
    ConfigManager.alwaysDash=true;
    var applyConfig=ConfigManager.applyData;
    ConfigManager.applyData=function(config){applyConfig.apply(this,arguments);this.alwaysDash=true;};
    var makeConfig=ConfigManager.makeData;
    ConfigManager.makeData=function(){this.alwaysDash=true;var config=makeConfig.apply(this,arguments);config.alwaysDash=true;return config;};
    var generalOptions=Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions=function(){
        generalOptions.apply(this,arguments);
        this._list=this._list.filter(function(command){return command.symbol!=='alwaysDash';});
    };
    function accelerate(prototype){
        var distance=prototype.distancePerFrame,move=prototype.updateMove;
        prototype.distancePerFrame=function(){
            var diagonal=this._kudasaiDiagonalStep;
            if(diagonal===undefined)diagonal=this._realX!==this._x&&this._realY!==this._y;
            return distance.apply(this,arguments)*factor*(diagonal?Math.SQRT1_2:1);
        };
        prototype.updateMove=function(){
            var previous=this._kudasaiDiagonalStep;
            this._kudasaiDiagonalStep=this._realX!==this._x&&this._realY!==this._y;
            try{return move.apply(this,arguments);}finally{
                if(previous===undefined)delete this._kudasaiDiagonalStep;else this._kudasaiDiagonalStep=previous;
            }
        };
        prototype.updateJump=function(){
            var count=this._jumpCount,remaining=Math.max(0,count-factor),step=count-remaining;
            this._jumpCount=remaining;
            if(count>0){
                this._realX=(this._realX*remaining+this._x*step)/count;
                this._realY=(this._realY*remaining+this._y*step)/count;
            }
            this.refreshBushDepth();
            if(remaining===0){this._realX=this._x=$gameMap.roundX(this._x);this._realY=this._y=$gameMap.roundY(this._y);}
        };
    }
    accelerate(Game_Player.prototype);
    accelerate(Game_Follower.prototype);
    var inputDirection=Game_Player.prototype.getInputDirection;
    Game_Player.prototype.getInputDirection=function(){
        var direction=inputDirection.apply(this,arguments);
        return direction?(Input.dir8||direction):direction;
    };
    var executeMove=Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove=function(direction){
        if([1,3,7,9].indexOf(direction)<0)return executeMove.apply(this,arguments);
        var h=direction===1||direction===7?4:6,v=direction===1||direction===3?2:8;
        this.moveDiagonally(h,v);
        if(!this.isMovementSucceeded()){
            // Slide along an accessible edge; native collision checks still
            // reject closed corners and solid events in both directions.
            var first=Input.dir4===h?h:v,second=first===h?v:h;
            this.moveStraight(first);
            if(!this.isMovementSucceeded())this.moveStraight(second);
        }
    };
    // Only input-driven destination searches use eight directions. Scripted
    // scenes and NPC AI still receive MV's native four-direction route result.
    var moveByInput=Game_Player.prototype.moveByInput;
    Game_Player.prototype.moveByInput=function(){
        var previous=this._kudasaiClickPath;
        this._kudasaiClickPath=true;
        try{return moveByInput.apply(this,arguments);}finally{
            if(previous===undefined)delete this._kudasaiClickPath;else this._kudasaiClickPath=previous;
        }
    };
    var findDirection=Game_Player.prototype.findDirectionTo;
    function octile(x,y,gx,gy){
        var dx=Math.abs($gameMap.deltaX(gx,x)),dy=Math.abs($gameMap.deltaY(gy,y));
        return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);
    }
    Game_Player.prototype.findDirectionTo=function(goalX,goalY){
        if(!this._kudasaiClickPath||!$gameTemp.isDestinationValid()||
            goalX!==$gameTemp.destinationX()||goalY!==$gameTemp.destinationY()||!$gameMap.isValid(goalX,goalY))return findDirection.apply(this,arguments);
        if(this.x===goalX&&this.y===goalY)return 0;
        var width=$gameMap.width(),limit=this.searchLimit(),start={x:this.x,y:this.y,g:0,parent:null};
        start.h=octile(start.x,start.y,goalX,goalY);start.f=start.h;
        var open=[start],nodes={},closed={},best=start;
        nodes[start.y*width+start.x]=start;
        while(open.length){
            var index=0;
            for(var i=1;i<open.length;i++)if(open[i].f<open[index].f||open[i].f===open[index].f&&open[i].h<open[index].h)index=i;
            var current=open.splice(index,1)[0],key=current.y*width+current.x;
            closed[key]=true;
            if(current.h<best.h||current.h===best.h&&current.g<best.g)best=current;
            if(current.x===goalX&&current.y===goalY){best=current;break;}
            if(current.g>=limit)continue;
            for(var direction=1;direction<=9;direction++){
                if(direction===5)continue;
                var diagonal=direction%2===1,h=direction===1||direction===7?4:6,v=direction===1||direction===3?2:8;
                var x=diagonal?$gameMap.roundXWithDirection(current.x,h):$gameMap.roundXWithDirection(current.x,direction);
                var y=diagonal?$gameMap.roundYWithDirection(current.y,v):$gameMap.roundYWithDirection(current.y,direction);
                var nextKey=y*width+x;
                if(closed[nextKey]||!$gameMap.isValid(x,y))continue;
                if(diagonal?!this.canPassDiagonally(current.x,current.y,h,v):!this.canPass(current.x,current.y,direction))continue;
                var cost=current.g+(diagonal?Math.SQRT2:1),next=nodes[nextKey];
                if(next&&cost>=next.g)continue;
                if(!next){next={x:x,y:y};nodes[nextKey]=next;open.push(next);}
                next.g=cost;next.h=octile(x,y,goalX,goalY);next.f=cost+next.h;next.parent=current;next.direction=direction;
            }
        }
        if(best===start)return findDirection.apply(this,arguments);
        while(best.parent&&best.parent!==start)best=best.parent;
        return best.direction;
    };
    window.KudasaiPlayerMovement={version:'20261110.2',speedMultiplier:factor};
})();
