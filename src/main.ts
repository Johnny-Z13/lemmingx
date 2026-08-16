import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import {
  DEV_SANDBOX_AVAILABLE,
  DEV_SANDBOX_ENABLED,
  IS_PLAYER_EXPERIENCE,
  setDevSandboxEnabled,
} from './runtimeMode';
import { DEVICE_PROFILE, IS_MOBILE_DEVICE } from './deviceProfile';
import { installMobileFullscreen } from './lifecycle/MobileFullscreen';
import { PortraitModalGate } from './lifecycle/PortraitModalGate';
import { TOUCH_PORTRAIT_QUERY } from './lifecycle/TouchOrientationGate';
import './styles.css';

document.title = IS_PLAYER_EXPERIENCE ? 'LemmingX' : `LemmingX · ${__BUILD_TAG__}`;
document.body.classList.toggle('is-player-build', IS_PLAYER_EXPERIENCE);
document.body.classList.toggle('is-sandbox-build', DEV_SANDBOX_ENABLED);
document.body.classList.toggle('is-mobile-device', DEVICE_PROFILE === 'mobile');
document.body.classList.toggle('is-desktop-device', DEVICE_PROFILE === 'desktop');
if (IS_PLAYER_EXPERIENCE && IS_MOBILE_DEVICE) {
  const rotateNotice = document.createElement('div');
  rotateNotice.className = 'rotate-notice';
  rotateNotice.tabIndex = -1;
  rotateNotice.setAttribute('aria-hidden', 'true');
  rotateNotice.setAttribute('aria-labelledby', 'lemmingx-rotate-heading');
  rotateNotice.setAttribute('aria-describedby', 'lemmingx-rotate-detail');
  rotateNotice.setAttribute('aria-live', 'polite');
  rotateNotice.innerHTML = '<strong id="lemmingx-rotate-heading">Rotate to play</strong><span id="lemmingx-rotate-detail">LemmingX is designed for landscape.</span>';
  document.body.append(rotateNotice);
  const portraitModalGate = new PortraitModalGate(rotateNotice, window.matchMedia(TOUCH_PORTRAIT_QUERY));
  portraitModalGate.start();
  window.addEventListener('pagehide', () => portraitModalGate.stop());
  window.addEventListener('pageshow', () => portraitModalGate.start());
  installMobileFullscreen();
}

if (DEV_SANDBOX_AVAILABLE) {
  const sandboxButton = document.createElement('button');
  sandboxButton.type = 'button';
  sandboxButton.className = 'dev-sandbox-toggle';
  sandboxButton.setAttribute('aria-pressed', String(DEV_SANDBOX_ENABLED));
  sandboxButton.textContent = DEV_SANDBOX_ENABLED ? 'Exit Sandbox' : 'Dev Sandbox';
  sandboxButton.title = DEV_SANDBOX_ENABLED
    ? 'Return to the canonical player experience'
    : 'Reload with prototypes, Sand Lab, unlocked levels, and diagnostics';
  sandboxButton.addEventListener('click', () => {
    if (setDevSandboxEnabled(!DEV_SANDBOX_ENABLED)) window.location.reload();
  });
  document.body.append(sandboxButton);
}

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#12171f',
  pixelArt: true,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
});

// Dev-only handle so the preview/devtools can inspect or drive the running game
// even when the tab is backgrounded (and rAF is throttled).
if (DEV_SANDBOX_AVAILABLE) {
  (window as unknown as { game: Phaser.Game }).game = game;
  if (new URLSearchParams(window.location.search).has('playtest')) {
    void import('./playtest-harness').then(({ installPlaytestHarness }) => installPlaytestHarness(game));
  }
}
