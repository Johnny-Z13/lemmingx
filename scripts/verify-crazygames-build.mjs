import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const provenancePath = join(root, 'docs/assets/crazygames-provenance.json');
const releaseMode = process.argv.includes('--release');
const errors = [];

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return nested.flat();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

const files = await filesUnder(dist);
const relFiles = files.map((path) => relative(dist, path));
const sizes = await Promise.all(files.map(async (path) => (await stat(path)).size));
const bytes = sizes.reduce((total, size) => total + size, 0);
if (!relFiles.includes('index.html')) errors.push('index.html is not at archive root');
if (files.length > 1500) errors.push(`file count ${files.length} exceeds 1500`);
if (bytes >= 20 * 1024 * 1024) errors.push(`uncompressed bytes ${bytes} exceed 20 MB proof budget`);
if (relFiles.some((path) => path.endsWith('.map'))) errors.push('source maps entered the player artifact');
if (!relFiles.includes('THIRD_PARTY_NOTICES.txt')) errors.push('THIRD_PARTY_NOTICES.txt is missing');

const textFiles = files.filter((path) => /\.(html|css|js|txt)$/i.test(path));
const compiledText = (await Promise.all(textFiles.map((path) => readFile(path, 'utf8')))).join('\n');
for (const marker of [
  'Drop Zone',
  'World Kit',
  'PROTOTYPE',
  'Dev Sandbox',
  'Exit Sandbox',
  'Sandbox:',
  'Debug labels',
  'industrial-reskin-v12',
  'PLAYTEST_UNLOCK_ALL_LEVELS',
]) {
  if (compiledText.includes(marker)) errors.push(`player-only marker found: ${marker}`);
}

const html = await readFile(join(dist, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith('/') || /^https?:/i.test(ref)) errors.push(`non-relative HTML reference: ${ref}`);
}
for (const cssPath of files.filter((path) => path.endsWith('.css'))) {
  const css = await readFile(cssPath, 'utf8');
  for (const match of css.matchAll(/url\((['"]?)(.*?)\1\)/g)) {
    const ref = match[2];
    if (ref.startsWith('/') || /^https?:/i.test(ref)) errors.push(`non-relative CSS reference: ${ref}`);
  }
}

const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const inventoriedRuntimePaths = new Set(provenance.assets.flatMap((asset) =>
  String(asset.runtimePath).split(';').map((value) => value.trim()),
));
const publicAssetPaths = (await filesUnder(join(root, 'public/assets')))
  .map((path) => relative(root, path));
for (const path of publicAssetPaths) {
  if (!inventoriedRuntimePaths.has(path)) errors.push(`public runtime asset missing from provenance inventory: ${path}`);
}
for (const asset of provenance.assets) {
  const paths = String(asset.runtimePath).split(';').map((value) => value.trim());
  const declaredRuntimeHash = asset.runtimeHashSha256 ?? asset.originalHashSha256;
  const hashes = typeof declaredRuntimeHash === 'object'
    ? declaredRuntimeHash ?? {}
    : paths.length === 1 ? { [paths[0]]: declaredRuntimeHash } : {};
  for (const path of paths) {
    if (!/^(?:src|public)\/[\w./-]+$/.test(path)) continue;
    const expected = hashes[path];
    if (!expected) continue;
    const actual = sha256(await readFile(join(root, path)));
    if (actual !== expected) errors.push(`stale provenance hash: ${path}`);
  }
}
const unresolved = provenance.assets.filter(({ approvalState }) => approvalState !== 'release-cleared' && approvalState !== 'excluded');
if (releaseMode && unresolved.length > 0) {
  errors.push(`release packaging blocked by ${unresolved.length} unresolved provenance record(s)`);
}

const artifactHash = sha256(Buffer.concat(await Promise.all(
  files
    .map((path) => ({ path, rel: relative(dist, path) }))
    .sort((a, b) => a.rel.localeCompare(b.rel))
    .map(async ({ path, rel }) => Buffer.concat([Buffer.from(`${rel}\0`), await readFile(path)])),
)));
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const worktreeStatus = execFileSync(
  'git',
  ['status', '--porcelain=v1'],
  { cwd: root, encoding: 'utf8' },
).trimEnd();
const metadata = {
  schemaVersion: 1,
  proofOnly: true,
  evidenceScope: worktreeStatus.length > 0 ? 'pre-merge working-tree build' : 'committed candidate build',
  releaseCleared: unresolved.length === 0,
  branch: git(['branch', '--show-current']),
  commit: git(['rev-parse', 'HEAD']),
  dirty: worktreeStatus.length > 0,
  workingTreePaths: worktreeStatus.length > 0
    ? worktreeStatus.split('\n').map((line) => line.slice(3))
    : [],
  fileCount: files.length,
  uncompressedBytes: bytes,
  artifactSha256: artifactHash,
  unresolvedProvenance: unresolved.map(({ id, approvalState }) => ({ id, approvalState })),
  checks: errors.length === 0 ? 'pass' : 'fail',
};
await mkdir(join(root, '.artifacts/crazygames-candidate'), { recursive: true });
await writeFile(
  join(root, '.artifacts/crazygames-candidate', releaseMode ? 'release-gate.json' : 'proof-metadata.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
);

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  console.log(`PASS CrazyGames ${releaseMode ? 'release' : 'proof'} artifact: ${files.length} files, ${bytes} bytes`);
  console.log(`Artifact SHA-256: ${artifactHash}`);
  if (unresolved.length > 0) console.log(`Proof-only: ${unresolved.length} provenance record(s) remain unresolved`);
}
