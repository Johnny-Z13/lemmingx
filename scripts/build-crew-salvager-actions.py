#!/usr/bin/env python3
"""Pack the generated key-art crew action strips into one compact Phaser atlas."""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

from PIL import Image


CELL = 64
ATLAS_COLUMNS = 8
ATLAS_ROWS = 7
ACTION_ROWS = (
    ("walk", "bash"),
    ("fall", "shrug"),
    ("climb", "block"),
    ("build", "mine"),
    ("dig", "tread"),
    ("swim", "death"),
)


def load_background_remover(repo_root: Path):
    source = repo_root / "scripts" / "prepare-generated-sprite-strip.py"
    spec = importlib.util.spec_from_file_location("prepare_generated_sprite_strip", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.remove_generated_background


def load_strip(path: Path) -> Image.Image:
    with Image.open(path) as opened:
        strip = opened.convert("RGBA")
    if strip.size != (CELL * 4, CELL):
        raise ValueError(f"{path} is {strip.width}x{strip.height}; expected 256x64")
    return strip


def quantize_keep_alpha(image: Image.Image, colors: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 24 else 0)
    rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    rgb.paste(rgba.convert("RGB"), mask=alpha)
    quantized = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGBA")
    quantized.putalpha(alpha)
    return quantized


def equalize_small_frames(strip: Image.Image, minimum_extent: int = 48) -> Image.Image:
    """Prevent compact poses from shrinking below the phone readability gate."""
    output = Image.new("RGBA", strip.size, (0, 0, 0, 0))
    for index in range(4):
        frame = strip.crop((index * CELL, 0, (index + 1) * CELL, CELL))
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"empty action slot {index}")
        content = frame.crop(bbox)
        extent = max(content.size)
        scale = max(1.0, minimum_extent / extent)
        scale = min(scale, 58 / content.width, 58 / content.height)
        width = max(1, round(content.width * scale))
        height = max(1, round(content.height * scale))
        normalized = content.resize((width, height), Image.Resampling.NEAREST)
        x = index * CELL + (CELL - width) // 2
        y = CELL - 3 - height
        output.alpha_composite(normalized, (x, y))
    return output


def clip_below(strip: Image.Image, local_y: int) -> Image.Image:
    """Make the lower body transparent so the live waterline stays truthful."""
    output = strip.copy()
    output.paste((0, 0, 0, 0), (0, local_y, output.width, output.height))
    return output


def equalize_visible_water_frames(
    strip: Image.Image,
    waterline_y: int,
    minimum_extent: int = 48,
) -> Image.Image:
    """Keep the visible, above-water portion readable after truthful clipping."""
    output = Image.new("RGBA", strip.size, (0, 0, 0, 0))
    for index in range(4):
        frame = strip.crop((index * CELL, 0, (index + 1) * CELL, CELL))
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"empty clipped-water slot {index}")
        content = frame.crop(bbox)
        extent = max(content.size)
        scale = max(1.0, minimum_extent / extent)
        scale = min(scale, 58 / content.width, waterline_y / content.height)
        width = max(1, round(content.width * scale))
        height = max(1, round(content.height * scale))
        normalized = content.resize((width, height), Image.Resampling.NEAREST)
        x = index * CELL + (CELL - width) // 2
        y = waterline_y - height
        output.alpha_composite(normalized, (x, y))
    return output


def build_canopy_strip(source: Path, repo_root: Path) -> Image.Image:
    remove_generated_background = load_background_remover(repo_root)
    with Image.open(source) as opened:
        transparent = remove_generated_background(opened)

    frames: list[Image.Image] = []
    for index in range(4):
        left = round(index * transparent.width / 4)
        right = round((index + 1) * transparent.width / 4)
        # Only the generated canopy belongs in this overlay. Live fall bodies,
        # suspension lines, and terrain remain independently rendered.
        slot = transparent.crop((left, 0, right, round(transparent.height * 0.40)))
        bbox = slot.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"empty canopy slot {index}")
        frames.append(slot.crop(bbox))

    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    scale = min(58 / max_width, 26 / max_height)
    strip = Image.new("RGBA", (CELL * 4, CELL), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        normalized = frame.resize((width, height), Image.Resampling.NEAREST)
        x = index * CELL + (CELL - width) // 2
        y = CELL - 3 - height
        strip.alpha_composite(normalized, (x, y))
    return quantize_keep_alpha(strip, 32)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", default="docs/assets/sources/crew-keyart-v3")
    parser.add_argument("--output", default="public/assets/crew-keyart-actions.png")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    source_dir = (repo_root / args.source_dir).resolve()
    output = (repo_root / args.output).resolve()
    atlas = Image.new(
        "RGBA",
        (ATLAS_COLUMNS * CELL, ATLAS_ROWS * CELL),
        (0, 0, 0, 0),
    )

    for row, (left_name, right_name) in enumerate(ACTION_ROWS):
        left = equalize_small_frames(load_strip(source_dir / f"{left_name}.png"))
        right = equalize_small_frames(load_strip(source_dir / f"{right_name}.png"))
        if left_name == "swim":
            left = equalize_visible_water_frames(clip_below(left, 48), 48)
        if right_name == "tread":
            right = equalize_visible_water_frames(clip_below(right, 48), 48)
        atlas.alpha_composite(left, (0, row * CELL))
        atlas.alpha_composite(right, (4 * CELL, row * CELL))

    canopy = build_canopy_strip(source_dir / "float-source.png", repo_root)
    atlas.alpha_composite(canopy, (0, 6 * CELL))

    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, optimize=True)
    print(f"wrote {output} ({atlas.width}x{atlas.height})")


if __name__ == "__main__":
    main()
