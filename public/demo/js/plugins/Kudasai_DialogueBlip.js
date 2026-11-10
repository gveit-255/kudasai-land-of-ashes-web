/*:
 * @plugindesc Reproduce el blip grave al revelarse el texto de los diálogos.
 * @author Kudasai
 * @requiredAssets audio/se/Kudasai_Dialogo_Blip_Grave
 * @help
 * Usa el volumen de efectos del juego. Los pulsos siguen el texto visible
 * y se separan al menos 100 ms. Las pausas y el texto instantáneo son silenciosos.
 */
(function () {
    'use strict';

    var blip = { name: 'Kudasai_Dialogo_Blip_Grave', volume: 100, pitch: 100, pan: 0 };
    var msBetweenBlips = 100;

    var preload = SoundManager.preloadImportantSounds;
    SoundManager.preloadImportantSounds = function () {
        preload.apply(this, arguments);
        AudioManager.loadStaticSe(blip);
    };

    var drawCharacter = Window_Message.prototype.processNormalCharacter;
    Window_Message.prototype.processNormalCharacter = function (textState) {
        var character = textState.text.charAt(textState.index);
        drawCharacter.apply(this, arguments);
        if (this._showFast || this._lineShowFast || !/\S/.test(character)) return;

        var now = performance.now();
        if (now < (this._kudasaiNextBlipTime || 0)) return;
        this._kudasaiNextBlipTime = now + msBetweenBlips;
        AudioManager.playStaticSe(blip);
    };
}());
