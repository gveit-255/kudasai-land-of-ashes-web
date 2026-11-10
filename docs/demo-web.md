# Demo web de Kudasai

La ruta `/jugar/` contiene el reproductor Astro; la exportación HTML5 de RPG Maker MV vive en `public/demo/` y se copia a `dist/demo/` al compilar. La portada enlaza a «Jugar demo» sin descargar scripts, mapas, audio ni texturas del motor. El iframe se crea únicamente al pulsar Jugar. Sin JavaScript en el reproductor, el enlace abre el juego directamente.

## Ejecutar y publicar

```sh
npm ci
npm run dev
npm run validate
```

Abrir `/jugar/`. En Cloudflare Pages: `npm run build`, directorio `dist`, Node según `.node-version`. Los assets de `public/demo` forman parte del proyecto: el build en Cloudflare **no necesita acceso al proyecto de RPG Maker ni a una ruta de Windows**. No subir `save/`, Game.exe, claves, carpetas de trabajo ni NW.js.

## Actualizar desde la versión web cifrada

```sh
npm run demo:export -- "C:\ruta\a\Kudasai-Multiplataforma-20261110\Navegador"
npm run validate
```

También se puede definir `KUDASAI_GAME_SOURCE`. La fuente debe ser la carpeta HTML5 `Navegador` cifrada con el formato nativo MV y `ClaveSecreta99`. El exportador verifica flags/clave y conserva los recursos cifrados; no vuelve a cifrarlos ni modifica las fuentes. Usa una lista de carpetas de recursos, sin copiar partidas, herramientas ni documentos. Conserva datos y plugins activos byte por byte, comprueba hashes antes/después y genera `public/demo/manifest.json`, con recuentos de imágenes/audio cifrados. Retira archivos obsoletos enumerados en el manifiesto anterior, incluidas las antiguas copias PNG/OGG/M4A sin cifrar. Los originales editables del juego permanecen intactos.

Se excluyen fondos históricos de `parallaxes`, `titles1` y `titles2` sin referencia en los datos o código activo. Las familias de puertas y parque, cuyos nombres se componen dinámicamente, se incluyen completas. Las demás familias se conservan de forma preventiva. Al añadir una nueva familia dinámica, actualizar `dynamicFamilies` en `scripts/export-demo.mjs` y revisar en navegador todos los mapas afectados.

## Adaptaciones exclusivas del navegador

`src/features/demo/game-runtime.js` se copia como `web-runtime.js` y se instala al arrancar MV, después de los plugins originales:

- Partidas y configuración con prefijo estable `Kudasai:WebDemo:v1:` en localStorage; sin importar partidas Windows ni otros juegos MV del mismo dominio.
- Audio Ogg o M4A según capacidad del navegador; desbloqueo mediante gesto y botón Activar sonido.
- Salir vuelve al reproductor; pantalla completa mediante el botón o F4, siempre con gesto del usuario.
- La simulación se pausa al ocultar la pestaña y se reanuda al regresar.
- Mensajes de arranque/error/salida con validación de origen y ventana del iframe.

No hay backend, guardado en la nube, service worker ni descarga completa anticipada. La versión del 10/11/2026 incluye el plugin táctil de la exportación: cruceta de ocho direcciones, ataque/habilidad/dash/selector y Aceptar/Menú. Conserva Q/W/E/R, correr siempre, velocidad +10 %, dash de cuatro pasos con animación de Loussiana, movimiento diagonal por teclado y destino por clic/toque. Se conserva el prefijo de guardado anterior para que la actualización siga viendo las partidas del mismo dominio. Cerrar el iframe libera el motor, sus animaciones y el audio.

## Verificación

`npm run validate` comprueba formato, ESLint, tipos Astro, build, presupuestos de JavaScript de la landing y reproductor por separado, referencias cifradas, cabeceras RPGMV, ausencia de duplicados sin cifrar, manifiesto/hashes, ausencia de archivos de desarrollo/partidas, límite de 25 MiB por archivo y menos de 20.000 archivos. `Window.png` y `Loading.png`, iconos y GIF conservan sus excepciones nativas. Verificar además en navegador: portada sin peticiones al motor, inicio de partida, prólogo, mapas, audio, menús, guardar/cargar, pantalla completa y volver a la web. Guardado ligado al dominio: usar un dominio estable para conservar partidas entre despliegues.

## Modos claro y oscuro

El selector de luna/sol está en la cabecera, el reproductor y la página 404. Sin preferencia explícita se sigue el tema del sistema; la selección se recuerda en `localStorage` bajo `kudasai:theme` y se sincroniza entre pestañas. Un pequeño script anterior al pintado aplica la preferencia para evitar destellos de tema claro. Si el almacenamiento no está disponible, el selector sigue funcionando durante la visita. El modo oscuro conserva Nunito, formas redondeadas, pétalos, imágenes y acentos rosa/lavanda; usa fondos ciruela y superficies suaves, sin alterar los colores del juego dentro del iframe.

Referencias: [exportación web MV](https://rpgmakerofficial.com/product/MV_Help/page/01_11_04.html), [límites Pages](https://developers.cloudflare.com/pages/platform/limits/).

## Objetivo de 60 FPS

`src/features/demo/game-performance.js` se exporta como `web-performance.js` y se instala después de los plugins, antes de arrancar MV. Los originales del juego editable y los plugins de la exportación se conservan; la adaptación se aplica en memoria.

- Framebuffer de 1280 × 720 en lugar del valor de escritorio de 1920 × 1080: 55,6 % menos píxeles por fotograma. El escalado CSS y las coordenadas lógicas permanecen iguales.
- Un único `requestAnimationFrame` pendiente, cancelado al detener la simulación. Reanudar no crea bucles paralelos.
- Cadencia objetivo de 60 actualizaciones/renderizados por segundo en monitores de mayor frecuencia; se conserva el paso lógico original de MV de 1/60. No se acelera el combate ni el movimiento.
- Se evita el `gl.flush()` explícito de MV y su mecanismo antiguo que omitía entre uno y tres dibujos después de un render lento. No se eliminan luces, agua, partículas ni animaciones.

Para medir, abrir `/demo/index.html?rendimiento=1`. El contador cuenta fotogramas realmente dibujados, pasos de simulación, coste de CPU y resolución; está oculto en el uso normal. El perfil de comparación anterior se abre con `/demo/index.html?rendimiento=1&perfil=original`. Comparar una sola pestaña activa a la vez, el mismo escenario y al menos diez segundos después de cargar recursos. No comparar mediciones de pestañas en segundo plano ni de ventanas ocultas. Estos parámetros no cambian el guardado ni envían datos a servicios externos.

`verify-performance.mjs` simula pantallas de 60, 120 y 144 Hz: en diez segundos obtiene 601 renderizados (incluido el inicial) y 600 pasos de simulación. También comprueba que detener/reanudar no duplica callbacks ni redimensiona repetidamente el framebuffer. Estas pruebas verifican la cadencia, no garantizan el rendimiento de cada GPU.

La medición visual real de esta revisión quedó interrumpida al no poder verificar el control de equipo la URL de Chrome. No hay un resultado de 60 FPS reales certificado en el equipo. El objetivo depende del coste de cada escenario, del navegador y de la capacidad del dispositivo; el contador permite comprobarlo sin confundir fotogramas dibujados con frecuencia de simulación.

Referencia técnica: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
