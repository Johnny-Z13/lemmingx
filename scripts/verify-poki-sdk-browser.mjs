import { chromium } from '@playwright/test';

const gameUrl = process.env.SWARMWRIGHT_PREVIEW_URL ?? 'http://127.0.0.1:5178/';
const sdkUrl = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
const portalUrl = new URL(gameUrl);
portalUrl.searchParams.set('portal', 'poki');

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 836, height: 470 }, deviceScaleFactor: 1 });
  await context.route(sdkUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__pokiMock = { init: 0, loaded: 0, starts: 0, stops: 0, ads: [] };
        window.PokiSDK = {
          init: async () => { window.__pokiMock.init += 1; },
          gameLoadingFinished: () => { window.__pokiMock.loaded += 1; },
          gameplayStart: () => { window.__pokiMock.starts += 1; },
          gameplayStop: () => { window.__pokiMock.stops += 1; },
          commercialBreak: async (onStart) => { window.__pokiMock.ads.push('commercial'); onStart?.(); },
          rewardedBreak: async (options) => { window.__pokiMock.ads.push('rewarded'); options?.onStart?.(); return true; },
          happyTime: () => {},
          getDeviceInfo: () => ({ category: 'desktop' }),
        };
      `,
    });
  });

  const errors = [];
  const sdkRequests = [];
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('request', (request) => {
    if (request.url() === sdkUrl) sdkRequests.push(request.url());
  });

  const frameNavigated = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame !== page.mainFrame() && frame.url().startsWith(portalUrl.origin),
  });
  await page.setContent(`<iframe title="Swarmwright" src="${portalUrl}" style="border:0;width:100%;height:100%"></iframe>`);
  const game = await frameNavigated;
  await game.getByText('TAP THE CREW', { exact: true }).waitFor({ timeout: 10_000 });
  await game.waitForFunction(() => window.__pokiMock?.loaded === 1);

  const beforeInput = await game.evaluate(() => window.__pokiMock);
  invariant(sdkRequests.length === 1, `Embedded launch requested Poki SDK ${sdkRequests.length} times`);
  invariant(beforeInput.init === 1 && beforeInput.loaded === 1, `Poki boot lifecycle was ${beforeInput.init}/${beforeInput.loaded}`);
  invariant(beforeInput.starts === 0, 'Poki gameplayStart fired before the first player input');
  invariant(await game.evaluate(() => document.body.dataset.platform) === 'poki', 'Poki runtime was not selected');

  const canvas = game.locator('#app canvas');
  await canvas.click({ position: { x: 120, y: 230 } });
  await game.waitForFunction(() => window.__pokiMock?.starts === 1);
  await game.getByRole('button', { name: /options/i }).click();
  await game.getByRole('heading', { name: 'Options' }).waitFor();
  await game.waitForFunction(() => window.__pokiMock?.stops === 1);
  await game.getByRole('button', { name: 'Resume' }).click();
  await game.waitForFunction(() => window.__pokiMock?.starts === 2);

  const finalState = await game.evaluate(() => window.__pokiMock);
  invariant(finalState.ads.length === 0, 'First Poki session requested an ad');
  invariant(errors.length === 0, errors.join('\n'));
  console.log(`PASS Poki SDK runtime: init ${finalState.init}, loaded ${finalState.loaded}, starts ${finalState.starts}, stops ${finalState.stops}, ads ${finalState.ads.length}`);
  await context.close();
} finally {
  await browser.close();
}
