#!/usr/bin/env python3
"""Normalize generated terrain-tool art into compact 64px runtime icons."""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

from PIL import Image


ICON_NAMES = ("water", "sand", "dirt", "wood", "fire", "erase", "bomb")
CELL = 64
PADDING = 3
PALETTE_SIZE = 24


def load_background_remover(repo_root: Path):
    source = repo_root / "scripts" / "prepare-generated-sprite-strip.py"
    spec = importlib.util.spec_from_file_location("prepare_generated_sprite_strip", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.remove_generated_background


def quantize_keep_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 24 else 0)
    rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    rgb.paste(rgba.convert("RGB"), mask=alpha)
    quantized = rgb.quantize(
        colors=PALETTE_SIZE,
        method=Image.Quantize.MEDIANCUT,
    ).convert("RGBA")
    quantized.putalpha(alpha)
    return quantized


def normalize(source: Path, remove_generated_background) -> Image.Image:
    with Image.open(source) as opened:
        transparent = remove_generated_background(opened)
    bbox = transparent.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"empty generated icon: {source}")
    content = transparent.crop(bbox)
    available = CELL - PADDING * 2
    scale = min(available / content.width, available / content.height)
    width = max(1, round(content.width * scale))
    height = max(1, round(content.height * scale))
    resized = content.resize((width, height), Image.Resampling.NEAREST)
    icon = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    icon.alpha_composite(resized, ((CELL - width) // 2, (CELL - height) // 2))
    return quantize_keep_alpha(icon)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        default="docs/assets/sources/terrain-tool-icons-v1",
    )
    parser.add_argument("--output-dir", default="public/assets/terrain-tools")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    source_dir = (repo_root / args.source_dir).resolve()
    output_dir = (repo_root / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    remove_generated_background = load_background_remover(repo_root)

    for name in ICON_NAMES:
        output = output_dir / f"{name}.png"
        normalize(source_dir / f"{name}-source.png", remove_generated_background).save(
            output,
            optimize=True,
        )
        print(f"wrote {output} ({CELL}x{CELL}, <= {PALETTE_SIZE} colours)")


if __name__ == "__main__":
    main()
