#!/usr/bin/env node

import path from 'node:path';
import { decodeRgbaPng } from './validate-crew-salvager-actions.mjs';

const ICONS = ['water', 'sand', 'dirt', 'wood', 'fire', 'erase', 'bomb'];
const directory = path.resolve(process.argv[2] ?? 'public/assets/terrain-tools');

for (const name of ICONS) {
  const file = path.join(directory, `${name}.png`);
  const decoded = decodeRgbaPng(file);
  if (decoded.width !== 64 || decoded.height !== 64) {
    throw new Error(`${name} is ${decoded.width}x${decoded.height}; expected 64x64`);
  }

  const colors = new Set();
  let transparent = 0;
  let left = decoded.width;
  let top = decoded.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const offset = (y * decoded.width + x) * 4;
      const alpha = decoded.pixels[offset + 3];
      if (alpha !== 0 && alpha !== 255) throw new Error(`${name} has non-binary alpha`);
      if (alpha === 0) {
        transparent += 1;
        continue;
      }
      colors.add(`${decoded.pixels[offset]},${decoded.pixels[offset + 1]},${decoded.pixels[offset + 2]}`);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (right === 0) throw new Error(`${name} is empty`);
  if (Math.max(right - left, bottom - top) < 48) {
    throw new Error(`${name} is below the 48px readability extent`);
  }
  if (colors.size > 24) throw new Error(`${name} has ${colors.size} colours; expected at most 24`);
  if (transparent === 0) throw new Error(`${name} has no transparent background`);
}

console.log(`validated ${ICONS.length} terrain-tool icons: 64x64 RGBA, <=24 colours`);
