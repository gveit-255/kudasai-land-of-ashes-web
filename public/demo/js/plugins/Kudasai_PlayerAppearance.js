/*:
 * @plugindesc Loussiana controlable en partidas nuevas y guardadas.
 * @author Kudasai
 * @help
 * El actor 1 usa $Kudasai_Loussiana. Al cargar, migra las apariencias anteriores
 * de Akemi/Libu/Protagonista, incluido el atlas original. Actualiza nombre y retrato
 * predeterminados; conserva nombres y apariencias personalizados por eventos.
 * No modifica los sprites de Libu ni el resto de datos de la partida.
 */
(function () {
    'use strict';
    function updatePlayerAppearance() {
        var actor = $gameActors.actor(1);
        if (!actor) return;
        var appearance = $dataActors[1];
        var name = actor.characterName();
        var oldAtlas = name === 'Kudasai_Actor1' && actor.characterIndex() === 4;
        var oldSingle = ['$Kudasai_Protagonista', '$Kudasai_Libu', '$Kudasai_Akemi'].indexOf(name) >= 0 && actor.characterIndex() === 0;
        var current = name === appearance.characterName && actor.characterIndex() === appearance.characterIndex;
        if (!(oldAtlas || oldSingle || current)) return;
        actor.setCharacterImage(appearance.characterName, appearance.characterIndex);
        var face = actor.faceName();
        var oldFace = (face === 'Kudasai_Actor1_Faces' && actor.faceIndex() === 4) ||
            ['Kudasai_Retrato_Protagonista', 'Kudasai_Expresiones_Protagonista',
                'Kudasai_Retrato_Libu', 'Kudasai_Expresiones_Libu', 'Kudasai_Expresiones_Libu_2',
                'Kudasai_Retrato_Akemi', 'Kudasai_Expresiones_Akemi', 'Kudasai_Expresiones_Akemi_2'].indexOf(face) >= 0;
        if (oldFace) actor.setFaceImage(appearance.faceName, appearance.faceIndex);
        if (['Harold', 'Libu', 'Akemi', 'Loussiana'].indexOf(actor.name()) >= 0) actor.setName(appearance.name);
        if ($gamePlayer) $gamePlayer.refresh();
    }
    var extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        extract.apply(this, arguments);
        updatePlayerAppearance();
    };
})();
