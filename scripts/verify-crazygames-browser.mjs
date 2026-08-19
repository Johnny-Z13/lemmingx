import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const proofRoot = path.join(projectRoot, '.artifacts/crazygames-candidate/browser');
const gameUrl = process.env.SWARMWRIGHT_PREVIEW_URL ?? 'http://127.0.0.1:5178/';
const sdkUrl = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function collectFailures(page, label) {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${label} console: ${message.text()}`);
  });
  return failures;
}

async function waitForColdGameplay(page) {
  const startedAt = performance.now();
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('TAP THE CREW', { exact: true }).waitFor({ timeout: 10_000 });
  return performance.now() - startedAt;
}

async function waitForEmbeddedGameplay(page) {
  const frameNavigated = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame !== page.mainFrame() && frame.url().startsWith(gameUrl),
  });
  await page.setContent(`<iframe title="Swarmwright" src="${gameUrl}" style="border:0;width:100%;height:100%"></iframe>`);
  const frame = await frameNavigated;
  await frame.getByText('TAP THE CREW', { exact: true }).waitFor({ timeout: 10_000 });
  return frame;
}

async function acceptFirstCommand(page) {
  const canvas = page.locator('#app canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounds');
  const stock = page.locator('[data-skill="basher"] .hud__stock');
  const points = [];
  for (const worldY of [315, 335, 355, 375, 390]) {
    for (const worldX of [165, 180, 195, 210, 225, 240]) points.push([worldX, worldY]);
  }
  for (const [worldX, worldY] of points) {
    await canvas.click({ position: { x: box.width * (worldX / 960), y: box.height * (worldY / 540) } });
    await page.waitForTimeout(60);
    if ((await stock.textContent())?.trim() === '0') return;
  }
  throw new Error('Could not issue the first Basher command');
}

await mkdir(proofRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  {
    const context = await browser.newContext({ viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const failures = collectFailures(page, 'desktop-cold');
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    const timeToGameplayMs = await waitForColdGameplay(page);
    const coldRequests = [...requests];

    invariant(timeToGameplayMs < 2_500, `Cold local gameplay took ${timeToGameplayMs.toFixed(0)}ms`);
    invariant(!coldRequests.some((url) => /WorkshopOverlay|PauseOptionsOverlay|LevelSelect|\/level(?:4|5|6|7|8|9|10)-|\/lab-/.test(url)), 'Cold path fetched a deferred surface or later site');
    invariant(!coldRequests.some((url) => /crazygames-sdk|sdk\.crazygames/i.test(url)), 'Direct launch requested the CrazyGames SDK');
    invariant(await page.getByText('Dev Sandbox', { exact: true }).count() === 0, 'Player build exposed Dev Sandbox');
    invariant(await page.getByText(/loading/i).count() === 0, 'Player boot exposed a loading screen');

    await acceptFirstCommand(page);
    invariant((await page.locator('[data-skill="basher"] .hud__stock').textContent())?.trim() === '0', 'First command did not consume Basher stock');
    await page.screenshot({ path: path.join(proofRoot, 'desktop-907x510-first-command.png') });

    await page.getByRole('button', { name: /options/i }).click();
    await page.getByRole('heading', { name: 'Options' }).waitFor();
    invariant(await page.getByRole('button', { name: 'Campaign' }).count() === 0, 'Campaign navigation appeared before the first expedition');
    invariant(requests.some((url) => /PauseOptionsOverlay/.test(url)), 'Pause overlay did not stream on demand');
    await page.getByRole('button', { name: 'Resume' }).click();
    invariant(failures.length === 0, failures.join('\n'));
    console.log(`PASS desktop cold 907x510: gameplay ${timeToGameplayMs.toFixed(0)}ms, ${coldRequests.length} startup requests`);
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Test Device) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    });
    const page = await context.newPage();
    const failures = collectFailures(page, 'android-low');
    await waitForColdGameplay(page);
    const bodyClasses = await page.locator('body').getAttribute('class') ?? '';
    invariant(bodyClasses.includes('is-mobile-device'), `Android was not detected as mobile: ${bodyClasses}`);
    invariant(bodyClasses.includes('graphics-low'), `4-core/4GB Android did not boot low tier: ${bodyClasses}`);
    invariant(await page.getByText(/rotate (your )?(phone|device)/i).count() === 0, 'Landscape launch supplied an orientation gate');
    const basherBounds = await page.getByRole('button', { name: 'Basher' }).boundingBox();
    invariant(!!basherBounds && basherBounds.width >= 44 && basherBounds.height >= 44, 'Mobile Basher target is below 44x44 CSS pixels');
    await acceptFirstCommand(page);
    await page.screenshot({ path: path.join(proofRoot, 'android-low-844x390.png') });
    invariant(failures.length === 0, failures.join('\n'));
    console.log('PASS Android low tier 844x390: mobile profile, DPR1, 44px target');
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Test Device) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    const failures = collectFailures(page, 'android-portrait-direct-gate');
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('dialog', { name: 'Rotate to play' }).waitFor({ timeout: 10_000 });
    invariant(failures.length === 0, failures.join('\n'));
    console.log('PASS Android portrait direct launch: game owns the landscape gate');
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Test Device) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    });
    await context.route(sdkUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.CrazyGames = { SDK: {
          environment: 'disabled',
          init: async () => {},
          game: { gameplayStart: () => {}, gameplayStop: () => {} },
        }};`,
      });
    });
    const page = await context.newPage();
    const failures = collectFailures(page, 'android-portrait-embedded');
    const frame = await waitForEmbeddedGameplay(page);
    invariant(await frame.getByText(/rotate (your )?(phone|device)/i).count() === 0, 'Embedded launch exposed a competing rotate modal');
    invariant(failures.length === 0, failures.join('\n'));
    console.log('PASS Android portrait embedded launch: host owns the landscape gate');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('Storage denied', 'SecurityError'); },
      });
    });
    const page = await context.newPage();
    const failures = collectFailures(page, 'storage-denied');
    await waitForColdGameplay(page);
    invariant(failures.length === 0, failures.join('\n'));
    console.log('PASS unavailable localStorage: gameplay remains available');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      localStorage.setItem('swarmwright.save.v2', JSON.stringify({
        version: 2,
        started: true,
        currentSite: 3,
        salvage: 38,
        rescuedTotal: 30,
        sites: {
          0: { completed: true, bestSavedPct: 100, bestSavedCount: 10, failures: 0 },
          1: { completed: true, bestSavedPct: 100, bestSavedCount: 10, failures: 0 },
          2: { completed: true, bestSavedPct: 100, bestSavedCount: 10, failures: 0 },
        },
        atlas: ['floodgate', 'water-fall-break', 'wood-rides-water', 'blast'],
        workshop: [],
        daily: {
          activeAttemptDate: null,
          lastCompletedDate: null,
          currentChain: 0,
          bestChain: 0,
          graceAvailable: true,
          totalCompletions: 0,
          rewardsByDate: {},
          bestScoreByDate: {},
        },
        lastSeenUtcMs: Date.now(),
      }));
    });
    const page = await context.newPage();
    const failures = collectFailures(page, 'workshop-800');
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Workshop' }).waitFor({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Workshop' }).click();
    await page.getByRole('heading', { name: 'Workshop' }).waitFor();
    invariant(await page.locator('.workshop__project').count() === 6, 'Workshop did not show all six visible projects');
    invariant(await page.getByText('Daily Rescue', { exact: true }).count() > 0, 'Workshop did not surface Daily Rescue');
    invariant(await page.getByText('4/14 discovered', { exact: true }).count() > 0, 'Workshop did not surface Atlas gaps');
    const viewportFit = await page.locator('.workshop').evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    invariant(viewportFit.scrollHeight <= viewportFit.clientHeight + 1, `Workshop root scrolls at 800x450: ${JSON.stringify(viewportFit)}`);
    await page.screenshot({ path: path.join(proofRoot, 'workshop-800x450.png') });
    invariant(failures.length === 0, failures.join('\n'));
    console.log('PASS Workshop 800x450: six projects, Daily, Atlas gaps, no root overflow');
    await context.close();
  }
} finally {
  await browser.close();
}
