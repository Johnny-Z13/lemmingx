import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import './styles.css';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

new Phaser.Game({
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
