#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const CELL = 64;
const FRAME_COUNT = 52;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeRgbaPng(file) {
  const png = fs.readFileSync(file);
  const signature = '89504e470d0a1a0a';
  if (png.subarray(0, 8).toString('hex') !== signature) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('atlas must be 8-bit, non-interlaced RGBA');
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const packed = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[source++];
    for (let x = 0; x < stride; x += 1) {
      const value = packed[source++];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upperLeft)
                : Number.NaN;
      if (!Number.isFinite(predictor)) throw new Error(`unsupported PNG filter ${filter}`);
      pixels[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function frameBounds(decoded, frame) {
  const frameX = (frame % 8) * CELL;
  const frameY = Math.floor(frame / 8) * CELL;
  let left = CELL;
  let top = CELL;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const alpha = decoded.pixels[((frameY + y) * decoded.width + frameX + x) * 4 + 3];
      if (alpha === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (right === 0) throw new Error(`frame ${frame} is empty`);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function stripColorCount(decoded, firstFrame) {
  const colors = new Set();
  for (let frame = firstFrame; frame < firstFrame + 4; frame += 1) {
    const frameX = (frame % 8) * CELL;
    const frameY = Math.floor(frame / 8) * CELL;
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const index = ((frameY + y) * decoded.width + frameX + x) * 4;
        if (decoded.pixels[index + 3] === 0) continue;
        colors.add(`${decoded.pixels[index]},${decoded.pixels[index + 1]},${decoded.pixels[index + 2]}`);
      }
    }
  }
  return colors.size;
}

export function validateAtlas(file) {
  const decoded = decodeRgbaPng(file);
  if (decoded.width !== 512 || decoded.height !== 448) {
    throw new Error(`atlas is ${decoded.width}x${decoded.height}; expected 512x448`);
  }
  const frames = Array.from({ length: FRAME_COUNT }, (_, frame) => frameBounds(decoded, frame));
  for (let frame = 0; frame < 48; frame += 1) {
    const bounds = frames[frame];
    if (Math.max(bounds.width, bounds.height) < 48) {
      throw new Error(`body frame ${frame} is below the 48px readability extent`);
    }
    const expectedBottom = frame >= 36 && frame <= 43 ? 48 : 61;
    if (bounds.bottom !== expectedBottom) {
      throw new Error(`body frame ${frame} bottom ${bounds.bottom}; expected ${expectedBottom}`);
    }
  }
  const stripStarts = Array.from({ length: 13 }, (_, index) => index * 4);
  const stripColors = stripStarts.map((firstFrame) => stripColorCount(decoded, firstFrame));
  stripColors.forEach((count, index) => {
    if (count > 32) throw new Error(`strip ${index} has ${count} colours; expected at most 32`);
  });
  return { width: decoded.width, height: decoded.height, frames, stripColors };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invoked) {
  const file = path.resolve(process.argv.find((arg) => arg.endsWith('.png')) ?? 'public/assets/crew-salvager-actions.png');
  const result = validateAtlas(file);
  console.log(process.argv.includes('--json') ? JSON.stringify(result) : `validated ${file}: ${result.frames.length} frames, 13 strips <=32 colours`);
}
