import { readFile, writeFile, readdir, mkdir, copyFile, unlink } from 'node:fs/promises';
import { resolve, relative, dirname, extname, basename, sep } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const sourceArgument = process.argv[2] || process.env.KUDASAI_GAME_SOURCE;
if (!sourceArgument)
  throw new Error('Uso: npm run demo:export -- "ruta a la exportación web cifrada"');
const source = resolve(sourceArgument);
const output = resolve(root, 'public/demo');
if (source === root || source.startsWith(root + sep) || root.startsWith(source + sep)) {
  throw new Error('El proyecto editable y la web deben estar en carpetas independientes.');
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos: ' + path);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return groups.flat().sort();
}
const pluginText = await readFile(resolve(source, 'js/plugins.js'), 'utf8');
const pluginContext = {};
vm.runInNewContext(pluginText, pluginContext, { timeout: 1000 });
const plugins = pluginContext.$plugins;
if (!Array.isArray(plugins)) throw new Error('Lista de plugins no válida.');
const system = JSON.parse(await readFile(resolve(source, 'data/System.json'), 'utf8'));
const key = createHash('md5').update('ClaveSecreta99', 'utf8').digest('hex');
if (!system.hasEncryptedImages || !system.hasEncryptedAudio || system.encryptionKey !== key) {
  throw new Error('Selecciona la exportación HTML5 cifrada con ClaveSecreta99, carpeta Navegador.');
}
const dataFiles = await walk(resolve(source, 'data'));
const scriptFiles = await walk(resolve(source, 'js'));
const activeNames = new Set(
  plugins.filter((plugin) => plugin.status).map((plugin) => plugin.name + '.js'),
);
const runtimeScripts = scriptFiles.filter(
  (file) =>
    !relative(source, file).replaceAll('\\', '/').startsWith('js/plugins/') ||
    activeNames.has(basename(file)),
);
const corpus = (
  await Promise.all([...dataFiles, ...runtimeScripts].map((file) => readFile(file, 'utf8')))
).join('\n');
// These two families are assembled at runtime rather than named as whole literals.
// All other image families are retained conservatively, including native MV defaults.
const dynamicFamilies = ['Kudasai_Casas_Puerta_', 'Kudasai_Parque_'];
const assets = (
  await Promise.all(
    ['img', 'audio', 'fonts', 'icon', 'movies'].map((folder) => walk(resolve(source, folder))),
  )
).flat();
const excluded = [];
const selected = assets.filter((file) => {
  const path = relative(source, file).replaceAll('\\', '/');
  const stem = basename(file, extname(file));
  const historicalFamily = /^img\/(parallaxes|titles1|titles2)\//.test(path);
  const keep =
    !historicalFamily ||
    corpus.includes(stem) ||
    dynamicFamilies.some((prefix) => stem.startsWith(prefix));
  if (!keep) excluded.push(path);
  return keep;
});
const sourceFiles = [
  ...new Set([...dataFiles, ...runtimeScripts, ...selected, resolve(source, 'index.html')]),
].sort();
// Snapshot every source resource before copying. Verify again after export.
const fingerprints = new Map();
for (const file of sourceFiles) {
  const bytes = await readFile(file);
  if (bytes.length > 25 * 1024 * 1024)
    throw new Error('Archivo superior al límite de Pages: ' + relative(source, file));
  fingerprints.set(file, sha256(bytes));
}
const manifestPath = resolve(output, 'manifest.json');
let previous;
try {
  previous = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (previous && previous.format !== 'kudasai-web-demo-v1')
  throw new Error('La carpeta de destino no pertenece al exportador.');
const entries = [];
for (const file of sourceFiles.filter((file) => basename(file) !== 'index.html')) {
  const path = relative(source, file).replaceAll('\\', '/');
  const bytes = await readFile(file);
  if (bytes.length > 25 * 1024 * 1024)
    throw new Error('Archivo superior al límite de Pages: ' + path);
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
  entries.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
let html = await readFile(resolve(source, 'index.html'), 'utf8');
html = html
  .replace('<html>', '<html lang="es">')
  .replace(
    'content="user-scalable=no"',
    'content="width=device-width, initial-scale=1, viewport-fit=cover"',
  )
  .replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>')
  .replace(
    '<script type="text/javascript" src="js/main.js"></script>',
    '<script src="web-performance.js"></script>\n<script src="web-runtime.js"></script>\n<script type="text/javascript" src="js/main.js"></script>',
  );
if (!html.includes('src="web-runtime.js"'))
  throw new Error('No se encontró el punto de entrada esperado de MV.');
for (const [path, bytes] of [
  ['index.html', html],
  ['web-runtime.js', await readFile(resolve(root, 'src/features/demo/game-runtime.js'), 'utf8')],
  [
    'web-performance.js',
    await readFile(resolve(root, 'src/features/demo/game-performance.js'), 'utf8'),
  ],
]) {
  await writeFile(resolve(output, path), bytes);
  entries.push({ path, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) });
}
const currentPaths = new Set(entries.map((entry) => entry.path));
for (const entry of previous?.files ?? []) {
  const stale = resolve(output, entry.path);
  if (!stale.startsWith(output + sep)) throw new Error('Ruta de manifiesto no válida.');
  if (!currentPaths.has(entry.path))
    await unlink(stale).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
}
for (const [file, hash] of fingerprints) {
  if (sha256(await readFile(file)) !== hash)
    throw new Error('Cambió un archivo fuente durante la exportación: ' + file);
}
const manifest = {
  format: 'kudasai-web-demo-v1',
  title: system.gameTitle,
  exportedAt: new Date().toISOString(),
  startMapId: system.startMapId,
  sourceUnchanged: true,
  encryption: 'RPG Maker MV',
  encryptedImages: entries.filter((entry) => entry.path.endsWith('.rpgmvp')).length,
  encryptedAudio: entries.filter((entry) => /\.rpgmv[om]$/.test(entry.path)).length,
  bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  excludedHistoricalAssets: excluded,
  activePlugins: plugins.filter((plugin) => plugin.status).map((plugin) => plugin.name),
  files: entries,
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      files: entries.length,
      MiB: +(manifest.bytes / 1024 ** 2).toFixed(1),
      excludedHistoricalAssets: excluded.length,
      sourceUnchanged: true,
    },
    null,
    2,
  ),
);
