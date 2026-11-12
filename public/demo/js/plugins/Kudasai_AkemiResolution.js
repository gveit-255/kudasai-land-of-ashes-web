/*:
 * @plugindesc Conserva las hojas originales de Akemi y Loussiana sin reducir sus pixeles.
 * @author Kudasai
 * @help
 * Para $Kudasai_Akemi y $Kudasai_Loussiana con celdas mayores de 64 px: textura original,
 * escala de visualizacion equivalente a una celda de 64 px, filtrado lineal.
 * Compatible con menus, arbustos, sombras de Alba y MV3D. Cargar al final.
 */
(function () {
    'use strict';
    var names = ['$Kudasai_Akemi', '$Kudasai_Loussiana'];
    var cellSize = 64;
    var displayWidth = cellSize * 3;
    function factor(bitmap, characterName) {
        return names.indexOf(characterName) >= 0 && bitmap && bitmap.isReady() &&
            bitmap.width > displayWidth ? displayWidth / bitmap.width : 1;
    }
    window.KudasaiAkemiResolution = {
        factor: factor,
        shadowSource: function (bitmap, characterName) {
            if (factor(bitmap, characterName) === 1) return bitmap._canvas;
            if (!bitmap._akemiShadowCanvas) {
                var canvas = document.createElement('canvas');canvas.width = displayWidth;canvas.height = cellSize * 4;
                var context = canvas.getContext('2d');context.imageSmoothingEnabled = true;
                context.drawImage(bitmap._canvas, 0, 0, canvas.width, canvas.height);bitmap._akemiShadowCanvas = canvas;
            }
            return bitmap._akemiShadowCanvas;
        }
    };
    var updateBitmap = Sprite_Character.prototype.updateBitmap;
    Sprite_Character.prototype.updateBitmap = function () {
        updateBitmap.apply(this, arguments);
        var scale = factor(this.bitmap, this._characterName);
        if (scale !== 1) {
            this.bitmap.smooth = true;
            this.scale.set(scale, scale);
            this._kudasaiTextureScale = scale;
        } else if (this._kudasaiTextureScale) {
            this.scale.set(1, 1);
            this._kudasaiTextureScale = null;
        }
    };
    var updateCharacterFrame = Sprite_Character.prototype.updateCharacterFrame;
    Sprite_Character.prototype.updateCharacterFrame = function () {
        var depth = this._bushDepth, scale = factor(this.bitmap, this._characterName);
        if (scale !== 1) this._bushDepth = depth / scale;
        try { return updateCharacterFrame.apply(this, arguments); }
        finally { this._bushDepth = depth; }
    };
    var drawCharacter = Window_Base.prototype.drawCharacter;
    Window_Base.prototype.drawCharacter = function (characterName, characterIndex, x, y) {
        var bitmap = ImageManager.loadCharacter(characterName), scale = factor(bitmap, characterName);
        if (scale === 1) return drawCharacter.apply(this, arguments);
        var width = bitmap.width / 3, height = bitmap.height / 4, context = this.contents._context;
        context.save();context.imageSmoothingEnabled = true;
        context.drawImage(bitmap._canvas, width, 0, width, height,
            x - cellSize / 2, y - height * scale, cellSize, height * scale);
        context.restore();this.contents._setDirty();
    };
    if (window.mv3d && mv3d.Character) {
        var updateScale = mv3d.Character.prototype.updateScale;
        mv3d.Character.prototype.updateScale = function () {
            var result = updateScale.apply(this, arguments), scale = factor(this.bitmap, this._characterName);
            if (scale !== 1 && !this.isEmpty && !this.isComplex && !this.textureRect && this.isBitmapReady()) {
                this.spriteWidth *= scale;this.spriteHeight *= scale;
                var x = this.spriteWidth, y = this.spriteHeight;
                if (this.model.mesh) {
                    if (this.model.shape === mv3d.enumShapes.SPRITE) {this.model.scaling.set(1, 1, 1);this.model.mesh.scaling.set(x, y, y);}
                    else if (this.model.shape === mv3d.enumShapes.FLAT) {this.model.scaling.set(x, y, y);this.model.mesh.scaling.set(1, 1, 1);}
                    else {this.model.scaling.set(x, y, x);this.model.mesh.scaling.set(1, 1, 1);}
                }
                if (this.model.texture) this.model.texture.updateSamplingMode(2);
            }
            return result;
        };
    }
})();
