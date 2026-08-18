import { createServer } from 'node:http';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const mediaRoot = path.join(projectRoot, 'marketing/crazygames');
const previewRoot = path.join(mediaRoot, 'previews');
const proofRoot = path.join(projectRoot, '.artifacts/crazygames-candidate/media');
const tempRoot = path.join(previewRoot, '.capture');
const gameUrl = process.env.SWARMWRIGHT_PREVIEW_URL ?? 'http://127.0.0.1:5178/';
const host = '127.0.0.1';
const port = 4178;

const formats = [
  {
    name: 'landscape',
    width: 1920,
    height: 1080,
    gameTop: 0,
    gameHeight: 1080,
    cover: 'covers/swarmwright-cover-landscape.png',
    backdrop: 'source/swarmwright-cover-landscape-master.png',
  },
  {
    name: 'portrait',
    width: 1080,
    height: 1620,
    gameTop: 506,
    gameHeight: 608,
    cover: 'covers/swarmwright-cover-portrait.png',
    backdrop: 'source/swarmwright-cover-portrait-master.png',
  },
];
const formatFilter = process.env.SWARMWRIGHT_PREVIEW_FORMAT;
const selectedFormats = formatFilter
  ? formats.filter(({ name }) => name === formatFilter)
  : formats;
if (selectedFormats.length === 0) throw new Error(`Unknown preview format: ${formatFilter}`);

function contentType(filePath) {
  return filePath.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8';
}

function shell(format) {
  const query = new URLSearchParams({ capture: format.name, run: String(Date.now()) });
  return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #030917; }
          body {
            background-image:
              linear-gradient(rgba(1, 5, 17, .46), rgba(1, 5, 17, .62)),
              url('/${format.backdrop}');
            background-position: center;
            background-size: cover;
          }
          iframe {
            position: absolute;
            left: 0;
            top: ${format.gameTop}px;
            width: ${format.width}px;
            height: ${format.gameHeight}px;
            border: 0;
            opacity: 0;
            background: #030917;
            box-shadow: 0 0 70px rgba(37, 215, 228, .28);
            transition: opacity 240ms ease;
          }
          body.playing iframe { opacity: 1; }
          .cover {
            position: absolute;
            z-index: 2;
            inset: 0;
            background: center / cover no-repeat url('/${format.cover}');
            opacity: 1;
            transition: opacity 240ms ease;
            pointer-events: none;
          }
          body.playing .cover { opacity: 0; }
          .frame {
            position: absolute;
            z-index: 1;
            left: 0;
            top: ${Math.max(0, format.gameTop - 4)}px;
            width: 100%;
            height: ${format.gameHeight + (format.name === 'portrait' ? 8 : 0)}px;
            border-block: ${format.name === 'portrait' ? '4px solid rgba(85, 245, 241, .72)' : '0'};
            opacity: 0;
            transition: opacity 240ms ease;
            pointer-events: none;
          }
          body.playing .frame { opacity: 1; }
        </style>
      </head>
      <body>
        <iframe title="Swarmwright gameplay" src="${gameUrl}?${query}"></iframe>
        <div class="frame"></div>
        <div class="cover"></div>
      </body>
    </html>`;
}

await mkdir(tempRoot, { recursive: true });
await mkdir(previewRoot, { recursive: true });
await mkdir(proofRoot, { recursive: true });

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${host}:${port}`);
    const format = formats.find((candidate) => url.searchParams.get('format') === candidate.name) ?? formats[0];
    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(shell(format));
      return;
    }
    const relativePath = url.pathname.replace(/^\//, '');
    const absolutePath = path.resolve(mediaRoot, relativePath);
    if (!absolutePath.startsWith(`${mediaRoot}${path.sep}`)) throw new Error('Invalid media path');
    const bytes = await readFile(absolutePath);
    response.writeHead(200, { 'content-type': contentType(absolutePath), 'cache-control': 'no-store' });
    response.end(bytes);
  } catch (error) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end(error instanceof Error ? error.message : 'Not found');
  }
});

await new Promise((resolve) => server.listen(port, host, resolve));
const browser = await chromium.launch({ headless: true });

try {
  for (const format of selectedFormats) {
    const context = await browser.newContext({
      viewport: { width: format.width, height: format.height },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: tempRoot,
        size: { width: format.width, height: format.height },
      },
    });
    const page = await context.newPage();
    await page.goto(`http://${host}:${port}/?format=${format.name}`, { waitUntil: 'domcontentloaded' });
    const gameplay = page.frames().find((frame) => frame !== page.mainFrame());
    if (!gameplay) throw new Error(`Gameplay frame not found for ${format.name}`);
    const canvas = gameplay.locator('#app canvas');
    await canvas.waitFor({ state: 'visible', timeout: 10_000 });
    await gameplay.locator('body').getByText('TAP THE CREW', { exact: true }).waitFor({ timeout: 10_000 });

    // The cover is intentionally the opening frame, matching CrazyGames' preview guidance.
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      document.body.classList.add('playing');
      document.querySelector('.cover')?.remove();
      const frame = document.querySelector('iframe');
      if (frame) {
        frame.style.transition = 'none';
        frame.style.opacity = '1';
      }
      const border = document.querySelector('.frame');
      if (border) {
        border.style.transition = 'none';
        border.style.opacity = '1';
      }
    });
    await page.waitForTimeout(350);
    const iframeOpacity = await page.locator('iframe').evaluate((iframe) => getComputedStyle(iframe).opacity);
    const remainingCovers = await page.locator('.cover').count();
    if (Number(iframeOpacity) < 0.99 || remainingCovers !== 0) {
      throw new Error(`Cover transition failed for ${format.name}: iframe opacity ${iframeOpacity}, covers ${remainingCovers}`);
    }
    await page.screenshot({
      path: path.join(proofRoot, `capture-live-${format.name}.png`),
    });

    const box = await canvas.boundingBox();
    if (!box) throw new Error(`Canvas bounds unavailable for ${format.name}`);
    const basherStock = gameplay.locator('[data-skill="basher"] .hud__stock');
    const targetPoints = format.name === 'portrait'
      ? [[168, 316], [185, 316], [202, 316], [220, 316], [180, 330], [205, 330], [230, 330]]
      : [
          [175, 375], [190, 375], [205, 375], [220, 375], [235, 375],
          [175, 360], [200, 360], [225, 360], [175, 390], [205, 390],
        ];
    for (const [worldX, worldY] of targetPoints) {
      await canvas.click({ position: { x: box.width * (worldX / 960), y: box.height * (worldY / 540) } });
      await page.waitForTimeout(160);
      if ((await basherStock.textContent())?.trim() === '0') break;
    }
    if ((await basherStock.textContent())?.trim() !== '0') {
      throw new Error(`First crew command was not accepted for ${format.name}`);
    }

    // Record real-time gameplay only: no speed-up and no synthetic simulation state.
    await page.waitForTimeout(14_000);
    const video = page.video();
    await page.close();
    await context.close();
    if (!video) throw new Error(`Video capture unavailable for ${format.name}`);
    const temporaryPath = await video.path();
    const outputPath = path.join(previewRoot, `swarmwright-preview-${format.name}.webm`);
    await rm(outputPath, { force: true });
    await rename(temporaryPath, outputPath);
    console.log(`Captured ${format.name}: ${outputPath}`);
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(tempRoot, { recursive: true, force: true });
}
