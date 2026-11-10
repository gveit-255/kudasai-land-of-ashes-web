import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'SITE_');
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
