# Industrial cavern backdrop v2 generation record

- Date: 2026-08-16
- Tool path: Codex built-in Image Generation tool
- Output identifier: `exec-c3a6e351-6dd1-4c7e-9433-5f45be3f5f69.png`
- Backend model identifier and seed: not exposed by the built-in tool
- Reference: `public/assets/title-splash.png`, visual-language reference only
- Runtime transformation: Pillow 11.3.0, deterministic 192-colour median-cut
  quantization without dithering via `scripts/build-industrial-backdrop.py`

## Exact prompt

```text
Use case: stylized-concept
Asset type: production parallax background for a 2D Phaser pixel-art game
Input image: title-splash.png is a visual-language reference only, not an edit target
Primary request: Create a new original distant industrial cavern-city skyline at night that supports a living-terrain puzzle game. It must feel substantially richer, more saturated, and more illuminated than a flat dark-blue skyline while remaining a subordinate background.
Scene/backdrop: multiple layers of distant cranes, gantries, scaffold towers, pipes, suspended catwalks, and cavern silhouettes across a very wide landscape; a large open deep-navy sky area; no foreground floor or platform.
Style/medium: crisp high-end pixel art, coherent chunky pixel clusters, no blur, no photorealism, no painterly smears
Composition/framing: extra-wide 16:9 backdrop; distant architecture concentrated in the lower two-thirds with varied height; open negative space near the upper centre for gameplay UI; edge-to-edge scenery suitable for mild parallax crop
Lighting/mood: saturated midnight navy and cobalt atmospheric depth; numerous tiny warm amber work lamps and windows; a restrained number of cyan conduit lights and vapor glows; local light halos visible but subtle enough that bright playable characters and terrain remain dominant
Color palette: deep navy, cobalt, steel blue, warm amber, small cyan accents; strong separation between near and far silhouette layers
Materials/textures: dark steel, wet girders, pipes, concrete silhouettes; rain is NOT baked in because the game adds live rain
Constraints: entirely original composition; background-only; no characters or creatures; no text or logo; no portal, diamond gate, hatch, mission UI, minimap, terrain cross-section, walkable platform, bridge, water pool, fire, sand piles, or collision-looking foreground surface; no copied pixels, silhouettes, or structure placement from the reference; no watermark
Avoid: green-haired characters, exposed-face workers, close-up props, centered focal landmark, bright full-screen haze, black crushed shadows, excessive bloom
```

The raw output is retained unchanged as `raw-gpt-image.png`. Human originality,
commercial-rights, and reference-boundary review remain required before release.
