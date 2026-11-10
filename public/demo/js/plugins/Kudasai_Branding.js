/*:
 * @plugindesc Título de los menús desde Sistema y compatibilidad con partidas de nombres anteriores.
 * @author Kudasai
 * @help
 * Colocar antes de los plugins de presentación de Moonglade.
 * El título visible se configura en Sistema > Título del juego.
 */
(function () {
    'use strict';

    window.KudasaiBranding = {
        wordmark: function () {
            var parts = $dataSystem.gameTitle.toUpperCase().split(/:\s*/);
            return { name: parts.shift(), subtitle: parts.join(': ') };
        }
    };

    var previousTitles = ['Kudasai: La gran guerra', 'Kudasai La Guerra De Los 3 Imperios'];
    var loadGlobalInfo = DataManager.loadGlobalInfo;
    DataManager.loadGlobalInfo = function () {
        var info = loadGlobalInfo.apply(this, arguments);
        if ($dataSystem && Array.isArray(info)) {
            info.forEach(function (save) {
                if (save && save.globalId === this._globalId && previousTitles.indexOf(save.title) >= 0) {
                    save.title = $dataSystem.gameTitle;
                }
            }, this);
        }
        return info;
    };
}());
