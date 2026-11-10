# Arquitectura

Proyecto Astro estático con el motor del juego aislado en una exportación HTML5 que se carga bajo demanda. `src/pages/index.astro` compone la página; el contenido existe en HTML antes de ejecutar JavaScript.

| Directorio                | Responsabilidad                                                         |
| ------------------------- | ----------------------------------------------------------------------- |
| `src/pages`               | Rutas, página 404 y endpoints prerenderizados de robots/sitemap.        |
| `src/layouts`             | Documento HTML, metadatos y política global de movimiento.              |
| `src/components/layout`   | Cabecera y pie comunes.                                                 |
| `src/components/sections` | Secciones editoriales de la portada; cada una importa su CSS.           |
| `src/components/ui`       | Primitivas compartidas como `ResponsiveImage`.                          |
| `src/features/gallery`    | Catálogo tipado, tarjetas, visor, filtros y reproducción.               |
| `src/features/navigation` | Estado del menú móvil y sus estilos.                                    |
| `src/features/motion`     | Política de movimiento, entradas al hacer scroll y ambiente de portada. |
| `src/assets/images`       | Imágenes importadas y procesadas mediante `astro:assets`.               |
| `src/config`              | Identidad y navegación compartidas.                                     |
| `src/lib`                 | Funciones pequeñas reutilizables, sin estado global mutable.            |
| `src/styles`              | Tokens, reset, tipografía y utilidades de composición.                  |
| `public/media`            | Fondos de pantalla y metadatos sociales.                                |
| `scripts`                 | Validación de la compilación y conversión opcional de medios.           |

## Decisiones

- HTML estático para Cloudflare Pages. No se necesita un adaptador de servidor para esta web.
- Sin React, hidratación ni librería de animación. Las interacciones usan Custom Elements y APIs nativas.
- Cada controlador registra eventos en `connectedCallback()` y los libera con `AbortController` al desconectarse. Los observadores y animaciones también se limpian.
- Los módulos de la galería y navegación se importan desde sus propios componentes; el layout solo registra el movimiento global.
- Los estilos de secciones están separados por responsabilidad. Las capas CSS fijan el orden de reset, tokens, base, componentes, movimiento y responsive.
- El catálogo de imágenes de la galería está tipado. Los filtros y contadores salen de ese catálogo.
- `astro:assets` conoce las dimensiones de las imágenes y genera variantes con nombres hash. Las imágenes secundarias se cargan de forma diferida.
- El alias `@/` apunta a `src/`; no depende de rutas locales ni del repositorio del juego.
- Las versiones directas y el lockfile se fijan. `minimatch` se resuelve en 11.0.5 mediante `overrides` para corregir el aviso de amplificación de globs del árbol de ESLint; volver a evaluar al actualizar el linter.

## Cambios habituales

Añadir una escena en `src/features/gallery/gallery.data.ts`; colocar la imagen en `src/assets/images` y registrarla en su `index.ts`. `npm run validate` comprueba tipos, estilo, referencias, presupuestos y límites de Pages.

Los textos comunes viven en `src/config/site.ts`. Los textos de cada sección se editan en su componente Astro. Las medidas y colores globales están en `src/styles/tokens.css`.

## Demo jugable

`src/pages/jugar.astro` compone el reproductor con `src/features/demo/DemoPlayer.astro`, su controlador TypeScript y sus estilos. El motor MV no se importa desde la landing. `scripts/export-demo.mjs` prepara `public/demo/` desde el proyecto editable; `game-runtime.js` aplica las adaptaciones exclusivas del navegador en la copia exportada. `scripts/verify-demo.mjs` verifica el manifiesto, los hashes y las adaptaciones de guardado, audio y salida. Detalle en [demo-web.md](demo-web.md).

El orden de capas CSS se declara al principio del `<head>` en `BaseLayout.astro`, antes de los estilos de las páginas. Esto conserva la prioridad de las reglas responsive aunque Astro divida los estilos de página y layout en archivos distintos.
