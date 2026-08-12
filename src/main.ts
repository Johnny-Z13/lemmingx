import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import './styles.css';

document.title = __PLAYER_BUILD__ ? 'LemmingX' : `LemmingX · ${__BUILD_TAG__}`;
document.body.classList.toggle('is-player-build', __PLAYER_BUILD__);
if (__PLAYER_BUILD__) {
  const rotateNotice = document.createElement('div');
  rotateNotice.className = 'rotate-notice';
  rotateNotice.innerHTML = '<strong>Rotate to play</strong><span>LemmingX is designed for landscape.</span>';
  document.body.append(rotateNotice);
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
if (import.meta.env.DEV && !__PLAYER_BUILD__) {
  (window as unknown as { game: Phaser.Game }).game = game;
  if (new URLSearchParams(window.location.search).has('playtest')) {
    void import('./playtest-harness').then(({ installPlaytestHarness }) => installPlaytestHarness(game));
  }
}
