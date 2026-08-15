#!/usr/bin/env python3
"""Turn an evenly spaced generated sprite strip into a transparent 64px atlas."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_connected_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return min(r, g, b) >= 185 and max(r, g, b) - min(r, g, b) <= 28


def remove_generated_background(image: Image.Image) -> Image.Image:
    """Remove only neutral near-white pixels connected to the canvas edge."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    pending: deque[int] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if visited[index] or not is_connected_background(pixels[x, y]):
            return
        visited[index] = 1
        pending.append(index)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while pending:
        index = pending.popleft()
        x = index % width
        y = index // width
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    # Image generators sometimes leave isolated exact checker pixels in gaps
    # enclosed by the silhouette. Remove only the brightest neutral residue;
    # coloured eye/tool highlights remain intact.
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a and min(r, g, b) >= 244 and max(r, g, b) - min(r, g, b) <= 10:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty sprite frame")
    return bbox


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--cell", type=int, default=64)
    parser.add_argument("--padding", type=int, default=3)
    args = parser.parse_args()

    if args.frames < 1 or args.cell < 1 or args.padding < 0:
        raise SystemExit("frames/cell must be positive and padding cannot be negative")

    with Image.open(args.input) as opened:
        strip = remove_generated_background(opened)

    slots: list[Image.Image] = []
    content: list[Image.Image] = []
    for index in range(args.frames):
        left = round(index * strip.width / args.frames)
        right = round((index + 1) * strip.width / args.frames)
        slot = strip.crop((left, 0, right, strip.height))
        slots.append(slot)
        content.append(slot.crop(content_bbox(slot)))

    max_width = max(frame.width for frame in content)
    max_height = max(frame.height for frame in content)
    available = args.cell - args.padding * 2
    scale = min(available / max_width, available / max_height)
    atlas = Image.new("RGBA", (args.cell * args.frames, args.cell), (0, 0, 0, 0))

    for index, frame in enumerate(content):
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        normalized = frame.resize((width, height), Image.Resampling.NEAREST)
        x = index * args.cell + (args.cell - width) // 2
        y = args.cell - args.padding - height
        atlas.alpha_composite(normalized, (x, y))

    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(target)
    print(f"wrote {target} ({atlas.width}x{atlas.height}, shared scale {scale:.4f})")


if __name__ == "__main__":
    main()
