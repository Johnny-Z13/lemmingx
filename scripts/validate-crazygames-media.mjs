import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const mediaRoot = path.join(projectRoot, 'marketing/crazygames');
const proofRoot = path.join(projectRoot, '.artifacts/crazygames-candidate/media');
const host = '127.0.0.1';
const port = 4179;

const covers = [
  ['covers/swarmwright-cover-landscape.png', 1920, 1080],
  ['covers/swarmwright-cover-portrait.png', 800, 1200],
  ['covers/swarmwright-cover-square.png', 800, 800],
];
const previews = [
  ['previews/swarmwright-preview-landscape.webm', 1920, 1080],
  ['previews/swarmwright-preview-portrait.webm', 1080, 1620],
];

function pngDimensions(bytes) {
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('Not a PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

for (const [relativePath, expectedWidth, expectedHeight] of covers) {
  const bytes = await readFile(path.join(mediaRoot, relativePath));
  const { width, height } = pngDimensions(bytes);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${relativePath}: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);
  }
  console.log(`PASS cover ${relativePath}: ${width}x${height}`);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${host}:${port}`);
    const relativePath = url.pathname.replace(/^\//, '');
    const absolutePath = path.resolve(mediaRoot, relativePath);
    if (!absolutePath.startsWith(`${mediaRoot}${path.sep}`)) throw new Error('Invalid media path');
    const bytes = await readFile(absolutePath);
    response.writeHead(200, {
      'content-type': 'video/webm',
      'content-length': String(bytes.length),
      'access-control-allow-origin': '*',
    });
    response.end(bytes);
  } catch (error) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end(error instanceof Error ? error.message : 'Not found');
  }
});

await mkdir(proofRoot, { recursive: true });
await new Promise((resolve) => server.listen(port, host, resolve));
const browser = await chromium.launch({ headless: true });

try {
  for (const [relativePath, expectedWidth, expectedHeight] of previews) {
    const file = await stat(path.join(mediaRoot, relativePath));
    if (file.size > 50 * 1024 * 1024) throw new Error(`${relativePath}: exceeds 50MB`);

    const page = await browser.newPage({ viewport: { width: expectedWidth, height: expectedHeight } });
    await page.setContent(`<style>html,body{margin:0;background:#030917;overflow:hidden}video{display:block;width:100vw;height:100vh;object-fit:contain}</style><video muted playsinline crossorigin="anonymous" src="http://${host}:${port}/${relativePath}"></video>`);
    const metadata = await page.locator('video').evaluate((video) => new Promise((resolve, reject) => {
      const report = () => {
        const stream = typeof video.captureStream === 'function' ? video.captureStream() : null;
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          audioTracks: stream?.getAudioTracks().length ?? 0,
        });
      };
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) report();
      else {
        video.addEventListener('loadedmetadata', report, { once: true });
        video.addEventListener('error', () => reject(new Error('Could not read video metadata')), { once: true });
      }
    }));

    if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
      throw new Error(`${relativePath}: expected ${expectedWidth}x${expectedHeight}, got ${metadata.width}x${metadata.height}`);
    }
    if (metadata.duration < 15 || metadata.duration > 20) {
      throw new Error(`${relativePath}: duration ${metadata.duration.toFixed(2)}s is outside 15–20s`);
    }
    if (metadata.audioTracks !== 0) throw new Error(`${relativePath}: contains an audio track`);

    const baseName = path.basename(relativePath, '.webm');
    const openingPath = path.join(proofRoot, `${baseName}-opening.png`);
    const gameplayPath = path.join(proofRoot, `${baseName}-gameplay.png`);
    await page.screenshot({ path: openingPath });

    // Chromium cannot reliably seek uncued Playwright WebM files. Play at 4×
    // during validation only, then prove that the encoded stream changes from
    // the cover into gameplay. The submitted video itself remains real-time.
    await page.locator('video').evaluate(async (video) => {
      video.playbackRate = 4;
      await video.play();
      await new Promise((resolve, reject) => {
        const deadline = window.setTimeout(() => reject(new Error('Video did not reach gameplay')), 8_000);
        const sample = () => {
          if (video.currentTime >= Math.min(12, video.duration - 2)) {
            window.clearTimeout(deadline);
            video.pause();
            resolve();
            return;
          }
          video.requestVideoFrameCallback(sample);
        };
        video.requestVideoFrameCallback(sample);
      });
    });
    await page.screenshot({ path: gameplayPath });
    const [openingBytes, gameplayBytes] = await Promise.all([readFile(openingPath), readFile(gameplayPath)]);
    if (openingBytes.equals(gameplayBytes)) throw new Error(`${relativePath}: encoded preview is static`);
    await page.close();
    console.log(`PASS preview ${relativePath}: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(2)}s, ${(file.size / 1024 / 1024).toFixed(2)}MB, silent`);
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
