import Phaser from 'phaser';
import { WORLD_THEME } from './visualTheme';

export const INDUSTRIAL_BACKDROP_KEY = 'industrial-cavern-backdrop';

/** Generated distant skyline plus a cheap live rain layer. */
export class WorldBackdrop {
  private readonly rain: Phaser.GameObjects.Graphics;
  private readonly viewportWidth: number;
  private readonly viewportHeight: number;

  constructor(scene: Phaser.Scene, levelWidth: number, levelHeight: number) {
    this.viewportWidth = scene.scale.width;
    this.viewportHeight = scene.scale.height;

    const sky = scene.add.graphics().setDepth(-40).setScrollFactor(0);
    sky.fillGradientStyle(WORLD_THEME.sky, WORLD_THEME.sky, WORLD_THEME.skyBlue, WORLD_THEME.skyBlue, 1);
    sky.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    const parallaxWidth = this.viewportWidth + Math.max(96, levelWidth * 0.07);
    const parallaxHeight = this.viewportHeight + Math.max(36, levelHeight * 0.025);
    scene.add.image(-24, -12, INDUSTRIAL_BACKDROP_KEY)
      .setOrigin(0)
      .setDepth(-35)
      .setScrollFactor(0.06, 0.02)
      .setDisplaySize(parallaxWidth, parallaxHeight)
      .setAlpha(0.84);

    const haze = scene.add.graphics().setDepth(-30).setScrollFactor(0);
    haze.fillGradientStyle(0x0d1117, 0x0d1117, 0x152237, 0x152237, 0.05, 0.05, 0.7, 0.7);
    haze.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    this.rain = scene.add.graphics().setDepth(-25).setScrollFactor(0);
  }

  update(timeMs: number): void {
    const g = this.rain;
    g.clear();
    g.lineStyle(1, 0x58718c, 0.22);
    const travel = (timeMs * 0.16) % (this.viewportHeight + 80);
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 83 + (i % 5) * 31) % (this.viewportWidth + 80) - 40;
      const y = (i * 127 + travel) % (this.viewportHeight + 80) - 40;
      g.lineBetween(x, y, x - 7, y + 22);
    }
  }
}
