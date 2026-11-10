/*:
 * @plugindesc Kudasai: luz ambiental, antorchas con sombras y colisiones por regiones. MV 1.6.
 * @author Gstv_
 * @help
 * Solo se activa en mapas con la nota <KudasaiLighting:{...}>.
 * JSON: ambient [R,G,B], lights [{x,y,r,power,color:[R,G,B],flicker:true}].
 * Coordenadas y radios en casillas. Región 1: muro opaco, región 2: suelo,
 * región 3: objeto sólido. Las demás regiones conservan la colisión normal.
 * Las sombras son estáticas; las luces se actualizan en cada fotograma.
 * No modifica escenas de combate, menús ni los mapas originales.
 */
(function () {
  "use strict";
  // Shared classification, independent of the parallax cache/hash.
  window.KudasaiDaylight = {
    isDay: function () {
      var note=$dataMap.note||'', explicit=/<KudasaiDaylight:(on|off)>/i.exec(note);
      if(explicit)return explicit[1].toLowerCase()==='on';
      var id=$gameMap.mapId();
      if([16,17,25,26,27,28,29,30,31].indexOf(id)>=0)return false;
      if(/<KudasaiCineTone:(noche|tarde)>/i.test(note))return false;
      return true;
    },
    isInterior: function(){return !!(($gameMap._kudasaiLighting||{}).interior)||$dataMap.tilesetId===3;}
  };
  var setup = Game_Map.prototype.setup;
  Game_Map.prototype.setup = function (mapId) {
    setup.call(this, mapId);
    this._kudasaiLighting = null;
    var match = ($dataMap.note || "").match(/<KudasaiLighting:(\{[^>]+\})>/);
    if (match) {
      try {
        this._kudasaiLighting = JSON.parse(match[1]);
      } catch (e) {
        console.error("Kudasai: nota de iluminación inválida", e);
      }
    }
  };
  var pass = Game_Map.prototype.checkPassage;
  Game_Map.prototype.checkPassage = function (x, y, bit) {
    if (this._kudasaiLighting && bit & 15) {
      var r = this.regionId(x, y);
      if (r === 1 || r === 3) return false;
      if (r === 2) return true;
    }
    return pass.call(this, x, y, bit);
  };
  function polygon(light) {
    var points = [],
      tw = $gameMap.tileWidth(),
      th = $gameMap.tileHeight();
    var x = light.x * tw,
      y = light.y * th,
      radius = light.r * tw;
    for (var a = 0; a < 96; a++) {
      var angle = (a * Math.PI * 2) / 96,
        cx = Math.cos(angle),
        cy = Math.sin(angle),
        dist = 0;
      for (; dist < radius; dist += 8) {
        var tx = Math.floor((x + cx * dist) / tw),
          ty = Math.floor((y + cy * dist) / th);
        if (
          !$gameMap.isValid(tx, ty) ||
          (dist > 24 && $gameMap.regionId(tx, ty) === 1)
        )
          break;
      }
      points.push([x + cx * dist, y + cy * dist]);
    }
    return points;
  }
  function resolveLight(source) {
    var light = Object.assign({}, source);
    // Window sources were embedded in solid wall tiles. Move the emission to
    // the foot of the facade, rather than clipping a 24px disc inside the wall.
    if (
      !light.flicker &&
      $gameMap.regionId(Math.floor(light.x), Math.floor(light.y)) === 1
    ) {
      for (var d = 0.25; d <= 4; d += 0.25) {
        var y = light.y + d;
        if ($gameMap.regionId(Math.floor(light.x), Math.floor(y)) === 2) {
          light.y = y + 0.12;
          light.beam = true;
          break;
        }
      }
      if (!light.beam) light.power = 0;
    }
    return light;
  }
  function makeLightTexture(light, ambient) {
    var radius = (light.r * $gameMap.tileWidth()) / 2,
      r = Math.ceil(radius) + 4;
    var raw = document.createElement("canvas");
    raw.width = raw.height = r * 2;
    var c = raw.getContext("2d"),
      points = polygon(light),
      wx = light.x * $gameMap.tileWidth(),
      wy = light.y * $gameMap.tileHeight();
    c.save();
    c.beginPath();
    points.forEach(function (p, i) {
      var x = (p[0] - wx) / 2 + r,
        y = (p[1] - wy) / 2 + r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.clip();
    c.translate(r, r + (light.beam ? radius * 0.24 : 0));
    c.scale(light.beam ? 0.58 : 1, light.beam ? 0.8 : 1);
    // Add only the remaining headroom of each ambient channel. This avoids
    // saturated discs with a flat white centre and visible rings.
    var rgb = light.color
      .map(function (v, i) {
        return Math.round(((255 - ambient[i]) * v) / 255);
      })
      .join(",");
    var grad = c.createRadialGradient(0, 0, 0, 0, 0, radius);
    for (var s = 0; s <= 12; s++) {
      var t = s / 12;
      grad.addColorStop(
        t,
        "rgba(" +
          rgb +
          "," +
          Math.min(1, light.power * 1.3) *
            (light.beam ? 1 : 1) *
            Math.pow(1 - t, 2.2) +
          ")",
      );
    }
    c.fillStyle = grad;
    c.fillRect(-radius, -radius, 2 * radius, 2 * radius);
    c.restore();
    var soft = document.createElement("canvas");
    soft.width = soft.height = raw.width;
    var sc = soft.getContext("2d");
    sc.filter = "blur(1.5px)";
    sc.drawImage(raw, 0, 0);
    return { canvas: soft, r: r, light: light };
  }
  var create = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function () {
    create.call(this);
    if (!$gameMap._kudasaiLighting) return;
    this._kudasaiConfig = Object.assign({}, $gameMap._kudasaiLighting);
    // Cool dusk outside, gentle warm shadows inside the council hall.
    this._kudasaiConfig.ambient = this._kudasaiConfig.interior
      ? this._kudasaiConfig.ambient
      : /<KudasaiParallax:[^>]*"sun":true/.test($dataMap.note)
        ? $gameMap._kudasaiLighting.ambient
        : $gameMap.mapId() === 4
          ? [161, 155, 145]
          : [134, 153, 161];
    // More contrast lets the soft illuminated areas stand out.
    this._kudasaiConfig.ambient = this._kudasaiConfig.ambient.map(function (v) {
      return Math.max(0, v - (this._kudasaiConfig.interior ? 18 : 12));
    }, this);
    if(KudasaiDaylight.isDay())this._kudasaiConfig.ambient=KudasaiDaylight.isInterior()?[226,211,190]:[248,241,222];
    // Alba daytime: clear sky fill, without the previous yellow dimming mask.
    if($gameMap.mapId()===8&&KudasaiDaylight.isDay()&&!KudasaiDaylight.isInterior())this._kudasaiConfig.ambient=[255,253,248];
    // Late afternoon: visibly lower illumination and stronger amber than morning.
    if($gameMap.mapId()===16&&!KudasaiDaylight.isInterior())this._kudasaiConfig.ambient=[230,184,145];
    if([8,16,17].indexOf($gameMap.mapId())>=0&&!KudasaiDaylight.isInterior()){
      var moodMatch=($dataMap.note||'').match(/<KudasaiAlbaMood:(\{[^>]+\})>/);
      if(moodMatch){try{var mood=JSON.parse(moodMatch[1]);if(Array.isArray(mood.ambient)&&mood.ambient.length===3)this._kudasaiConfig.ambient=mood.ambient.map(function(v){return Math.max(0,Math.min(255,Number(v)||0));});}catch(e){console.error('Kudasai: ambiente del Alba inválido',e);}}
    }
    var ambient = this._kudasaiConfig.ambient;
    this._kudasaiTextures = this._kudasaiConfig.lights.map(function (l) {
      return makeLightTexture(resolveLight(l), ambient);
    });
    this._kudasaiLightSprite = new Sprite();
    this._kudasaiLightSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this._kudasaiLightSprite.scale.set(2, 2);
    this._baseSprite.addChild(this._kudasaiLightSprite);
    this._kudasaiFrame = 0;
    this.updateKudasaiLight();
  };
  Spriteset_Map.prototype.updateKudasaiLight = function () {
    if (!this._kudasaiLightSprite) return;
    var sp = this._kudasaiLightSprite,
      w = Math.ceil(Graphics.width / 2),
      h = Math.ceil(Graphics.height / 2);
    if (!sp.bitmap || sp.bitmap.width !== w || sp.bitmap.height !== h) {
      if (sp.bitmap && sp.bitmap._baseTexture) sp.bitmap._baseTexture.destroy();
      sp.bitmap = new Bitmap(w, h);
    }
    var ctx = sp.bitmap._context,
      config = this._kudasaiConfig;
    var ox = $gameMap.displayX() * $gameMap.tileWidth(),
      oy = $gameMap.displayY() * $gameMap.tileHeight();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgb(" + config.ambient.join(",") + ")";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this._kudasaiTextures.length; i++) {
      var texture = this._kudasaiTextures[i],
        l = texture.light,
        x = (l.x * $gameMap.tileWidth() - ox) / 2,
        y = (l.y * $gameMap.tileHeight() - oy) / 2,
        r = texture.r;
      if (x + r < 0 || y + r < 0 || x - r > w || y - r > h) continue;
      var flicker = l.flicker
        ? 1 +
          0.025 * Math.sin(this._kudasaiFrame * 0.1 + i * 2) +
          0.016 * Math.sin(this._kudasaiFrame * 0.23 + i)
        : 1;
      ctx.globalAlpha = Math.min(1, Math.max(0, flicker));
      ctx.drawImage(texture.canvas, x - r, y - r);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    sp.bitmap._setDirty();
  };
  var update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function () {
    update.call(this);
    if (this._kudasaiLightSprite) {
      this._kudasaiFrame++;
      this.updateKudasaiLight();
    }
  };
})();
