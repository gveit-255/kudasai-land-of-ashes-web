/*:
 * @plugindesc Marcha suave del elenco humano, sin cambiar la velocidad de desplazamiento.
 * @author Kudasai
 * @help
 * Amplia un 10% el umbral de cambio de pose al caminar para los 25 personajes
 * humanos y sus atlas. Akemi usa el mismo ciclo de poses y reposo que Libu.
 * Conserva velocidad, carrera y rutas de MV.
 * Los monstruos y objetos conservan su cadencia original.
 */
(function () {
    'use strict';
    var names = ["$Kudasai_Protagonista","$Kudasai_Libu","$Kudasai_Loussiana","$Kudasai_Aprendiz","$Kudasai_Mercader","$Kudasai_Abuelo","$Kudasai_Guardia","$Kudasai_Costurera","$Kudasai_Mensajera","$Kudasai_Viajero","$Kudasai_Archivero","$Kudasai_Carpintero","$Kudasai_Panadero","$Kudasai_Posadero","$Kudasai_Herbolaria","$Kudasai_Ceramista","$Kudasai_Tejedora","$Kudasai_Musico","$Kudasai_Jardinero","$Kudasai_Escriba","$Kudasai_Gremios","$Kudasai_Ciudadana","$Kudasai_Seguidor","$Kudasai_Seguidora","$Kudasai_Akemi","Kudasai_Actor1","Actor1","Kudasai_People1","People1"];
    var animationWait = Game_CharacterBase.prototype.animationWait;
    Game_CharacterBase.prototype.animationWait = function () {
        var wait = animationWait.call(this);
        return names.indexOf(this.characterName()) >= 0 && this.isMoving() && this.hasWalkAnime() ? wait * 1.1 : wait;
    };

})();
