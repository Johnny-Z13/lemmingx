import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'marketing/crazygames/source');
const outputRoot = path.join(projectRoot, 'marketing/crazygames/covers');

const covers = [
  {
    name: 'landscape',
    width: 1920,
    height: 1080,
    source: 'swarmwright-cover-landscape-master.png',
    titleTop: '7.5%',
    titleSize: 'clamp(92px, 8.2vw, 158px)',
  },
  {
    name: 'portrait',
    width: 800,
    height: 1200,
    source: 'swarmwright-cover-portrait-master.png',
    titleTop: '6.5%',
    titleSize: '78px',
  },
  {
    name: 'square',
    width: 800,
    height: 800,
    source: 'swarmwright-cover-square-master.png',
    titleTop: '6%',
    titleSize: '76px',
  },
];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const cover of covers) {
    const page = await browser.newPage({
      viewport: { width: cover.width, height: cover.height },
      deviceScaleFactor: 1,
    });
    const sourceBytes = await readFile(path.join(sourceRoot, cover.source));
    const sourceUrl = `data:image/png;base64,${sourceBytes.toString('base64')}`;
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #030917; }
            .cover {
              position: relative;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-image: url("${sourceUrl}");
              background-position: center;
              background-size: cover;
            }
            .cover::after {
              content: '';
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(1, 5, 17, .42) 0%, rgba(1, 5, 17, 0) 35%, rgba(1, 5, 17, .08) 100%);
              pointer-events: none;
            }
            .title {
              position: absolute;
              z-index: 1;
              top: ${cover.titleTop};
              left: 50%;
              transform: translateX(-50%) scaleX(.88);
              width: 96%;
              color: #f7b331;
              font-family: 'Avenir Next Condensed', 'Arial Narrow', Impact, sans-serif;
              font-size: ${cover.titleSize};
              font-style: italic;
              font-weight: 900;
              line-height: .82;
              letter-spacing: .01em;
              text-align: center;
              text-transform: uppercase;
              white-space: nowrap;
              -webkit-text-stroke: .035em #07111f;
              text-shadow:
                0 .035em 0 #8f4c0b,
                0 .07em 0 #40250c,
                0 .11em .12em rgba(0, 0, 0, .82),
                0 0 .18em rgba(32, 230, 235, .28);
            }
            .title::after {
              content: '';
              display: block;
              width: 38%;
              height: .035em;
              margin: .15em auto 0;
              border-radius: 999px;
              background: linear-gradient(90deg, transparent, #55f5f1 18%, #55f5f1 82%, transparent);
              box-shadow: 0 0 .13em #25d7e4;
            }
          </style>
        </head>
        <body><main class="cover"><div class="title">SWARMWRIGHT</div></main></body>
      </html>`);
    await page.locator('.cover').screenshot({
      path: path.join(outputRoot, `swarmwright-cover-${cover.name}.png`),
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Built ${covers.length} CrazyGames covers in ${outputRoot}`);
