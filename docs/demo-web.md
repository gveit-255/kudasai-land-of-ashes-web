# Demo web de Kudasai

La ruta `/jugar/` contiene el reproductor Astro; la exportación HTML5 de RPG Maker MV vive en `public/demo/` y se copia a `dist/demo/` al compilar. La portada enlaza a «Jugar demo» sin descargar scripts, mapas, audio ni texturas del motor. El iframe se crea únicamente al pulsar Jugar. Sin JavaScript en el reproductor, el enlace abre el juego directamente.

## Ejecutar y publicar

```sh
npm ci
npm run dev
npm run validate
```

Abrir `/jugar/`. En Cloudflare Pages: `npm run build`, directorio `dist`, Node según `.node-version`. Los assets de `public/demo` forman parte del proyecto: el build en Cloudflare **no necesita acceso al proyecto de RPG Maker ni a una ruta de Windows**. No subir `save/`, Game.exe, claves, carpetas de trabajo ni NW.js.

## Actualizar desde el proyecto editable

```sh
npm run demo:export -- "C:\ruta\al\proyecto RPG Maker MV"
npm run validate
```

También se puede definir `KUDASAI_GAME_SOURCE`. El exportador usa una lista de carpetas de recursos; no copia partidas, herramientas ni documentos. Conserva datos y plugins activos byte por byte, comprueba los hashes de las fuentes antes/después y genera `public/demo/manifest.json`. Solo sustituye archivos dentro de su destino fijo y retira archivos obsoletos enumerados en su manifiesto anterior. No modifica el proyecto editable ni ejecuta el despliegue Windows/cifrado.

Se excluyen fondos históricos de `parallaxes`, `titles1` y `titles2` sin referencia en los datos o código activo. Las familias de puertas y parque, cuyos nombres se componen dinámicamente, se incluyen completas. Las demás familias se conservan de forma preventiva. Al añadir una nueva familia dinámica, actualizar `dynamicFamilies` en `scripts/export-demo.mjs` y revisar en navegador todos los mapas afectados.

## Adaptaciones exclusivas del navegador

`src/features/demo/game-runtime.js` se copia como `web-runtime.js` y se instala al arrancar MV, después de los plugins originales:

- Partidas y configuración con prefijo estable `Kudasai:WebDemo:v1:` en localStorage; sin importar partidas Windows ni otros juegos MV del mismo dominio.
- Audio Ogg o M4A según capacidad del navegador; desbloqueo mediante gesto y botón Activar sonido.
- Salir vuelve al reproductor; pantalla completa mediante el botón o F4, siempre con gesto del usuario.
- La simulación se pausa al ocultar la pestaña y se reanuda al regresar.
- Mensajes de arranque/error/salida con validación de origen y ventana del iframe.

No hay backend, guardado en la nube, service worker ni descarga completa anticipada. Combate diseñado para teclado; no se afirma compatibilidad táctil completa. Cerrar el iframe libera el motor, sus animaciones y el audio.

## Verificación

`npm run validate` comprueba formato, ESLint, tipos Astro, build, presupuestos de JavaScript de la landing y reproductor por separado, referencias, manifiesto y hashes de la demo, ausencia de archivos de desarrollo/partidas, límite de 25 MiB por archivo y menos de 20.000 archivos. Verificar además en navegador: portada sin peticiones al motor, inicio de partida, prólogo, mapas, audio, menús, guardar/cargar, pantalla completa y volver a la web. Guardado ligado al dominio: usar un dominio estable para conservar partidas entre despliegues.

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
