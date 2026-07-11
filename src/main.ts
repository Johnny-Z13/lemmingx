import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { BUILD_TAG } from './version';
import './styles.css';

document.title = `LemmingX · ${BUILD_TAG}`;

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
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
