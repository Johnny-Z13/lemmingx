# Terrain-tool icon generation record

Generated on 2026-08-16 through OpenAI's built-in image-generation tool. The
user requested GPT Image 2.0; the built-in interface does not expose the exact
backend model identifier or seed. `public/assets/title-splash.png` was supplied
as a visual-language reference only. No reference pixels, characters, logo,
portal, scenery, or silhouettes were copied or traced.

## Shared prompt

> Use case: stylized-concept
>
> Asset type: a single production HUD icon for a 2D browser game's living-terrain tool bar
>
> Input image: title-splash.png is a style reference only; do not copy or trace any pixels, characters, logo, portal, scenery, or silhouettes from it
>
> Style/medium: original clean-room chunky pixel art, crisp square pixel clusters, industrial fantasy, high readability when reduced to 32x32 pixels
>
> Composition/framing: exactly one centered object, near-square silhouette, fills about 78% of canvas, generous transparent padding, no crop
>
> Lighting/mood: strong cyan or warm practical highlights consistent with the reference's moody industrial lighting
>
> Constraints: genuinely transparent background; no text; no letters; no numbers; no icon tile; no border; no ring; no frame; no badge; no UI panel; no character; no scenery; no watermark; no soft antialiasing; no drop shadow outside the object; no extra unrelated objects
>
> Avoid: plain color swatch, glossy mobile-app style, emoji style, photorealism, vector-flat style, gradients outside pixel clusters

## Accepted outputs

Each action appended its subject and palette emphasis to the shared prompt.

| Tool | Exact subject direction | Palette emphasis | Built-in output identifier |
|---|---|---|---|
| Water | A bold cyan water droplet striking a tiny two-step splash/ripple, readable as flowing liquid rather than a gem. | cyan, deep blue, white glint | `exec-39ac2db7-20db-4ace-a283-5690a046a0c5.png` |
| Sand | A compact golden cascade of granular sand falling onto a small dune mound, with four or five clearly separated square grains. | gold, amber, dark ochre | `exec-7cae31b1-3c56-453b-b553-0d919c36b6a9.png` |
| Dirt | A rugged brown earth clod with two embedded angular stones and a cracked top edge, clearly distinct from sand and wood. | earth brown, dark umber, muted stone | `exec-16bf1065-37a5-4278-808e-e5a88620d916.png` |
| Wood | Two short crossed timber logs with visible cut-end growth rings and one metal band, clearly distinct from dirt. | warm timber brown, dark bark, restrained steel | `exec-60c007f3-19fd-40b9-8375-4d8422b5ba4c.png` |
| Fire | A tall orange-red flame with a small hot yellow core and two separated rising embers, unmistakable at tiny size. | orange, red, yellow-white core | `exec-a40373fd-df75-47ea-9e4c-945205e01ee1.png` |
| Erase | A dark industrial eraser block sweeping through a material chunk that breaks into disappearing square pixels, clear destructive/removal action. | cool slate, pale edge, fading cyan pixels | `exec-708abf68-1a9c-41af-a01e-f911403e1d89.png` |
| Bomb | A compact round demolition bomb with a short lit fuse, bright orange spark, and tiny metal cap, unmistakable and not a TNT crate. | charcoal metal, warm orange fuse, restrained brass | `exec-d0ff5791-eefd-4552-87fe-8fb6ac2bb5f2.png` |

## Deterministic runtime transformation

Run `python3 scripts/build-terrain-tool-icons.py`. Pillow 11.3.0 removes only
edge-connected neutral generator background, crops each subject, scales it with
nearest-neighbour sampling into a centred 64x64 cell with 3px padding, thresholds
alpha at 24, quantizes opaque pixels to at most 24 colours, and writes optimized
PNGs under `public/assets/terrain-tools/`.
