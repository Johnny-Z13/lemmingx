#!/usr/bin/env python3
"""Normalize the generated cavern backdrop into one compact runtime texture."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/assets/sources/industrial-cavern-backdrop-v2/raw-gpt-image.png"
OUTPUT = ROOT / "public/assets/industrial-cavern-backdrop.webp"
EXPECTED_SIZE = (1672, 941)
RUNTIME_SIZE = (960, 540)


def main() -> None:
    with Image.open(SOURCE) as image:
        if image.size != EXPECTED_SIZE:
            raise ValueError(f"Expected {EXPECTED_SIZE}, got {image.size}")
        runtime = image.convert("RGB").resize(RUNTIME_SIZE, Image.Resampling.LANCZOS)
        runtime.save(OUTPUT, format="WEBP", quality=72, method=6)

    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
