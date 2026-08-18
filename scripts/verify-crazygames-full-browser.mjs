import { chromium } from '@playwright/test';

const gameUrl = process.env.SWARMWRIGHT_PREVIEW_URL ?? 'http://127.0.0.1:5178/';
const sdkUrl = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

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
        window.__crazyGamesMock = { init: 0, starts: 0, stops: 0, ads: [], settingsListener: null };
        window.CrazyGames = { SDK: {
          environment: 'local',
          init: async () => { window.__crazyGamesMock.init += 1; },
          game: {
            settings: { muteAudio: true },
            addSettingsChangeListener: (listener) => { window.__crazyGamesMock.settingsListener = listener; },
            gameplayStart: () => { window.__crazyGamesMock.starts += 1; },
            gameplayStop: () => { window.__crazyGamesMock.stops += 1; },
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

  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('TAP THE CREW', { exact: true }).waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => window.__crazyGamesMock?.init === 1 && window.__crazyGamesMock?.starts >= 1);

  const initial = await page.evaluate(() => ({ ...window.__crazyGamesMock, settingsListener: !!window.__crazyGamesMock.settingsListener }));
  invariant(sdkRequests.length === 1, `Full build requested SDK ${sdkRequests.length} times`);
  invariant(initial.init === 1, `SDK init count was ${initial.init}`);
  invariant(initial.starts >= 1, 'Full build did not report gameplayStart');
  invariant(initial.ads.length === 0, 'Full build requested an ad in the first session');
  invariant(initial.settingsListener, 'Full build did not install the host settings listener');
  invariant(await page.getByText(/VIDEO/).count() === 0, 'First-session Full build exposed an ad offer');

  await page.getByRole('button', { name: /options/i }).click();
  await page.getByRole('heading', { name: 'Options' }).waitFor();
  await page.waitForFunction(() => window.__crazyGamesMock?.stops >= 1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForFunction(() => window.__crazyGamesMock?.starts >= 2);

  invariant(errors.length === 0, errors.join('\n'));
  const finalState = await page.evaluate(() => window.__crazyGamesMock);
  console.log(`PASS Full SDK browser: init ${finalState.init}, starts ${finalState.starts}, stops ${finalState.stops}, ads ${finalState.ads.length}`);
  await context.close();
} finally {
  await browser.close();
}
