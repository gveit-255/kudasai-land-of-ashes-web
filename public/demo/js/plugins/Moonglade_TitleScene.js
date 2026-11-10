/*:
 * @plugindesc Kudasai: pantalla de estudio, título, carga y opciones diseñados a medida.
 * @author Gstv_
 * @help
 * Fragmento extraído de Moonglade_Presentation.js para mantenerlo como
 * módulo independiente. Colocar después de Kudasai_Branding y de las
 * correcciones de escala.
 * Logo: animación del estudio decodificada en Moonglade_Studio_Anim_*.png.
 * Moonglade_Logo.png se conserva para el emblema del menú.
 * Fondo: el configurado en Sistema > Pantalla de título > Imagen 1.
 * Intro: 4.5 segundos, omitir con Enter/Espacio/Escape o clic tras 0.5 s.
 * Navegación: flechas, Enter, Escape, ratón o toque. Opciones: izquierda/derecha.
 * Guarda preferencias mediante ConfigManager y carga partidas mediante DataManager.
 * No cambia la partida inicial, los mapas ni el formato de los archivos guardados.
 *
 * Incluye: Scene_MoongladeSplash (logo de estudio), Scene_Title personalizada,
 * Scene_MoongladeLoad (pantalla de carga) y Scene_MoongladeOptions (opciones).
 * Todo este bloque comparte variables internas (colores, dimensiones, cursor,
 * helpers de dibujo) y por eso permanece en un único archivo/IIFE, tal como
 * estaba en el plugin original.
 */
(function () {
  "use strict";
  var C = {
    ink: "#0b1219",
    paper: "#f5f0e4",
    gold: "#f5f0e4",
    muted: "#a5a7a6",
    line: "rgba(245,240,228,.25)",
  };
  var W = 1280,
    H = 720;
  var titleConfirmSe = {
    name: "Kudasai_Menu_Campana_Suave", volume: 100, pitch: 100, pan: 0,
  };
  var titleReturnSe = {
    name: "Kudasai_Menu_Campana_Regreso", volume: 100, pitch: 100, pan: 0,
  };
  var optionAdjustSe = {
    name: "Kudasai_Menu_Cristal_Breve", volume: 100, pitch: 100, pan: 0,
  };
  var menuErrorSe = {
    name: "Kudasai_Menu_Campana_Apagada", volume: 100, pitch: 100, pan: 0,
  };
  var loadSuccessSe = {
    name: "Kudasai_Menu_Campana_Inicio", volume: 100, pitch: 100, pan: 0,
  };
  function text(ctx, s, x, y, size, color, font, align) {
    ctx.font =
      (font || "Arial") === "Georgia" ? size + "px Georgia" : size + "px Arial";
    ctx.fillStyle = color || C.paper;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  function track(ctx, s, x, y, size, gap, color, align) {
    ctx.font = size + "px Arial";
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    var width = 0,
      i;
    for (i = 0; i < s.length; i++) width += ctx.measureText(s[i]).width + gap;
    if (align === "center") x -= width / 2;
    ctx.textAlign = "left";
    for (i = 0; i < s.length; i++) {
      ctx.fillText(s[i], x, y);
      x += ctx.measureText(s[i]).width + gap;
    }
  }
  function line(ctx, x, y, xx, yy, color) {
    ctx.strokeStyle = color || C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(xx, yy);
    ctx.stroke();
  }
  function diamond(ctx, x, y, r, color) {
    ctx.fillStyle = color || C.gold;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
  }
  function finish(b) {
    b._setDirty();
  }
  function canvas(scene) {
    var s = new Sprite(new Bitmap(W, H));
    s.bitmap.smooth = true;
    scene._content.addChild(s);
    return s;
  }
  // Animated title: cached artwork, drifting mist and independent light layers.
  // Uniform serif lettering and a centered, spaced subtitle.
  function drawKudasaiWordmark(c) {
    var brand = KudasaiBranding.wordmark();
    c.save();
    c.shadowColor = "rgba(211,227,224,.45)";
    c.shadowBlur = 22;
    text(c, brand.name, 640, 255, 112, "#f5f0e4", "Georgia", "center");
    c.shadowBlur = 10;
    track(c, brand.subtitle, 640, 299, 17, 5, "#f5f0e4", "center");
    c.restore();
  }
  // Both panels share an elevated center, with their return controls below.
  function centeredRows(count, height, step) {
    var centerY = H / 2 - 40;
    return centerY - ((count - 1) * step + height) / 2;
  }
  // Native-size PNG cursors avoid trails, extra rendering loops and input offsets.
  var kudasaiCursorReady = false;
  function installKudasaiCursor() {
    if (kudasaiCursorReady) return;
    kudasaiCursorReady = true;
    function icon(active) {
      var canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 28;
      var c = canvas.getContext("2d");
      c.lineJoin = "round";
      c.lineWidth = 1.4;
      c.fillStyle = active ? "#f4d394" : "#ede9df";
      c.strokeStyle = "#19252e";
      c.beginPath();
      c.moveTo(3, 2);
      c.lineTo(6, 21);
      c.lineTo(10, 15);
      c.lineTo(18, 15);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = active ? "#fff0c9" : "#b99d6c";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(6, 7);
      c.lineTo(10, 12);
      c.stroke();
      return (
        'url("' +
        canvas.toDataURL("image/png") +
        '") 3 2, ' +
        (active ? "pointer" : "default")
      );
    }
    var style = document.createElement("style");
    style.id = "kudasai-cursor-style";
    // One cursor for every scene, hover state, overlay and letterboxed margin.
    Graphics.kudasaiCursorValue = icon(false);
    style.textContent = "html,html *,html *::before,html *::after{cursor:" + Graphics.kudasaiCursorValue + " !important;}";
    document.head.appendChild(style);
  }
  installKudasaiCursor();
  function drawKudasaiSelector(c, kind) {
    c.save();
    c.strokeStyle = "#f5f0e4";
    c.fillStyle = "rgba(245,240,228,.15)";
    c.lineWidth = 1.25;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.beginPath();
    if (kind === 0) {
      c.moveTo(-9, 0);
      c.lineTo(2, -7);
      c.lineTo(13, 0);
      c.lineTo(2, 7);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(-3, 0);
      c.lineTo(2, -3);
      c.lineTo(7, 0);
      c.lineTo(2, 3);
      c.closePath();
      c.fillStyle = "#f5f0e4";
      c.fill();
    } else if (kind === 1) {
      c.moveTo(6, -9);
      c.bezierCurveTo(-10, -9, -10, 9, 6, 9);
      c.bezierCurveTo(-2, 5, -2, -5, 6, -9);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(9, 0, 1.3, 0, Math.PI * 2);
      c.fillStyle = "#f5f0e4";
      c.fill();
    } else if (kind === 2) {
      c.moveTo(0, -10);
      c.quadraticCurveTo(2, -2, 10, 0);
      c.quadraticCurveTo(2, 2, 0, 10);
      c.quadraticCurveTo(-2, 2, -10, 0);
      c.quadraticCurveTo(-2, -2, 0, -10);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (kind === 3) {
      c.moveTo(-7, -8);
      c.quadraticCurveTo(0, -5, 7, -8);
      c.lineTo(6, 2);
      c.quadraticCurveTo(4, 7, 0, 10);
      c.quadraticCurveTo(-4, 7, -6, 2);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(0, 5);
      c.stroke();
    } else if (kind === 4) {
      c.moveTo(8, -8);
      c.quadraticCurveTo(2, -5, -5, 0);
      c.quadraticCurveTo(2, 5, 8, 8);
      c.moveTo(12, -5);
      c.quadraticCurveTo(8, -3, 4, 0);
      c.quadraticCurveTo(8, 3, 12, 5);
      c.stroke();
    } else {
      c.moveTo(-9, -5);
      c.lineTo(-5, 0);
      c.lineTo(0, -8);
      c.lineTo(5, 0);
      c.lineTo(9, -5);
      c.lineTo(7, 6);
      c.lineTo(-7, 6);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(-6, 9);
      c.lineTo(6, 9);
      c.stroke();
    }
    c.restore();
  }

  function titleAtmosphere(scene) {
    scene._titleTextures = [];
    scene._fogLayers = [];
    scene._lightLayers = [];
    // Soft light is a pre-rendered texture; only transforms change each frame.
    var beam = new Bitmap(200, 600),
      c = beam._context;
    var pixels = c.createImageData(200, 600);
    for (var py = 0; py < 600; py++)
      for (var px = 0; px < 200; px++) {
        var distance = (px - 100) / (17 + py * 0.09),
          fade = Math.pow(1 - py / 600, 1.6);
        var alpha = Math.exp(-distance * distance * 2) * fade * 0.2,
          index = (py * 200 + px) * 4;
        pixels.data[index] = 185;
        pixels.data[index + 1] = 213;
        pixels.data[index + 2] = 225;
        pixels.data[index + 3] = Math.round(alpha * 255);
      }
    c.putImageData(pixels, 0, 0);
    finish(beam);
    scene._titleTextures.push(beam);
    for (var i = 0; i < 7; i++) {
      var ray = new Sprite(beam);
      ray.anchor.set(0.5, 0);
      ray.x = 365 + i * 94;
      ray.y = -100;
      ray.scale.set(0.9 + (i % 3) * 0.35, 1.35);
      ray.rotation = 0.16;
      ray.blendMode = PIXI.BLEND_MODES.ADD;
      scene._content.addChild(ray);
      scene._lightLayers.push(ray);
    }
    var g;
    var fog = new Bitmap(1024, 256);
    c = fog._context;
    for (i = 0; i < 32; i++) {
      var x = (i * 173) % 1024,
        y = 76 + Math.sin(i * 2.7) * 46,
        r = 55 + ((i * 19) % 65);
      g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(130,172,186,.11)");
      g.addColorStop(0.45, "rgba(106,150,168,.055)");
      g.addColorStop(1, "rgba(95,142,164,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Radial clouds can cross the bitmap bounds. Fade every edge to zero alpha
    // before uploading, so translating the texture can never reveal a rectangle.
    var fogPixels = c.getImageData(0, 0, 1024, 256);
    function smoothEdge(distance, size) {
      var t = Math.max(0, Math.min(1, distance / size));
      return t * t * (3 - 2 * t);
    }
    for (var fy = 0; fy < 256; fy++)
      for (var fx = 0; fx < 1024; fx++) {
        var feather =
          smoothEdge(Math.min(fx, 1023 - fx), 150) *
          smoothEdge(Math.min(fy, 255 - fy), 72);
        fogPixels.data[(fy * 1024 + fx) * 4 + 3] = Math.round(
          fogPixels.data[(fy * 1024 + fx) * 4 + 3] * feather,
        );
      }
    c.putImageData(fogPixels, 0, 0);
    finish(fog);
    scene._titleTextures.push(fog);
    for (i = 0; i < 4; i++) {
      var mist = new Sprite(fog);
      mist.anchor.set(0.5, 0.5);
      mist.x = 640;
      mist.y = 360 + i * 104;
      mist.scale.set(1.7 + i * 0.14, 1.1 + i * 0.2);
      mist.opacity = 110 + i * 22;
      mist.blendMode = PIXI.BLEND_MODES.SCREEN;
      scene._content.addChild(mist);
      scene._fogLayers.push(mist);
    }
    if (!usesCharacterCover(scene)) {
      var edge = canvas(scene);
      scene._titleTextures.push(edge.bitmap);
      c = edge.bitmap._context;
      // Near silhouettes frame the scene with torn medieval standards.
      c.fillStyle = "#03090e";
      c.beginPath();
      c.moveTo(0, 720);
      c.lineTo(0, 583);
      c.lineTo(58, 592);
      c.lineTo(101, 645);
      c.lineTo(197, 680);
      c.lineTo(306, 720);
      c.fill();
      c.beginPath();
      c.moveTo(1280, 720);
      c.lineTo(1280, 558);
      c.lineTo(1208, 580);
      c.lineTo(1160, 648);
      c.lineTo(1050, 704);
      c.lineTo(983, 720);
      c.fill();
      c.save();
      c.translate(111, 633);
      c.rotate(-0.1);
      c.fillRect(-3, -293, 6, 305);
      c.beginPath();
      c.moveTo(0, -289);
      c.bezierCurveTo(43, -310, 62, -269, 114, -285);
      c.lineTo(101, -226);
      c.lineTo(81, -239);
      c.lineTo(84, -202);
      c.bezierCurveTo(44, -198, 33, -246, 0, -228);
      c.fill();
      c.restore();
      c.save();
      c.translate(1190, 622);
      c.rotate(0.13);
      c.fillRect(-3, -230, 5, 260);
      c.beginPath();
      c.moveTo(0, -229);
      c.bezierCurveTo(-24, -251, -51, -215, -81, -228);
      c.lineTo(-70, -156);
      c.lineTo(-49, -172);
      c.lineTo(-51, -145);
      c.bezierCurveTo(-28, -153, -19, -182, 0, -170);
      c.fill();
      c.restore();
      finish(edge.bitmap);
    }
    scene._content.removeChild(scene._ui);
    scene._content.addChild(scene._ui);
    scene._selector = canvas(scene);
    scene._titleTextures.push(scene._selector.bitmap);
    c = scene._selector.bitmap._context;
    c.clearRect(0, 0, W, H);
    c.save();
    c.translate(0, 24);
    for (var side = -1; side <= 1; side += 2) {
      c.save();
      c.translate(640 + side * 179, 0);
      c.scale(side, 1);
      drawKudasaiSelector(c, 0);
      c.restore();
    }
    c.restore();
    finish(scene._selector.bitmap);
    scene._selector.y = 412;
    scene._content.removeChild(scene._motes);
    scene._content.addChild(scene._motes);
  }
  // A continuous mesh avoids cutout seams and extra image loads.
  function replaceCoverSprite(old, columns, rows) {
    var bitmap = old.bitmap, parent = old.parent;
    var mesh = new PIXI.mesh.Plane(new PIXI.Texture(bitmap.baseTexture), columns, rows);
    mesh.bitmap = bitmap;
    mesh.pivot.set(bitmap.width * old.anchor.x, bitmap.height * old.anchor.y);
    mesh.position.copy(old.position);
    mesh.scale.copy(old.scale);
    mesh.canvasPadding = 1;
    parent.addChildAt(mesh, parent.getChildIndex(old));
    parent.removeChild(old);
    old.destroy({children:true, texture:true, baseTexture:false});
    return mesh;
  }
  function smoothCoverWeight(value) {
    value = Math.max(0, Math.min(1, value));
    return value * value * (3 - 2 * value);
  }
  function coverInfluence(x, y, points, feather) {
    var inside = false, nearest = Infinity;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var a = points[i], b = points[j], dx = b[0] - a[0], dy = b[1] - a[1],
        along = Math.max(0, Math.min(1,
          ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))),
        ex = x - a[0] - along * dx, ey = y - a[1] - along * dy;
      nearest = Math.min(nearest, Math.sqrt(ex * ex + ey * ey));
      if ((a[1] > y) !== (b[1] > y) &&
          x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside ? smoothCoverWeight(nearest / feather) : 0;
  }
  function releaseCoverMesh(mesh) {
    Object.keys(mesh._glDatas).forEach(function (key) {
      var data = mesh._glDatas[key];
      data.vao.destroy();
      data.vertexBuffer.destroy();
      data.uvBuffer.destroy();
      data.indexBuffer.destroy();
    });
    mesh._glDatas = {};
    mesh.texture.destroy(false);
    mesh.destroy({children:true});
  }
  function moveCover(back, motion, pointer, tick, width, height, baseY) {
    var within = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height,
      targetX = within ? (pointer.x - width / 2) / (width / 2) : 0,
      targetY = within ? (pointer.y - height / 2) / (height / 2) : 0;
    motion.x += (targetX - motion.x) * 0.035;
    motion.y += (targetY - motion.y) * 0.035;
    back.x = width / 2 + Math.sin(tick * 0.004) * 4.5 - motion.x * 7;
    back.y = baseY + Math.sin(tick * 0.003) * 2.5 - motion.y * 4;
  }
  function coverOverscan(tick) {
    return 1.045 + Math.sin(tick * 0.002) * 0.0015;
  }
  function addCoverLeaves(scene, mesh) {
    var bitmap = new Bitmap(216, 194), c = bitmap._context;
    var leaves = [
      [48,185, -2.20, 113, 17], [69,175, -.75, 91, 16],
      [47,160, -1.77, 90, 13], [73,158, -.37, 117, 19],
      [42,151, -2.60, 67, 13], [70,137, -.83, 88, 14],
      [56,125, -2.35, 80, 14], [66,118, -.45, 82, 12],
      [57,103, -1.87, 72, 13], [64,94, -.52, 54, 10],
      [76,186, -.22, 96, 20], [53,174, -2.67, 83, 16]
    ];
    c.filter = "blur(1.4px)";
    c.strokeStyle = "#1c2d45";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(73,194); c.quadraticCurveTo(43,144,63,86); c.stroke();
    leaves.forEach(function (leaf, i) {
      var length = leaf[3], width = leaf[4];
      c.save();
      c.translate(leaf[0], leaf[1]);
      c.rotate(leaf[2]);
      var color = c.createLinearGradient(0, -width, 0, width);
      color.addColorStop(0, i % 3 === 0 ? "#557da5" : "#44698f");
      color.addColorStop(.46, "#2c4c70");
      color.addColorStop(1, "#172840");
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(length * .29, -width, length * .72, -width * 1.25, length, -3);
      c.bezierCurveTo(length * .77, -5, length * .39, width * .97, 0, 0);
      c.fill();
      c.strokeStyle = "rgba(133,177,218,.24)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(3, 0);
      c.quadraticCurveTo(length * .46, -width * .42, length * .89, -4);
      c.stroke();
      c.restore();
    });
    finish(bitmap);
    scene._titleTextures.push(bitmap);
    var foliage = new Sprite(bitmap);
    foliage.scale.set(mesh.bitmap.width / W, mesh.bitmap.height / H);
    foliage.position.set(mesh.bitmap.width * .008, mesh.bitmap.height - bitmap.height * foliage.scale.y);
    mesh.addChild(foliage);
  }
  // Both title characters share gentle breathing and sway on the original drawing.
  function createCoverPuppet(scene) {
    if (scene._coverPuppet || !usesCharacterCover(scene)) return;
    var old = scene._back, bitmap = old.bitmap;
    if (!bitmap.isReady()) return;
    var mesh = replaceCoverSprite(old, 49, 29),
      base = new Float32Array(mesh.vertices), weights = [],
      libu = [[0,362],[63,338],[94,226],[166,162],[226,177],[224,138],
        [207,109],[226,68],[272,38],[330,28],[382,50],[419,91],[414,152],
        [372,201],[374,245],[399,302],[408,399],[432,518],[447,617],[488,720],[0,720]],
      loussiana = [[736,720],[754,661],[726,619],[758,553],[784,493],[793,414],
        [817,387],[856,358],[867,318],[884,290],[870,251],[877,211],[899,173],
        [942,153],[1005,153],[1066,181],[1143,194],[1280,151],[1280,720]];
    for (var i = 0; i < base.length; i += 2) {
      var x = base[i] * W / bitmap.width, y = base[i + 1] * H / bitmap.height;
      weights.push({x:x, y:y, l:coverInfluence(x,y,libu,22), r:coverInfluence(x,y,loussiana,22),
        lift:1 - smoothCoverWeight((y - 230) / 490),
        chest:smoothCoverWeight((y - 215) / 90) * (1 - smoothCoverWeight((y - 450) / 180)),
        hair:smoothCoverWeight((x - 1010) / 150) * (1 - smoothCoverWeight((y - 390) / 160)),
        hem:smoothCoverWeight((y - 380) / 180) * (1 - smoothCoverWeight((y - 640) / 80))});
    }
    scene._back = mesh;
    scene._coverPuppet = {mesh:mesh, base:base, weights:weights, period:360, intensity:0.75};
    addCoverLeaves(scene, mesh);
    animateCoverPuppet(scene);
  }
  function animateCoverPuppet(scene) {
    var puppet = scene._coverPuppet;
    if (!puppet) return;
    var phase = (scene._tick % puppet.period) * Math.PI * 2 / puppet.period,
      sway = Math.sin(phase), lift = (1 - Math.cos(phase)) * 0.5,
      strength = puppet.intensity * 0.65,
      sx = puppet.mesh.bitmap.width / W * strength,
      sy = puppet.mesh.bitmap.height / H * strength,
      vertices = puppet.mesh.vertices;
    for (var i = 0; i < puppet.weights.length; i++) {
      var w = puppet.weights[i],
        localLeft = w.x - 270, localRight = w.x - 990,
        lx = sway * 2.5 * w.lift + localLeft * lift * 0.0035 * w.chest,
        rx = sway * 2.5 * w.lift + localRight * lift * 0.0035 * w.chest,
        dy = -lift * 5.2 * w.lift;
      lx += Math.sin(phase + localLeft * 0.006) * 2.2 * w.hem;
      rx += Math.sin(phase + localRight * 0.006) * 2.2 * w.hem;
      vertices[i * 2] = puppet.base[i * 2] + (lx * w.l + rx * w.r) * sx;
      vertices[i * 2 + 1] = puppet.base[i * 2 + 1] + dy * (w.l + w.r) * sy;
    }
  }
  function animateTitle(scene) {
    var t = scene._tick;
    if (usesCharacterCover(scene)) {
      moveCover(scene._back, scene._coverMotion, scene._pointer, t, W, H, H / 2);
      animateCoverPuppet(scene);
    } else {
      scene._back.x = 640 + Math.sin(t * 0.0019) * 9;
      scene._back.y = 360 + Math.cos(t * 0.0015) * 5;
    }
    scene._lightLayers.forEach(function (ray, i) {
      ray.rotation = 0.12 + Math.sin(t * 0.002 + i * 0.7) * 0.055;
      ray.opacity = (115 + Math.sin(t * 0.012 + i) * 42) *
        (usesCharacterCover(scene) ? 0.35 : 1);
    });
    scene._fogLayers.forEach(function (mist, i) {
      mist.x =
        640 + Math.sin(t * (0.0015 + i * 0.0003) + i * 1.7) * (155 + i * 22);
      mist.y = 355 + i * 102 + Math.sin(t * 0.003 + i) * 16;
      mist.opacity = (105 + i * 20 + Math.sin(t * 0.007 + i) * 22) *
        (usesCharacterCover(scene) ? 0.3 : 1);
    });
    scene._selector.y += (412 + scene._index * 58 - scene._selector.y) * 0.16;
    scene._selector.opacity = 195 + Math.sin(t * 0.045) * 55;
    var p = scene._motes;
    p.clear();
    for (var i = 0; i < 52; i++) {
      var x = (i * 193 + Math.sin(t * 0.004 + i) * 27 + W) % W,
        y = H - ((t * (0.12 + (i % 4) * 0.055) + i * 79) % H);
      var a = 0.15 + (1 + Math.sin(t * 0.016 + i * 2)) * 0.14;
      if (x > 430 && x < 850 && y > 385 && y < 653) a *= 0.25;
      p.beginFill(i % 4 === 0 ? 0xe8c48b : 0xc6e0e9, a * 0.15);
      p.drawCircle(x, y, i % 3 === 0 ? 5 : 3);
      p.endFill();
      p.beginFill(i % 4 === 0 ? 0xffdeb0 : 0xd7e8ef, a);
      p.drawCircle(x, y, i % 3 === 0 ? 1.6 : 0.8);
      p.endFill();
    }
  }

  function setup(scene) {
    installKudasaiCursor();
    AudioManager.loadStaticSe(menuErrorSe);
    if (scene._panel) AudioManager.loadStaticSe(titleReturnSe);
    scene._tick = 0;
    scene._index = 0;
    scene._buttons = [];
    scene._message = "";
    scene._leaving = false;
    scene._content = new Sprite();
    scene.addChild(scene._content);
    scene._back = new Sprite(ImageManager.loadTitle1($dataSystem.title1Name));
    scene._back.anchor.set(0.5, 0.5);
    scene._back.x = W / 2;
    scene._back.y = H / 2;
    scene._content.addChild(scene._back);
    scene._shade = canvas(scene);
    scene._ui = canvas(scene);
    scene._motes = new PIXI.Graphics();
    scene._content.addChild(scene._motes);
    scene._pointer = { x: -1, y: -1 };
    scene._coverMotion = { x: 0, y: 0 };
    scene._onMove = function (e) {
      var r = Graphics._canvas.getBoundingClientRect();
      scene._pointer = {
        x: ((e.clientX - r.left) * W) / r.width,
        y: ((e.clientY - r.top) * H) / r.height,
      };
      scene._pointerChanged = true;
    };
    scene._onPointerLeave = function () {
      scene._pointer = { x: -1, y: -1 };
      scene._pointerChanged = true;
    };
    document.addEventListener("mousemove", scene._onMove);
    document.addEventListener("mouseleave", scene._onPointerLeave);
    window.addEventListener("blur", scene._onPointerLeave);
    drawShade(scene);
    if (scene._minimalTitle) titleAtmosphere(scene);
    layout(scene);
  }
  function layout(scene) {
    scene._content.scale.set(Graphics.width / W, Graphics.height / H);
    if (scene._back.bitmap.isReady()) {
      createCoverPuppet(scene);
      // Overscan keeps every edge covered throughout the cursor drift and zoom.
      var overscan = usesCharacterCover(scene)
        ? coverOverscan(scene._tick)
        : 1.025;
      var s =
        Math.max(W / scene._back.bitmap.width, H / scene._back.bitmap.height) *
        overscan;
      scene._back.scale.set(s, s);
    }
  }
  // Dim the illustration below the title and controls with a cool night veil.
  function usesCharacterCover(scene) {
    return scene._minimalTitle &&
      $dataSystem.title1Name === "Kudasai_Libu_Loussiana";
  }
  function drawCoverShade(c, width, height) {
    c.save();
    c.scale(width / W, height / H);
    var coverShade = c.createLinearGradient(0, 0, 0, H);
    coverShade.addColorStop(0, "rgba(3,7,12,.48)");
    coverShade.addColorStop(0.48, "rgba(3,7,12,.44)");
    coverShade.addColorStop(1, "rgba(3,7,12,.64)");
    c.fillStyle = coverShade;
    c.fillRect(0, 0, W, H);
    var centerShade = c.createLinearGradient(0, 0, W, 0);
    centerShade.addColorStop(0, "rgba(1,6,12,0)");
    centerShade.addColorStop(0.29, "rgba(1,6,12,0)");
    centerShade.addColorStop(0.42, "rgba(1,6,12,.17)");
    centerShade.addColorStop(0.58, "rgba(1,6,12,.17)");
    centerShade.addColorStop(0.71, "rgba(1,6,12,0)");
    centerShade.addColorStop(1, "rgba(1,6,12,0)");
    c.fillStyle = centerShade;
    c.fillRect(0, 0, W, H);
    var coverVignette = c.createRadialGradient(640, 300, 180, 640, 360, 760);
    coverVignette.addColorStop(0, "rgba(1,4,8,0)");
    coverVignette.addColorStop(0.65, "rgba(1,4,8,.10)");
    coverVignette.addColorStop(1, "rgba(1,4,8,.32)");
    c.fillStyle = coverVignette;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  window.KudasaiCoverEffects = {
    mesh: replaceCoverSprite,
    influence: coverInfluence,
    release: releaseCoverMesh,
    move: moveCover,
    overscan: coverOverscan,
    shade: drawCoverShade
  };
  function drawShade(scene) {
    var b = scene._shade.bitmap,
      c = b._context;
    c.clearRect(0, 0, W, H);
    if (scene._minimalTitle) {
      if (usesCharacterCover(scene)) {
        drawCoverShade(c, W, H);
        finish(b);
        return;
      }
      c.fillStyle = "rgba(5,16,25,.63)";
      c.fillRect(0, 0, W, H);
      var shade = c.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, "rgba(2,8,14,.12)");
      shade.addColorStop(0.48, "rgba(4,12,20,.20)");
      shade.addColorStop(1, "rgba(2,7,13,.90)");
      c.fillStyle = shade;
      c.fillRect(0, 0, W, H);
      var vignette = c.createRadialGradient(640, 280, 110, 640, 330, 720);
      vignette.addColorStop(0, "rgba(1,6,12,0)");
      vignette.addColorStop(0.55, "rgba(1,6,12,.18)");
      vignette.addColorStop(1, "rgba(1,5,10,.96)");
      c.fillStyle = vignette;
      c.fillRect(0, 0, W, H);
      finish(b);
      return;
    }
    var g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(5,12,20,.98)");
    g.addColorStop(0.32, "rgba(6,13,21,.93)");
    g.addColorStop(0.65, "rgba(7,12,18,.35)");
    g.addColorStop(1, "rgba(7,12,18,.2)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    var v = c.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(5,10,16,.45)");
    v.addColorStop(0.5, "rgba(5,10,16,0)");
    v.addColorStop(1, "rgba(5,10,16,.85)");
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    if (scene._panel) {
      c.fillStyle = "rgba(7,13,21,.72)";
      c.fillRect(0, 0, W, H);
    }
    finish(b);
  }
  function frame(c, label) {
    track(c, "MOONGLADE INTERACTIVE", 72, 53, 11, 2.8, C.muted);
    track(c, label, 1208 - 270, 53, 10, 2, C.gold);
  }
  function region(scene, id, x, y, w, h, action, enabled) {
    scene._buttons.push({
      id: id,
      x: x,
      y: y,
      w: w,
      h: h,
      action: action,
      enabled: enabled !== false,
    });
  }
  function button(c, x, y, w, label, active, disabled) {
    if (active) {
      var g = c.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, "rgba(245,240,228,.18)");
      g.addColorStop(1, "rgba(245,240,228,0)");
      c.fillStyle = g;
      c.fillRect(x, y, w, 60);
    }
    text(
      c,
      label,
      x + 24,
      y + 37,
      24,
      disabled ? "#707676" : active ? "#f5f0e4" : C.paper,
      "Georgia",
    );
    if (active) diamond(c, x + w - 15, y + 30, 4);
  }
  function inside(b, p) {
    return p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h;
  }
  function hover(scene) {
    if (scene._dragIndex != null) {
      scene._pointerChanged = false;
      return;
    }
    if (!scene._pointerChanged) return;
    scene._pointerChanged = false;
    var p = scene._pointer;
    var button = scene._buttons.filter(function (b) {
      return inside(b, p);
    })[0];
    if (button && button.enabled && scene._index !== button.id) {
      scene._index = button.id;
      scene.redraw();
    }
    document.documentElement.setAttribute(
      "data-kudasai-hot",
      button && button.enabled ? "true" : "false",
    );
  }
  function pointer(scene) {
    if (!TouchInput.isTriggered()) return false;
    var p = {
      x: (TouchInput.x * W) / Graphics.width,
      y: (TouchInput.y * H) / Graphics.height,
    };
    var b = scene._buttons.filter(function (b) {
      return inside(b, p);
    })[0];
    if (b) {
      scene._index = b.id;
      if (b.enabled) b.action(p);
      else AudioManager.playStaticSe(menuErrorSe);
      scene.redraw();
      return true;
    }
    return false;
  }
  function activate(scene) {
    var b = scene._buttons.filter(function (b) {
      return b.id === scene._index;
    })[0];
    if (b && b.enabled) b.action();
    else AudioManager.playStaticSe(menuErrorSe);
  }
  function navigation(scene, ids) {
    var delta =
      Input.isRepeated("down") ||
      (scene._minimalTitle && Input.isRepeated("right"))
        ? 1
        : Input.isRepeated("up") ||
            (scene._minimalTitle && Input.isRepeated("left"))
          ? -1
          : 0;
    ids = ids.filter(function (id) {
      return scene._buttons.some(function (b) {
        return b.id === id && b.enabled;
      });
    });
    if (delta && ids.length) {
      var at = ids.indexOf(scene._index),
        next = at < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, at + delta));
      if (scene._index !== ids[next]) {
        scene._index = ids[next];
        SoundManager.playCursor();
        scene.redraw();
      }
    }
  }
  function tick(scene) {
    Scene_Base.prototype.update.call(scene);
    scene._tick++;
    layout(scene);
    // Sparse embers above the distant battlefield, never over the menu labels.
    var g = scene._motes;
    g.clear();
    for (var i = 0; i < (scene._minimalTitle ? 0 : 16); i++) {
      var x = 690 + ((i * 97) % 540) + Math.sin(scene._tick * 0.007 + i) * 14,
        y = H - ((scene._tick * 0.22 + i * 67) % H);
      g.beginFill(0xd6b07a, 0.14 + 0.12 * Math.sin(i + scene._tick * 0.013));
      g.drawCircle(x, y, i % 3 === 0 ? 1.6 : 0.8);
      g.endFill();
    }
    if (scene._minimalTitle) animateTitle(scene);
    hover(scene);
  }
  function terminate(scene) {
    document.removeEventListener("mousemove", scene._onMove);
    document.removeEventListener("mouseleave", scene._onPointerLeave);
    window.removeEventListener("blur", scene._onPointerLeave);
    if (scene._coverPuppet) {
      releaseCoverMesh(scene._coverPuppet.mesh);
      scene._coverPuppet = null;
    }
    document.documentElement.removeAttribute("data-kudasai-hot");
    Scene_Base.prototype.terminate.call(scene);
    (scene._titleTextures || []).forEach(function (b) {
      if (b._baseTexture) b._baseTexture.destroy();
    });
    [scene._ui, scene._shade].forEach(function (s) {
      if (s && s.bitmap && s.bitmap._baseTexture)
        s.bitmap._baseTexture.destroy();
    });
  }
  function back(scene) {
    if (scene._leaving) return;
    AudioManager.playStaticSe(titleReturnSe);
    scene._leaving = true;
    SceneManager.pop();
  }

  // GIF frames use a baked black backdrop so fades need no GPU color filter.
  function Scene_MoongladeSplash() {
    this.initialize.apply(this, arguments);
  }
  Scene_MoongladeSplash.prototype = Object.create(Scene_Base.prototype);
  Scene_MoongladeSplash.prototype.constructor = Scene_MoongladeSplash;
  Scene_MoongladeSplash.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    this._tick = 0;
    this._leaving = false;
    this._root = new Sprite();
    this.addChild(this._root);
    var bg = new Sprite(new Bitmap(W, H));
    this._root.addChild(bg);
    var c = bg.bitmap._context;
    c.fillStyle = "#000000";
    c.fillRect(0, 0, W, H);
    finish(bg.bitmap);
    this._studioBase = ImageManager.loadSystem("Moonglade_Studio_Anim_Base");
    this._studioFrames = ImageManager.loadSystem("Moonglade_Studio_Anim_Frames");
    this._studioFrame = -1;
    this._logo = new Sprite(new Bitmap(640, 400));
    this._logo.x = 320;
    this._logo.y = 140;
    this._root.addChild(this._logo);
    // Fixed native-pixel presentation. No zoom, blur filter or fractional anchor.
    this._logo.scale.set(1, 1);
    // Background cleanup is baked into the PNGs before opacity is applied.
    // This keeps the fade neutral and avoids halos on filtered render targets.
    this._logo.opacity = 0;
  };
  Scene_MoongladeSplash.prototype.start = function () {
    Scene_Base.prototype.start.call(this);
    this._logo.bitmap.blt(this._studioBase, 0, 0, 640, 400, 0, 0);
    this.startFadeIn(24, false);
    AudioManager.stopBgm();
    AudioManager.stopBgs();
  };
  Scene_MoongladeSplash.prototype.update = function () {
    Scene_Base.prototype.update.call(this);
    this._root.scale.set(Graphics.width / W, Graphics.height / H);
    this._tick++;
    // GIF timing: 48 frames at 90 ms each, repeating every 4.32 seconds.
    var frame = Math.floor((this._tick * 1000) / (60 * 90)) % 48;
    if (frame !== this._studioFrame) {
      // Replace pixels before applying opacity: overlapping translucent sprites
      // otherwise brighten the rectangular water patch during the fade-in.
      this._logo.bitmap.blt(this._studioFrames,
        (frame % 8) * 126, Math.floor(frame / 8) * 85, 126, 85, 274, 101);
      this._studioFrame = frame;
    }
    this._logo.opacity = Math.min(255, Math.max(0, (this._tick - 12) * 5));
    if (
      !this._leaving &&
      ((this._tick > 30 &&
        (Input.isTriggered("ok") ||
          Input.isTriggered("cancel") ||
          TouchInput.isTriggered())) ||
        this._tick >= 270)
    ) {
      this._leaving = true;
      this.startFadeOut(30, false);
    }
    if (this._leaving && this._fadeDuration === 0)
      SceneManager.goto(Scene_Title);
  };
  var boot = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function () {
    boot.call(this);
    if (!DataManager.isBattleTest() && !DataManager.isEventTest())
      SceneManager.goto(Scene_MoongladeSplash);
  };
  window.Scene_MoongladeSplash = Scene_MoongladeSplash;

  // Entire title is custom canvas UI; no Window_TitleCommand is constructed.
  Scene_Title.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    AudioManager.loadStaticSe(titleConfirmSe);
    this._minimalTitle = true;
    setup(this);
    this._studioBadge = new Sprite(ImageManager.loadSystem("Moonglade_Logo"));
    this._studioBadge.setFrame(416, 300, 190, 184);
    this._studioBadge.anchor.set(0.5, 0);
    this._studioBadge.x = 1170;
    this._studioBadge.y = 609;
    this._studioBadge.scale.set(0.22, 0.22);
    this._studioBadge.bitmap.smooth = true;
    // Render only the existing moon emblem; its dark source background is transparent.
    this._studioBadge.filters = [
      new PIXI.Filter(
        null,
        "precision mediump float; varying vec2 vTextureCoord; uniform sampler2D uSampler; void main(void){vec4 c=texture2D(uSampler,vTextureCoord); float m=max(c.r,max(c.g,c.b)); float a=smoothstep(0.10,0.24,m); gl_FragColor=vec4(c.rgb*a,c.a*a);}",
      ),
    ];
    this._studioBadge.filters[0].resolution = 2;
    this._content.addChild(this._studioBadge);
    this.redraw();
  };
  Scene_Title.prototype.start = function () {
    Scene_Base.prototype.start.call(this);
    SceneManager.clearStack();
    this.playTitleMusic();
    this.startFadeIn(35, false);
  };
  Scene_Title.prototype.isBusy = function () {
    return Scene_Base.prototype.isBusy.call(this);
  };
  Scene_Title.prototype.terminate = function () {
    terminate(this);
  };
  Scene_Title.prototype.redraw = function () {
    var b = this._ui.bitmap,
      c = b._context;
    c.clearRect(0, 0, W, H);
    this._buttons = [];
    drawKudasaiWordmark(c);
    var labels = ["Nueva partida", "Cargar partida", "Opciones", "Salir del juego"],
      self = this;
    labels.forEach(function (label, i) {
      var active = self._index === i,
        y = 445 + i * 58;
      c.save();
      c.shadowColor = active ? "rgba(245,240,228,.65)" : "rgba(0,0,0,.9)";
      c.shadowBlur = active ? 14 : 6;
      text(
        c,
        label,
        640,
        y,
        active ? 28 : 26,
        active ? "#f5f0e4" : "#bcc5c8",
        "Georgia",
        "center",
      );
      c.restore();
      region(self, i, 420, y - 33, 440, 48, function () {
        self.choose(i);
      });
    });
    track(c, "MOONGLADE", 1170, 663, 11, 1.4, "#c7c4d5", "center");
    track(c, "INTERACTIVE", 1170, 678, 7, 1.7, "#a6a4b8", "center");
    finish(b);
  };
  Scene_Title.prototype.choose = function (i) {
    if (this._leaving) return;
    AudioManager.playStaticSe(titleConfirmSe);
    this._leaving = true;
    if (i === 0) {
      DataManager.setupNewGame();
      this.fadeOutAll();
      SceneManager.goto(Scene_Map);
    } else if (i === 3) {
      this.fadeOutAll();
      SceneManager.exit();
    } else
      SceneManager.push(i === 1 ? Scene_MoongladeLoad : Scene_MoongladeOptions);
  };
  Scene_Title.prototype.update = function () {
    tick(this);
    if (this._leaving || this.isBusy()) return;
    navigation(this, [0, 1, 2, 3]);
    if (!pointer(this) && Input.isTriggered("ok")) activate(this);
  };

  function Scene_MoongladeLoad() {
    this.initialize.apply(this, arguments);
  }
  Scene_MoongladeLoad.prototype = Object.create(Scene_Base.prototype);
  Scene_MoongladeLoad.prototype.constructor = Scene_MoongladeLoad;
  Scene_MoongladeLoad.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    AudioManager.loadStaticSe(loadSuccessSe);
    this._panel = true;
    this._page = Math.floor((DataManager.latestSavefileId() - 1) / 5);
    this._page = Math.max(0, this._page);
    this._loadSuccess = false;
    setup(this);
    this._saves = DataManager.loadGlobalInfo() || [];
    this.redraw();
  };
  Scene_MoongladeLoad.prototype.start = function () {
    Scene_Base.prototype.start.call(this);
    this.startFadeIn(15, false);
  };
  Scene_MoongladeLoad.prototype.redraw = function () {
    var b = this._ui.bitmap,
      c = b._context,
      self = this;
    c.clearRect(0, 0, W, H);
    this._buttons = [];
    if (this._message) text(c, this._message, 75, 110, 13, C.gold);
    var max = DataManager.maxSavefiles();
    var rowTop = centeredRows(
      Math.min(5, max - this._page * 5),
      59,
      65,
    );
    for (var i = 0; i < 5; i++) {
      var id = this._page * 5 + i + 1;
      if (id > max) break;
      var y = rowTop + i * 65,
        info = this._saves[id],
        valid = !!info && DataManager.isThisGameFile(id),
        active = this._index === i;
      if (active) {
        c.fillStyle = "rgba(245,240,228,.1)";
        c.fillRect(72, y, 1136, 59);
      }
      track(
        c,
        String(id).padStart(2, "0"),
        94,
        y + 36,
        14,
        1.5,
        valid ? C.gold : "#767e83",
      );
      text(
        c,
        valid ? "Crónica " + String(id).padStart(2, "0") : "Espacio vacío",
        160,
        y + 36,
        23,
        valid ? C.paper : "#7d858a",
        "Georgia",
      );
      if (valid) {
        text(
          c,
          "Tiempo jugado  " + (info.playtime || "00:00:00"),
          550,
          y + 35,
          14,
          C.muted,
        );
        text(
          c,
          new Date(info.timestamp).toLocaleString("es-ES"),
          1178,
          y + 35,
          14,
          C.gold,
          "Arial",
          "right",
        );
      }

      (function (row, slot) {
        region(
          self,
          row,
          72,
          y,
          1136,
          59,
          function () {
            self.load(slot);
          },
          valid,
        );
      })(i, id);
    }
    text(c, "‹  Volver", 88, 622, 18, this._index === 5 ? C.gold : C.paper);
    region(this, 5, 72, 589, 180, 47, function () {
      back(self);
    });
    text(c, "‹", 988, 620, 23, this._index === 6 ? C.gold : C.paper);
    region(
      this,
      6,
      955,
      589,
      68,
      45,
      function () {
        self.changePage(-1);
      },
      this._page > 0,
    );
    text(
      c,
      this._page + 1 + " / " + Math.ceil(max / 5),
      1078,
      620,
      14,
      C.muted,
      "Arial",
      "center",
    );
    text(c, "›", 1160, 620, 23, this._index === 7 ? C.gold : C.paper);
    region(
      this,
      7,
      1128,
      589,
      80,
      45,
      function () {
        self.changePage(1);
      },
      (this._page + 1) * 5 < max,
    );
    finish(b);
  };
  Scene_MoongladeLoad.prototype.changePage = function (d) {
    var p = Math.max(
      0,
      Math.min(Math.ceil(DataManager.maxSavefiles() / 5) - 1, this._page + d),
    );
    if (p !== this._page) {
      this._page = p;
      this._index = 0;
      SoundManager.playCursor();
      this.redraw();
    }
  };
  Scene_MoongladeLoad.prototype.load = function (id) {
    if (this._leaving) return;
    if (DataManager.loadGame(id)) {
      AudioManager.playStaticSe(loadSuccessSe);
      this._leaving = true;
      this._loadSuccess = true;
      this.fadeOutAll();
      Scene_Load.prototype.reloadMapIfUpdated.call(this);
      SceneManager.goto(Scene_Map);
    } else {
      AudioManager.playStaticSe(menuErrorSe);
      this._message = "No se pudo leer esta partida. Prueba con otro archivo.";
      this.redraw();
    }
  };
  Scene_MoongladeLoad.prototype.update = function () {
    tick(this);
    if (this._leaving || this.isBusy()) return;
    navigation(this, [0, 1, 2, 3, 4, 5, 6, 7]);
    if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
      back(this);
      return;
    }
    if (Input.isRepeated("left")) this.changePage(-1);
    if (Input.isRepeated("right")) this.changePage(1);
    if (!pointer(this) && Input.isTriggered("ok")) activate(this);
  };
  Scene_MoongladeLoad.prototype.terminate = function () {
    terminate(this);
    if (this._loadSuccess) $gameSystem.onAfterLoad();
  };
  window.Scene_MoongladeLoad = Scene_MoongladeLoad;

  var options = [
    { key: "kudasaiResolution", name: "Resolución", resolution: true },
    { key: "kudasaiFullscreen", name: "Modo de pantalla", toggle: true, screen: true },
    {
      key: "bgmVolume",
      name: "Música",
      hint: "Banda sonora del título y los escenarios.",
    },
    {
      key: "bgsVolume",
      name: "Ambiente",
      hint: "Viento, agua y sonidos del entorno.",
    },
    {
      key: "meVolume",
      name: "Melodías",
      hint: "Fanfarrias de victoria y otros momentos.",
    },
    {
      key: "seVolume",
      name: "Efectos",
      hint: "Acciones, pasos y sonidos de interfaz.",
    },
    {
      key: "alwaysDash",
      name: "Correr siempre",
      hint: "Invierte el comportamiento de la tecla Mayús.",
      toggle: true,
    },
    {
      key: "commandRemember",
      name: "Recordar comandos",
      hint: "Recuerda la última acción durante el combate.",
      toggle: true,
    },
  ];
  var SLIDER = { left: 790, right: 1050, minus: 750, plus: 1090 };
  function volume(value) {
    value = Number(value);
    return isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : 100;
  }
  function Scene_MoongladeOptions() {
    this.initialize.apply(this, arguments);
  }
  Scene_MoongladeOptions.prototype = Object.create(Scene_Base.prototype);
  Scene_MoongladeOptions.prototype.constructor = Scene_MoongladeOptions;
  Scene_MoongladeOptions.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    AudioManager.loadStaticSe(optionAdjustSe);
    this._panel = true;
    this._dragIndex = null;
    setup(this);
    options.forEach(function (o) {
      if (o.screen || o.resolution) return;
      ConfigManager[o.key] = o.toggle
        ? !!ConfigManager[o.key]
        : volume(ConfigManager[o.key]);
    });
    this.redraw();
  };
  Scene_MoongladeOptions.prototype.start = function () {
    Scene_Base.prototype.start.call(this);
    this.startFadeIn(15, false);
  };
  Scene_MoongladeOptions.prototype.redraw = function () {
    var b = this._ui.bitmap,
      c = b._context,
      self = this;
    c.clearRect(0, 0, W, H);
    this._buttons = [];
    var rowTop = centeredRows(
      options.length,
      40,
      45,
    );
    options.forEach(function (o, i) {
      var y = rowTop + i * 45,
        active = self._index === i,
        val = o.screen ? Graphics.kudasaiIsFullscreen() : o.toggle ? !!ConfigManager[o.key] : volume(ConfigManager[o.key]);
      // Selection is indicated by the brighter label, without a row rectangle.
      text(c, o.name, 94, y + 30, 20, active ? C.paper : C.muted, "Georgia");
      if (o.resolution) {
        text(c, '‹', 765, y + 30, 20, !Graphics.kudasaiIsFullscreen() && ConfigManager.kudasaiResolution < Graphics.kudasaiResolutionModes().length - 1 ? C.gold : C.muted, 'Arial', 'center');
        text(c, Graphics.kudasaiResolutionLabel(), 965, y + 30, 15, C.paper, 'Arial', 'center');
        text(c, '›', 1175, y + 30, 20, !Graphics.kudasaiIsFullscreen() && ConfigManager.kudasaiResolution > 0 ? C.gold : C.muted, 'Arial', 'center');
      } else if (o.toggle) {
        text(
          c,
          o.screen ? (val ? "PANTALLA COMPLETA" : "VENTANA") : (val ? "ACTIVADO" : "DESACTIVADO"),
          1175,
          y + 30,
          12,
          val ? C.gold : C.muted,
          "Arial",
          "right",
        );
        diamond(c, 935, y + 23, 5, val ? C.gold : "#5d666d");
      } else {
        line(c, SLIDER.left, y + 24, SLIDER.right, y + 24, "#45505a");
        c.fillStyle = C.gold;
        c.fillRect(
          SLIDER.left,
          y + 22,
          ((SLIDER.right - SLIDER.left) * val) / 100,
          3,
        );
        diamond(
          c,
          SLIDER.left + ((SLIDER.right - SLIDER.left) * val) / 100,
          y + 23,
          4,
        );
        text(
          c,
          "−",
          SLIDER.minus,
          y + 31,
          24,
          val === 0 ? "#4d565e" : C.gold,
          "Arial",
          "center",
        );
        text(
          c,
          "+",
          SLIDER.plus,
          y + 31,
          22,
          val === 100 ? "#4d565e" : C.gold,
          "Arial",
          "center",
        );
        text(c, val + " %", 1175, y + 30, 15, C.paper, "Arial", "right");
      }
      region(self, i, 72, y, 1136, 40, function (p) {
        if (!p) {
          self.adjust(i, 1);
          return;
        }
        if (o.resolution) { self.adjust(i, p.x < 960 ? -1 : 1); return; }
        if (o.toggle) {
          if (o.screen || p.x >= 900) self.adjust(i, 0);
          return;
        }
        if (p.x >= SLIDER.minus - 18 && p.x <= SLIDER.minus + 18)
          self.adjust(i, -1);
        else if (p.x >= SLIDER.plus - 18 && p.x <= SLIDER.plus + 18)
          self.adjust(i, 1);
        else if (p.x >= SLIDER.left - 8 && p.x <= SLIDER.right + 8) {
          self._dragIndex = i;
          self.setSlider(i, p.x);
        }
      });
    });
    if (this._message) text(c, this._message, 75, 586, 13, C.gold);
    text(
      c,
      "‹  Guardar y volver",
      88,
      623,
      18,
      this._index === options.length ? C.gold : C.paper,
    );
    region(this, options.length, 72, 595, 270, 40, function () {
      self.saveBack();
    });
    finish(b);
  };
  Scene_MoongladeOptions.prototype.setOption = function (i, value) {
    var o = options[i],
      v = o.toggle ? !!value : volume(value);
    if (o.screen) {
      if (Graphics.kudasaiIsFullscreen() === v) return;
      Graphics.kudasaiSetFullscreen(v);
      AudioManager.playStaticSe(optionAdjustSe);
      this.redraw();
      return;
    }
    if (ConfigManager[o.key] === v) return;
    ConfigManager[o.key] = v;
    try { ConfigManager.save(); }
    catch (e) { this._message = 'No se pudieron guardar las preferencias.'; }
    // One short one-shot per changed value, shared by clicks, keys and dragging.
    // The unchanged-value guard above prevents a sound on every drag frame.
    AudioManager.playStaticSe(optionAdjustSe);
    this.redraw();
  };
  Scene_MoongladeOptions.prototype.setSlider = function (i, x) {
    var fraction = Math.max(
      0,
      Math.min(1, (x - SLIDER.left) / (SLIDER.right - SLIDER.left)),
    );
    this.setOption(i, Math.round(fraction * 10) * 10);
  };
  Scene_MoongladeOptions.prototype.adjust = function (i, dir) {
    var o = options[i];
    if (o.resolution) {
      if (Graphics.kudasaiIsFullscreen()) { AudioManager.playStaticSe(menuErrorSe); return; }
      var count = Graphics.kudasaiResolutionModes().length;
      Graphics.kudasaiSetResolution(Math.max(0, Math.min(count - 1, ConfigManager.kudasaiResolution + (dir < 0 ? 1 : -1))));
      SoundManager.playCursor(); this.redraw(); return;
    }
    var v = o.screen ? Graphics.kudasaiIsFullscreen() : ConfigManager[o.key];
    if (o.toggle) this.setOption(i, dir === 0 ? !v : dir > 0);
    else this.setOption(i, volume(v) + dir * 10);
  };
  Scene_MoongladeOptions.prototype.saveBack = function () {
    try {
      ConfigManager.save();
      back(this);
    } catch (e) {
      this._message =
        "No se pudieron guardar las preferencias. Comprueba el acceso a la carpeta save.";
      this.redraw();
      AudioManager.playStaticSe(menuErrorSe);
    }
  };
  Scene_MoongladeOptions.prototype.update = function () {
    tick(this);
    var screenMode = Graphics.kudasaiIsFullscreen();
    if (this._screenMode !== screenMode) { this._screenMode = screenMode; this.redraw(); }
    if (this._leaving || this.isBusy()) return;
    if (this._dragIndex !== null) {
      if (TouchInput.isPressed()) {
        this._index = this._dragIndex;
        this.setSlider(this._dragIndex, (TouchInput.x * W) / Graphics.width);
        return;
      }
      this._dragIndex = null;
    }
    navigation(this, options.map(function(o, i) { return i; }).concat([options.length]));
    if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
      this.saveBack();
      return;
    }
    if (this._index < options.length) {
      if (Input.isRepeated("left")) this.adjust(this._index, -1);
      if (Input.isRepeated("right")) this.adjust(this._index, 1);
    }
    if (!pointer(this) && Input.isTriggered("ok")) {
      if (this._index < options.length && options[this._index].toggle)
        this.adjust(this._index, 0);
      else activate(this);
    }
  };
  Scene_MoongladeOptions.prototype.terminate = function () {
    terminate(this);
  };
  window.Scene_MoongladeOptions = Scene_MoongladeOptions;
  // Reuse the same options interface when opening options from inside the game.
  Scene_Menu.prototype.commandOptions = function () {
    SceneManager.push(Scene_MoongladeOptions);
  };
})();
