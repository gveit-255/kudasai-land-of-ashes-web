# Desplegar en Cloudflare Pages

La web es estática. Sigue la [guía de Astro de Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) con `npm run build` y salida `dist`. Se conserva Pages como destino solicitado; no se ha publicado ni accedido a una cuenta.

## Opción recomendada: repositorio Git

1. Crear un repositorio que contenga **esta carpeta del proyecto**, con `package.json` en la raíz. Incluir `public/demo/`, que contiene la exportación web. No subir `node_modules`, `dist`, `.env`, carpetas de prueba ni el proyecto editable de RPG Maker.
2. En Cloudflare: Workers & Pages → Create application → Pages → Import an existing Git repository.
3. Elegir el repositorio y configurar:

| Campo                  | Valor                                                    |
| ---------------------- | -------------------------------------------------------- |
| Framework preset       | Astro                                                    |
| Production branch      | La rama principal del repositorio, por ejemplo `main`    |
| Root directory         | Vacío si esta carpeta es la raíz del repositorio         |
| Build command          | `npm run build`                                          |
| Build output directory | `dist`                                                   |
| Node                   | `24.22.1` (también fijado en `.nvmrc` y `.node-version`) |

4. Cambiar `name` en `wrangler.jsonc` si el proyecto Pages tiene otro nombre.
5. Configurar `SITE_URL` con el dominio real (por ejemplo el `pages.dev` asignado o el dominio propio). Permite generar canonical, Open Graph y sitemap absolutos. Sin `SITE_URL`, se utiliza `CF_PAGES_URL` cuando Cloudflare lo proporciona.
6. Save and Deploy. Los siguientes commits dispararán nuevas compilaciones. Ejecutar `npm run validate` antes de enviar cambios al repositorio.

No añadir `@astrojs/cloudflare` para esta salida estática: el adaptador se utiliza cuando hay renderizado de servidor. Si en el futuro se añade backend, revisar la compatibilidad actual de Astro y Pages/Workers antes de cambiar `output`.

## Opción CLI

Requiere iniciar sesión en la cuenta que publicará el proyecto:

```sh
npx wrangler login
npm run deploy
```

El comando valida y compila antes de ejecutar `wrangler pages deploy dist`. El nombre configurado en `wrangler.jsonc` debe coincidir con tu proyecto Pages. El inicio de sesión y el despliegue los realiza el usuario; no hay credenciales guardadas en el código.

Para probar el resultado con el servidor local de Pages:

```sh
npm run pages:dev
```

## Comprobaciones incluidas

- Un único H1, metadatos, imágenes prioritarias/diferidas y enlaces internos válidos.
- Los recursos referenciados existen y la galería conserva sus once imágenes.
- La galería no incluye reproductor ni filtro de vídeos.
- JavaScript por debajo de 10 KB sin comprimir en la portada y en el reproductor, medidos por separado. El motor MV solo se descarga después de pulsar Jugar.
- Cada archivo por debajo de 25 MiB y menos de 20.000 archivos.
- `404.html`, `_headers`, `robots.txt`, `sitemap.xml`, `/jugar/` y `/demo/` presentes.
- Manifiesto y hashes de todos los recursos de la demo válidos, sin partidas ni archivos Windows.

La demo se integra según [demo-web.md](demo-web.md). El paquete conserva los recursos necesarios como archivos estáticos; no se necesita un backend de juego ni un adaptador SSR. Las cabeceras de `/demo/*` permiten revalidar los recursos después de actualizar la demo.

Las [cabeceras de Pages](https://developers.cloudflare.com/pages/configuration/headers/) dan caché inmutable a los recursos hash en `/_astro/` y caché semanal a los medios. Al reemplazar un medio que conserve nombre, cambiar su nombre o purgar la caché. Los [límites oficiales](https://developers.cloudflare.com/pages/platform/limits/) se comprueban en la salida de build, no en la carpeta de dependencias.
