import { createHash } from 'node:crypto';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const inventoryPath = path.join(root, 'docs/assets/crazygames-provenance.json');
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return (await stat(path.join(root, relativePath))).isFile();
  } catch {
    return false;
  }
}

async function hashesFor(relativePaths) {
  return Object.fromEntries(await Promise.all(relativePaths.map(async (relativePath) => [
    relativePath,
    hash(await readFile(path.join(root, relativePath))),
  ])));
}

inventory.game = 'Swarmwright (working title; repository LemmingX)';
inventory.scope = 'Single production artifact for direct/Vercel and CrazyGames launches plus submission media';
inventory.reviewDate = '2026-08-18';
inventory.releaseClaim = 'blocked-pending-human-clearance';
inventory.releaseBlockers = [
  'Human name and trademark clearance for the working title Swarmwright.',
  'Human originality and commercial-rights review for AI-assisted runtime and cover artwork.',
  'Human originality and commercial-rights review for the generated crew and terrain-tool icon families.',
  'Human review of repository-authored procedural visual and audio families before public submission.',
];

const mediaRecords = [
  {
    id: 'swarmwright-crazygames-covers',
    runtimePath: [
      'marketing/crazygames/source/swarmwright-cover-landscape-master.png',
      'marketing/crazygames/source/swarmwright-cover-portrait-master.png',
      'marketing/crazygames/source/swarmwright-cover-square-master.png',
      'marketing/crazygames/covers/swarmwright-cover-landscape.png',
      'marketing/crazygames/covers/swarmwright-cover-portrait.png',
      'marketing/crazygames/covers/swarmwright-cover-square.png',
    ].join('; '),
    assetType: 'submission-cover-family/png',
    dimensions: 'masters 1672x941, 1024x1536, 1254x1254; deliverables 1920x1080, 800x1200, 800x800',
    source: 'AI-assisted original cover masters generated from this repository’s own gameplay reference frames',
    creator: 'OpenAI built-in image generation with Z13Labs/Codex direction; deterministic title compositor',
    sourceUrl: null,
    sourceReferences: [
      'marketing/crazygames/source/prompts.md',
      'scripts/build-crazygames-covers.mjs',
      '.artifacts/crazygames-candidate/browser/desktop-907x510-first-command.png',
    ],
    licenceOrTermsStatus: 'Generated-output terms apply; human originality, brand-confusion, and commercial-rights review remains required',
    generation: {
      prompt: 'Exact landscape, portrait, and square prompts retained in marketing/crazygames/source/prompts.md',
      promptRecordStatus: 'exact',
      model: 'OpenAI built-in image generation; exact backend model identifier not exposed',
      seed: null,
      settings: {
        outputIdentifiers: [
          'exec-46ed83eb-ef2c-47c6-8ed9-e103ef74aced.png',
          'exec-e89aade6-e719-4721-bcf2-6befae1996d5.png',
          'exec-a7a91c93-0381-4061-a8ce-0b3327600d7a.png',
        ],
      },
    },
    transformations: [
      'Exact SWARMWRIGHT working-title overlay and cyan rule rendered in headless Chromium',
      'Deterministic crop/cover fit to CrazyGames mandatory dimensions',
      'Visual inspection at full resolution and 200px thumbnail scale',
    ],
    transformationCommands: ['npm run build:covers', 'npm run validate:submission-media'],
    transformationSource: 'scripts/build-crazygames-covers.mjs; scripts/validate-crazygames-media.mjs',
    approvalState: 'rights-review',
    reviewer: 'Codex automated generation and validation record',
    reviewDate: '2026-08-18',
    notes: 'Submission-only; deliberately excluded from public/ and the runtime download. Working title requires human clearance.',
  },
  {
    id: 'swarmwright-crazygames-previews',
    runtimePath: [
      'marketing/crazygames/previews/swarmwright-preview-landscape.webm',
      'marketing/crazygames/previews/swarmwright-preview-portrait.webm',
    ].join('; '),
    assetType: 'submission-preview-family/webm',
    dimensions: '1920x1080 landscape and 1080x1620 portrait',
    source: 'Repository-authored real-time first-run gameplay recorded from the Basic candidate',
    creator: 'Z13Labs/Codex Playwright capture pipeline',
    sourceUrl: null,
    sourceReferences: [
      'scripts/capture-crazygames-previews.mjs',
      'scripts/validate-crazygames-media.mjs',
      'marketing/crazygames/covers/swarmwright-cover-landscape.png',
      'marketing/crazygames/covers/swarmwright-cover-portrait.png',
    ],
    licenceOrTermsStatus: 'Contains repository gameplay and the cover family above; inherits pending human artwork/title clearance',
    generation: null,
    transformations: [
      'Static cover opening frame followed by unaccelerated live gameplay',
      'Portrait presentation uses unchanged 16:9 gameplay over a full-bleed branded backdrop',
      'No audio track, cursor, black bars, promotional CTA, or external marks',
    ],
    transformationCommands: ['npm run capture:previews', 'npm run validate:submission-media'],
    transformationSource: 'scripts/capture-crazygames-previews.mjs; scripts/validate-crazygames-media.mjs',
    approvalState: 'rights-review',
    reviewer: 'Codex automated capture and validation record',
    reviewDate: '2026-08-18',
    notes: 'Submission-only; validated under 20 seconds and 50MB with exact required aspect ratios and no audio track.',
  },
];

for (const record of mediaRecords) {
  const index = inventory.assets.findIndex(({ id }) => id === record.id);
  if (index === -1) inventory.assets.push(record);
  else inventory.assets[index] = record;
}

for (const asset of inventory.assets) {
  const declaredPaths = String(asset.runtimePath).split(';').map((value) => value.trim());
  const actualPaths = [];
  for (const relativePath of declaredPaths) {
    if (await exists(relativePath)) actualPaths.push(relativePath);
  }
  if (actualPaths.length === 0) continue;
  const currentHashes = await hashesFor(actualPaths);
  asset.runtimeHashSha256 = actualPaths.length === 1
    ? currentHashes[actualPaths[0]]
    : currentHashes;
}

const backdrop = inventory.assets.find(({ id }) => id === 'industrial-cavern-backdrop');
if (backdrop) {
  backdrop.assetType = 'raster-image/webp';
  backdrop.dimensions = '960x540';
  backdrop.transformationSourceSha256 = hash(await readFile(path.join(root, 'scripts/build-industrial-backdrop.py')));
  backdrop.reviewDate = '2026-08-18';
}

await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Refreshed ${inventory.assets.length} CrazyGames provenance records`);
