/*:
 * @plugindesc v1.1 Diálogos con perfiles editables de nombre, imagen, lado y color. RPG Maker MV.
 * @author Kudasai
 * @requiredAssets img/pictures/Kudasai_Dialogo_Libu
 * @param Profiles
 * @text Perfiles de diálogo
 * @type struct<KudasaiDialogueProfile>[]
 * @desc Perfiles reutilizables en Mostrar texto con \HABLA[clave].
 * @default ["{\"Id\":\"libu\",\"Name\":\"Libu\",\"Image\":\"Kudasai_Dialogo_Libu\",\"Side\":\"izquierda\",\"Color\":\"#C99058\",\"Frame\":\"true\"}","{\"Id\":\"loussiana\",\"Name\":\"Loussiana\",\"Image\":\"\",\"Side\":\"derecha\",\"Color\":\"#A25A93\",\"Frame\":\"true\"}"]
 * @help
 * Crea un perfil en el Gestor de plugins y escribe \HABLA[clave] al inicio
 * de «Mostrar texto». Si dejas la imagen del perfil vacía, se usa el rostro
 * y la expresión que selecciones en ese comando.
 * Usa \HABLA[clave|rostro] para elegir esa expresión en una intervención
 * aunque el perfil tenga una imagen asignada.
 * También puedes configurar una intervención directamente en el texto:
 *   \HABLA[izquierda|Libu||#C99058]
 *   \HABLA[derecha|Capitana|Busto_Capitana|#397C91]
 * La imagen opcional se busca en img/pictures, sin extensión. El color
 * acepta RGB hexadecimal de 3 o 6 dígitos. La etiqueta puede ir en su
 * propia línea o antes de la réplica. Los mensajes sin etiqueta conservan
 * su presentación habitual. Cargar después de Kudasai_Cinematics.
 * Los retratos comparten el mismo espacio y se escalan en proporción.
 */
/*~struct~KudasaiDialogueProfile:
 * @param Id
 * @text Clave
 * @desc Identificador único que se escribe en \HABLA[clave].
 * @type string
 * @default personaje
 * @param Name
 * @text Nombre visible
 * @type string
 * @default Personaje
 * @param Image
 * @text Imagen de diálogo
 * @desc Si está vacía, usa el rostro seleccionado en Mostrar texto.
 * @type file
 * @dir img/pictures/
 * @require 1
 * @default
 * @param Side
 * @text Lado del personaje
 * @type select
 * @option Izquierda
 * @value izquierda
 * @option Derecha
 * @value derecha
 * @default izquierda
 * @param Color
 * @text Color de la caja
 * @desc Color hexadecimal. Ejemplos #C99058, #A25A93 y #397C91.
 * @type string
 * @default #C99058
 * @param Frame
 * @text Enmarcar la imagen
 * @desc Con marco cuadrado o sin marco para bustos. Ambos usan el mismo espacio.
 * @type boolean
 * @on Con marco
 * @off Sin marco
 * @default true
 */
(function () {
    'use strict';

    function parseJson(value, fallback) {
        try { return JSON.parse(value); }
        catch (error) { return fallback; }
    }

    var profiles = Object.create(null);
    var configured = parseJson(PluginManager.parameters('Kudasai_DialogueSides').Profiles, []);
    if (Array.isArray(configured)) configured.forEach(function (entry) {
        var profile = parseJson(entry, null);
        if (!profile || typeof profile.Id !== 'string' || typeof profile.Name !== 'string') return;
        var id = profile.Id.trim().toLowerCase();
        var name = profile.Name.trim();
        if (!id || !name) return;
        profiles[id] = {
            name: name,
            right: profile.Side === 'derecha',
            picture: typeof profile.Image === 'string' ? profile.Image.trim() : '',
            color: typeof profile.Color === 'string' ? profile.Color.trim() : '',
            frame: profile.Frame !== 'false'
        };
    });

    function readTag(text) {
        var tag = /^\\HABLA\[([^\]\r\n]+)\][ \t]*(?:\r?\n)?/i.exec(text);
        if (!tag) return null;
        var fields = tag[1].split('|').map(function (field) { return field.trim(); });
        var side = fields[0].toLowerCase();
        var inlineSide = side === 'izquierda' || side === 'derecha';
        var faceOverride = !inlineSide && fields.length === 2 && fields[1].toLowerCase() === 'rostro';
        var profile = fields.length === 1 || faceOverride ? profiles[side] : null;
        if (!profile) {
            if (!inlineSide || !fields[1] || fields.length > 4) return null;
            profile = {right: side === 'derecha', name: fields[1], picture: fields[2] || '', color: fields[3] || '', frame: false};
        }
        return {
            right: profile.right,
            name: profile.name,
            picture: faceOverride ? '' : profile.picture,
            frame: profile.frame,
            palette: makePalette(profile.color, profile.right),
            source: text,
            prefixLength: tag[0].length
        };
    }

    function tint(base, color, amount, alpha) {
        var channels = base.map(function (channel, index) {
            return Math.round(channel + (color[index] - channel) * amount);
        });
        return 'rgba(' + channels.join(',') + ',' + alpha + ')';
    }

    function makePalette(hex, right) {
        var code = hex.replace(/^#/, '');
        if (/^[\da-f]{3}$/i.test(code)) code = code.replace(/./g, '$&$&');
        if (!/^[\da-f]{6}$/i.test(code)) {
            return {
                accent: right ? '#c996d6' : '#e4b980',
                trim: right ? '#513459' : '#3c3558',
                start: right ? 'rgba(44,24,62,.94)' : 'rgba(30,35,66,.94)',
                end: 'rgba(13,17,32,.91)'
            };
        }
        var color = code.match(/../g).map(function (pair) { return parseInt(pair, 16); });
        var base = [13, 17, 32];
        return {
            accent: tint(color, [255, 247, 234], .57, 1),
            trim: tint(base, color, .36, 1),
            start: tint(base, color, .32, .94),
            end: tint(base, color, .11, .91)
        };
    }

    function shape(ctx, points) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
    }

    function drawPortrait(bitmap, art, style, bottom, accent) {
        if (!art || !art.width || !art.height) return;
        var width = bitmap.width;
        var edge = Math.round(width * .014);
        var size = Math.min(Math.round(width * .195) - 16, bitmap.height - 24);
        var x = style.right ? width - edge - size : edge;
        var y = Math.max(8, bottom - size);
        bottom = y + size;

        var faceWidth = style.picture ? art.width : Window_Base._faceWidth;
        var faceHeight = style.picture ? art.height : Window_Base._faceHeight;
        var sx = style.picture ? 0 : style.faceIndex % 4 * faceWidth;
        var sy = style.picture ? 0 : Math.floor(style.faceIndex / 4) * faceHeight;
        if (sx + faceWidth > art.width || sy + faceHeight > art.height) return;
        var scale = size / Math.max(faceWidth, faceHeight);
        var fitWidth = faceWidth * scale, fitHeight = faceHeight * scale;
        var fitX = x + (size - fitWidth) / 2;
        if (style.picture && !style.frame) {
            bitmap.blt(art, sx, sy, faceWidth, faceHeight, fitX, bottom - fitHeight, fitWidth, fitHeight);
            return;
        }
        var ctx = bitmap._context;
        var corners = [[x + 16, y], [x + size - 9, y], [x + size, y + 11],
            [x + size, bottom - 16], [x + size - 14, bottom], [x + 8, bottom],
            [x, bottom - 9], [x, y + 16]];
        shape(ctx, corners);
        ctx.fillStyle = '#14152b';
        ctx.fill();
        ctx.save();
        ctx.clip();
        bitmap.blt(art, sx, sy, faceWidth, faceHeight, fitX, y + (size - fitHeight) / 2, fitWidth, fitHeight);
        ctx.restore();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function drawChrome(win, art) {
        var scene = SceneManager._scene;
        var windows = scene && scene._windowLayer;
        if (!windows || win.parent !== windows) return;
        var style = win._kudasaiDialogueSide;
        var overlay = win._kudasaiDialogueChrome;
        if (!overlay) {
            overlay = new Sprite(new Bitmap(Graphics.boxWidth, Graphics.boxHeight));
            overlay.move(windows.x, windows.y);
            scene.addChildAt(overlay, scene.getChildIndex(windows));
            win._kudasaiDialogueChrome = overlay;
        }
        var bitmap = overlay.bitmap, ctx = bitmap._context;
        var x = win.x, y = win.y, right = x + win.width, bottom = y + win.height;
        var palette = style.palette;
        bitmap.clear();
        drawPortrait(bitmap, art, style, Math.min(bitmap.height - 16, bottom + 14), palette.accent);

        var shade = ctx.createLinearGradient(style.right ? right : x, y, style.right ? x : right, bottom);
        shade.addColorStop(0, palette.start);
        shade.addColorStop(1, palette.end);
        shape(ctx, [[x + 13, y], [right - 13, y], [right, y + 12], [right - 4, bottom - 9],
            [right - 17, bottom], [x + 14, bottom], [x, bottom - 12], [x + 2, y + 12]]);
        ctx.fillStyle = shade;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = palette.trim;
        ctx.stroke();

        bitmap.fontFace = 'Georgia, Times New Roman, serif';
        bitmap.fontSize = 22;
        bitmap.outlineWidth = 0;
        bitmap.textColor = palette.accent;
        var labelWidth = Math.min(win.width - 48, Math.max(108, Math.ceil(bitmap.measureTextWidth(style.name)) + 42));
        var labelX = style.right ? right - labelWidth - 15 : x + 15;
        var labelY = y - 24;
        shape(ctx, [[labelX + 10, labelY], [labelX + labelWidth, labelY],
            [labelX + labelWidth - 10, labelY + 35], [labelX, labelY + 35]]);
        ctx.fillStyle = palette.trim;
        ctx.fill();
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1;
        ctx.stroke();
        bitmap.drawText(style.name, labelX + 13, labelY, labelWidth - 26, 33, 'center');
        style.paintedArt = art;
    }

    var start = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function () {
        var previous = this._kudasaiDialogueSide;
        var style = readTag($gameMessage.allText());
        this._kudasaiDialogueSide = style;
        if (previous && !style) {
            this.width = this.windowWidth();
            this.x = Math.round((Graphics.boxWidth - this.width) / 2);
            this.createContents();
        }
        if (style) style.faceIndex = $gameMessage.faceIndex();
        start.apply(this, arguments);
        if (style) drawChrome(this, this._faceBitmap && this._faceBitmap.isReady() ? this._faceBitmap : null);
    };

    var convert = Window_Message.prototype.convertEscapeCharacters;
    Window_Message.prototype.convertEscapeCharacters = function (text) {
        var style = this._kudasaiDialogueSide;
        return convert.call(this, style && text === style.source ? text.slice(style.prefixLength) : text);
    };

    var newPage = Window_Message.prototype.newPage;
    Window_Message.prototype.newPage = function (textState) {
        var style = this._kudasaiDialogueSide;
        if (style) {
            var width = Math.min(960, Math.floor(Graphics.boxWidth * .75));
            if (this.width !== width) {
                this.width = width;
                this.createContents();
            }
        }
        newPage.apply(this, arguments);
        if (style) {
            var textHeight = this.calcTextHeight(textState, true);
            textState.y = Math.max(0, Math.floor((this.contents.height - textHeight) / 2));
        }
    };

    var placement = Window_Message.prototype.updatePlacement;
    Window_Message.prototype.updatePlacement = function () {
        placement.apply(this, arguments);
        var style = this._kudasaiDialogueSide;
        if (!style) return;
        var x = Math.round(Graphics.boxWidth * .18) + 8;
        this.x = style.right ? Graphics.boxWidth - this.width - x : x;
        if (this._positionType === 0) this.y = 48;
        if (this._positionType === 2) this.y = Graphics.boxHeight - this.height - 32;
        this._goldWindow.y = this._positionType === 0 ? Graphics.boxHeight - this._goldWindow.height : 0;
    };

    var background = Window_Message.prototype.updateBackground;
    Window_Message.prototype.updateBackground = function () {
        background.apply(this, arguments);
        if (this._kudasaiDialogueSide) this.setBackgroundType(2);
    };

    var newLineX = Window_Message.prototype.newLineX;
    Window_Message.prototype.newLineX = function () {
        return this._kudasaiDialogueSide ? 12 : newLineX.apply(this, arguments);
    };

    var loadFace = Window_Message.prototype.loadMessageFace;
    Window_Message.prototype.loadMessageFace = function () {
        var style = this._kudasaiDialogueSide;
        if (style && style.picture) this._faceBitmap = ImageManager.reservePicture(style.picture, 0, this._imageReservationId);
        else loadFace.apply(this, arguments);
    };

    var drawFace = Window_Message.prototype.drawMessageFace;
    Window_Message.prototype.drawMessageFace = function () {
        var style = this._kudasaiDialogueSide;
        if (!style) return drawFace.apply(this, arguments);
        if (style.paintedArt !== this._faceBitmap) drawChrome(this, this._faceBitmap);
        ImageManager.releaseReservation(this._imageReservationId);
    };

    var update = Window_Message.prototype.update;
    Window_Message.prototype.update = function () {
        update.apply(this, arguments);
        var overlay = this._kudasaiDialogueChrome;
        if (overlay) {
            overlay.visible = !!this._kudasaiDialogueSide && this.visible && !this.isClosed();
            overlay.opacity = this.openness;
        }
    };

    var choicePlacement = Window_ChoiceList.prototype.updatePlacement;
    Window_ChoiceList.prototype.updatePlacement = function () {
        choicePlacement.apply(this, arguments);
        var message = this._messageWindow;
        if (message._kudasaiDialogueSide && this.width <= message.width) {
            this.x = Math.max(message.x, Math.min(this.x, message.x + message.width - this.width));
        }
    };

    var terminate = Scene_Base.prototype.terminate;
    Scene_Base.prototype.terminate = function () {
        var message = this._messageWindow;
        var overlay = message && message._kudasaiDialogueChrome;
        if (overlay) {
            var bitmap = overlay.bitmap;
            overlay.destroy();
            bitmap._baseTexture.destroy();
            ImageManager.releaseReservation(message._imageReservationId);
            message._kudasaiDialogueChrome = null;
        }
        terminate.apply(this, arguments);
    };
}());
