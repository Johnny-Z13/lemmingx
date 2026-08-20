import { chromium } from '@playwright/test';

const gameUrl = process.env.SWARMWRIGHT_PREVIEW_URL ?? 'http://127.0.0.1:5178/';
const sdkUrl = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const portalUrl = new URL(gameUrl);
portalUrl.searchParams.set('portal', 'crazygames');

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
  await context.route(sdkUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__crazyGamesMock = { init: 0, loads: 0, loadStops: 0, starts: 0, stops: 0, progress: [], ads: [], settingsListener: null };
        window.CrazyGames = { SDK: {
          environment: 'local',
          init: async () => { window.__crazyGamesMock.init += 1; },
          game: {
            settings: { muteAudio: true },
            addSettingsChangeListener: (listener) => { window.__crazyGamesMock.settingsListener = listener; },
            loadingStart: () => { window.__crazyGamesMock.loads += 1; },
            loadingStop: () => { window.__crazyGamesMock.loadStops += 1; },
            gameplayStart: () => { window.__crazyGamesMock.starts += 1; },
            gameplayStop: () => { window.__crazyGamesMock.stops += 1; },
            reportGameCompletedPercentage: (value) => { window.__crazyGamesMock.progress.push(value); },
          },
          user: { systemInfo: { device: { type: 'desktop' }, applicationType: 'browser' } },
          ad: { requestAd: (type, callbacks) => { window.__crazyGamesMock.ads.push(type); callbacks.adError?.(new Error('mock-unfilled')); } },
        }};
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
  await game.waitForFunction(() => window.__crazyGamesMock?.init === 1 && window.__crazyGamesMock?.starts >= 1);

  const initial = await game.evaluate(() => ({ ...window.__crazyGamesMock, settingsListener: !!window.__crazyGamesMock.settingsListener }));
  invariant(sdkRequests.length === 1, `Embedded launch requested SDK ${sdkRequests.length} times`);
  invariant(initial.init === 1, `SDK init count was ${initial.init}`);
  invariant(initial.loads === 1 && initial.loadStops === 1, `Loading lifecycle was ${initial.loads}/${initial.loadStops}`);
  invariant(initial.starts >= 1, 'Embedded launch did not report gameplayStart');
  invariant(initial.ads.length === 0, 'Embedded launch requested an ad in the first session');
  invariant(initial.settingsListener, 'Embedded launch did not install the host settings listener');
  invariant(await game.getByText(/VIDEO/).count() === 0, 'First session exposed an ad offer');

  await game.getByRole('button', { name: /options/i }).click();
  await game.getByRole('heading', { name: 'Options' }).waitFor();
  await game.waitForFunction(() => window.__crazyGamesMock?.stops >= 1);
  await game.getByRole('button', { name: 'Resume' }).click();
  await game.waitForFunction(() => window.__crazyGamesMock?.starts >= 2);

  invariant(errors.length === 0, errors.join('\n'));
  const finalState = await game.evaluate(() => window.__crazyGamesMock);
  console.log(`PASS CrazyGames SDK runtime: init ${finalState.init}, loading ${finalState.loads}/${finalState.loadStops}, starts ${finalState.starts}, stops ${finalState.stops}, ads ${finalState.ads.length}`);
  await context.close();
} finally {
  await browser.close();
}
