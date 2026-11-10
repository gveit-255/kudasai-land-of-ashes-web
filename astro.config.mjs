import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), [
  'SITE_',
  'PUBLIC_DOWNLOAD_',
]);

// Pages must receive these values before Astro generates the static HTML.
if (process.env.CF_PAGES === '1') {
  const required = ['PUBLIC_DOWNLOAD_PC', 'PUBLIC_DOWNLOAD_ANDROID'];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      '[Kudasai] Faltan variables de compilación: ' +
        missing.join(', ') +
        '. Configúralas en Cloudflare Pages para el entorno de este despliegue y vuelve a compilar.',
    );
  }
  console.info('[Kudasai] Variables de descarga disponibles: PC y Android.');
}
const site = process.env.SITE_URL || env.SITE_URL || process.env.CF_PAGES_URL;
if (site && !['http:', 'https:'].includes(new URL(site).protocol)) {
  throw new Error('SITE_URL debe ser una URL HTTP o HTTPS válida.');
}

export default defineConfig({
  site,
  output: 'static',
  compressHTML: true,
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  vite: { build: { sourcemap: false } },
});
