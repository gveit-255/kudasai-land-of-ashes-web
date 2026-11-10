# Kudasai: Land of Ashes

Web oficial del juego, construida con **Astro 7, TypeScript estricto y CSS modular**. Salida estática para **Cloudflare Pages**, imágenes procesadas con `astro:assets` e interacciones nativas sin framework cliente.

## Abrir en VS Code

Abrir esta carpeta mediante **File → Open Folder**. Las extensiones de Astro, ESLint y Prettier se pueden instalar desde VS Code; no se necesitan carpetas de configuración adicionales.

Requiere **Node 24 LTS**, versión fijada en `.nvmrc` y `.node-version`. El Node 22.14 global de este equipo es anterior al mínimo de Astro: actualizarlo o usar temporalmente `INICIAR-WEB.ps1 -Desarrollo`, que detecta el Node 24 del runtime de Codex si está disponible.

```sh
npm ci
npm run dev
```

Abrir la dirección que imprima Astro, normalmente `http://localhost:4321`. El desarrollo utiliza los archivos de `src/`; `dist/` es generado. La entrada HTML autónoma de la entrega anterior ya no forma parte del flujo de desarrollo.

## Comandos

| Comando             | Uso                                                     |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Desarrollo y recarga automática                         |
| `npm run build`     | Compilación estática en `dist/`                         |
| `npm run preview`   | Revisar la compilación                                  |
| `npm run check`     | Tipos y diagnósticos de Astro                           |
| `npm run lint`      | ESLint para Astro, TypeScript y JavaScript              |
| `npm run format`    | Formato con Prettier y su plugin de Astro               |
| `npm run validate`  | Formato, lint, tipos, build y comprobación de la salida |
| `npm run pages:dev` | Revisar la salida usando Wrangler Pages                 |
| `npm run deploy`    | Validar y desplegar en tu cuenta de Cloudflare Pages    |

## Estructura

```text
src/
  assets/images/        # Imágenes y catálogo con metadatos de Astro
  components/
    layout/             # Cabecera y pie
    sections/           # Hero, historia, mundo, personajes, galería y cierre
    ui/                 # Componentes compartidos
  config/               # Identidad y navegación
  features/
    gallery/            # Datos tipados, visor, filtros y reproductor
    motion/             # Animaciones y política de movimiento
    navigation/         # Menú móvil
  layouts/              # Documento y SEO
  lib/                  # Funciones reutilizables
  pages/                # Rutas y endpoints estáticos
  styles/               # Reset, tokens y estilos base
public/media/           # Fondos de pantalla y metadatos sociales
scripts/                # Verificación y conversión opcional de medios
docs/                   # Arquitectura, movimiento y despliegue
wrangler.jsonc          # Configuración de Pages
```

## Cloudflare Pages

Crear un proyecto **Pages**, conectar el repositorio y seleccionar **Astro**, comando **`npm run build`**, salida **`dist`**. Configurar `SITE_URL` con el dominio definitivo. Cambiar `name` en `wrangler.jsonc` si el nombre de Pages es diferente. No se necesita adaptador de servidor para esta web estática.

La configuración y los pasos completos están en [docs/cloudflare-pages.md](docs/cloudflare-pages.md), conforme a la [guía de Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/).

## Animaciones y edición

La portada se descubre con una apertura por capas; los personajes presentan imagen, nombre y texto de forma escalonada. Hay parallax de escritorio, fondos que respiran al estar en vista y entradas por partes para las secciones. Se puede pausar desde la cabecera y se respeta `prefers-reduced-motion`. La galería contiene cinco capturas del juego y seis ilustraciones, con filtros y ampliación.

- [Arquitectura y dónde editar cada cosa](docs/architecture.md)
- [Movimiento, accesibilidad y medios](docs/motion.md)
- [Despliegue en Cloudflare Pages](docs/cloudflare-pages.md)

Los recursos del juego se conservan. Las conversiones de medios no son necesarias para instalar o desplegar el proyecto.

## Demo jugable

La demo está integrada en `/jugar/` y se carga al pulsar Jugar. La exportación de `public/demo/` se despliega junto a Astro. Para actualizarla y conocer el guardado local y las adaptaciones de navegador, consultar [docs/demo-web.md](docs/demo-web.md). No necesita servidor de juego ni NW.js.

## Estética sakura

La paleta rosa y lavanda se define en `src/styles/tokens.css`; `src/styles/kawaii.css` reúne las superficies, botones y detalles visuales del tema. Los motivos de sakura son SVG estáticos y los rótulos japoneses decorativos usan el idioma `ja`. Nunito se aloja localmente en WOFF2 (39 KB, pesos 400–800, `font-display: swap`); su licencia está en `public/Nunito-OFL.txt`. No hay fuentes remotas ni JavaScript adicional para el tema.
