import assert from 'node:assert/strict';
import { readFile, access, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
assert.match(html, /<html lang="es"/);
assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'One primary heading');
assert.match(html, /name="description"/);
assert.match(html, /fetchpriority="high"/);
assert.match(html, /loading="lazy"/);
assert.match(html, /aria-modal|<dialog/);
assert(!html.includes('localhost') && !html.includes('C:\\'), 'No development paths in output');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const fragments = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
fragments.forEach((fragment) => assert(ids.has(fragment), `Missing anchor #${fragment}`));

const urls = new Set(
  [...html.matchAll(/(?:src|href|data-download)="(\/[^"#]*)"/g)].map((match) => match[1]),
);
for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  match[1].split(',').forEach((candidate) => urls.add(candidate.trim().split(' ')[0]));
}
for (const url of urls) await access(resolve(dist, '.' + url));
const files = await readdir(resolve(dist, '_astro'));
const cssFiles = files.filter((file) => file.endsWith('.css'));
const jsFiles = [...html.matchAll(/<script\b[^>]*src="\/_astro\/([^"]+\.js)"/g)].map(
  (match) => match[1],
);
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n');
const jsBytes =
  Buffer.byteLength(inlineScripts) +
  (
    await Promise.all(jsFiles.map(async (file) => (await stat(resolve(dist, '_astro', file))).size))
  ).reduce((a, b) => a + b, 0);
const playerHTML = await readFile(resolve(dist, 'jugar/index.html'), 'utf8');
const playerScripts = [...playerHTML.matchAll(/<script\b[^>]*src="\/_astro\/([^"]+\.js)"/g)].map(
  (match) => match[1],
);
const playerInline = [...playerHTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('');
const playerJavaScriptBytes =
  Buffer.byteLength(playerInline) +
  (
    await Promise.all(
      playerScripts.map(async (file) => (await stat(resolve(dist, '_astro', file))).size),
    )
  ).reduce((sum, size) => sum + size, 0);
assert(playerJavaScriptBytes < 10_000, 'Player shell stays below 10 KB of JavaScript');
assert(jsBytes < 10_000, `JavaScript exceeded 10 KB: ${jsBytes}`);
assert(!html.includes('<iframe'), 'No third-party video embeds at first load');
assert(!/<video\b/.test(html), 'Gallery must not include a video player');
assert(!html.includes('data-filter="movimiento"'), 'Removed motion filter must stay absent');
assert.equal(
  (html.match(/class="gallery-item"/g) ?? []).length,
  11,
  'Gallery contains eleven images',
);
const deployedFiles = await readdir(dist, { recursive: true, withFileTypes: true });
let largestAssetBytes = 0;
for (const entry of deployedFiles.filter((entry) => entry.isFile())) {
  const size = (await stat(resolve(entry.parentPath, entry.name))).size;
  assert(size < 25 * 1024 * 1024, `Asset exceeds Cloudflare Pages limit: ${entry.name}`);
  largestAssetBytes = Math.max(largestAssetBytes, size);
}
assert(deployedFiles.filter((entry) => entry.isFile()).length < 20_000, 'Too many Pages files');
await access(resolve(dist, '_headers'));
await access(resolve(dist, 'robots.txt'));
await access(resolve(dist, 'sitemap.xml'));
const result = {
  status: 'passed',
  htmlBytes: Buffer.byteLength(html),
  htmlGzipBytes: gzipSync(html).length,
  clientJavaScriptBytes: jsBytes,
  playerJavaScriptBytes,
  cssBytes: (
    await Promise.all(
      cssFiles.map(async (file) => (await stat(resolve(dist, '_astro', file))).size),
    )
  ).reduce((a, b) => a + b, 0),
  checkedAssetURLs: urls.size,
  checkedAnchors: fragments.length,
  largestAssetBytes,
  pages: ['index.html', '404.html', 'jugar/index.html', 'demo/index.html'],
};
// Reports are opt-in; validation never restores deleted project folders.
const reportFile = process.argv[2];
if (reportFile) await writeFile(resolve(reportFile), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
