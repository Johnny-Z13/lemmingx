import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import {
  DEV_SANDBOX_AVAILABLE,
  DEV_SANDBOX_ENABLED,
  IS_PLAYER_EXPERIENCE,
  setDevSandboxEnabled,
} from './runtimeMode';
import { DEVICE_PROFILE } from './deviceProfile';
import './styles.css';
import { telemetry } from './telemetry/Telemetry';
import { installRendererRecovery } from './platform/rendererRecovery';
import { GAME_OWNS_MOBILE_ORIENTATION } from './lifecycle/MobileOrientationPolicy';
import { PortraitModalGate } from './lifecycle/PortraitModalGate';
import { TOUCH_PORTRAIT_QUERY } from './lifecycle/TouchOrientationGate';
import { platform } from './platform/PlatformAdapter';

telemetry.emitOnce('load_started');
window.addEventListener('pagehide', () => {
  telemetry.emitOnce('session_end');
  void telemetry.flush();
});

document.title = IS_PLAYER_EXPERIENCE ? 'Swarmwright' : `LemmingX Sandbox · ${__BUILD_TAG__}`;
document.body.classList.toggle('is-player-build', IS_PLAYER_EXPERIENCE);
document.body.classList.toggle('is-sandbox-build', DEV_SANDBOX_ENABLED);
document.body.classList.toggle('is-mobile-device', DEVICE_PROFILE === 'mobile');
document.body.classList.toggle('is-desktop-device', DEVICE_PROFILE === 'desktop');

const markUserInteraction = () => platform.userInteracted();
window.addEventListener('pointerdown', markUserInteraction, { capture: true });
window.addEventListener('keydown', markUserInteraction, { capture: true });

// Portal pages can scroll around the iframe. Keep game navigation keys and the
// camera wheel inside Swarmwright while preserving native form controls.
window.addEventListener('keydown', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('button, input, select, textarea, [contenteditable="true"]')) return;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === ' ') event.preventDefault();
}, { capture: true });
window.addEventListener('wheel', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.pause-options__panel, .workshop, .select__panel')) return;
  event.preventDefault();
}, { passive: false });

if (GAME_OWNS_MOBILE_ORIENTATION) {
  const rotateNotice = document.createElement('div');
  rotateNotice.className = 'rotate-notice';
  rotateNotice.tabIndex = -1;
  rotateNotice.setAttribute('aria-hidden', 'true');
  rotateNotice.setAttribute('aria-labelledby', 'swarmwright-rotate-heading');
  rotateNotice.setAttribute('aria-describedby', 'swarmwright-rotate-detail');
  rotateNotice.setAttribute('aria-live', 'polite');
  rotateNotice.innerHTML =
    '<strong id="swarmwright-rotate-heading">Rotate to play</strong>' +
    '<span id="swarmwright-rotate-detail">Swarmwright is designed for landscape.</span>';
  document.body.append(rotateNotice);
  const portraitModalGate = new PortraitModalGate(
    rotateNotice,
    window.matchMedia(TOUCH_PORTRAIT_QUERY),
  );
  portraitModalGate.start();
  window.addEventListener('pagehide', () => portraitModalGate.stop());
  window.addEventListener('pageshow', () => portraitModalGate.start());
}

if (__DEV_SANDBOX_AVAILABLE__) {
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

async function boot(): Promise<void> {
  await platform.init();
  document.body.dataset.platform = platform.systemInfo().environment;

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

  installRendererRecovery(game.canvas, {
    onLost: () => {
      telemetry.emit('renderer_context_lost');
      game.loop.sleep();
    },
    onRestored: () => {
      telemetry.emit('renderer_context_restored');
      game.loop.wake();
    },
  });

  // Dev-only handle so the preview/devtools can inspect or drive the running game
  // even when the tab is backgrounded (and rAF is throttled).
  if (__DEV_SANDBOX_AVAILABLE__) {
    (window as unknown as { game: Phaser.Game }).game = game;
    if (new URLSearchParams(window.location.search).has('playtest')) {
      void import('./playtest-harness').then(({ installPlaytestHarness }) => installPlaytestHarness(game));
    }
  }
}

void boot();
