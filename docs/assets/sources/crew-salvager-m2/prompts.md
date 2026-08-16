# Salvage crew M2 generation record

Generated for this repository on 2026-08-15/16 with OpenAI built-in image
generation. The exact model identifier and seed were not exposed. Every output
is prototype-only pending human originality, commercial-rights, and
brand-confusion review.

The supplied identity reference was
`docs/assets/sources/crew-salvager-source.png` (SHA-256
`b661690ae601e4504f7bb31e3b2cf425ec7833034b1e5aff35ca15835cd414a6`).
It was used only to preserve this project's clean-room identity:
amber lamp hardhat, black visor with two cyan square eyes, navy work suit,
orange shoulder armour, brown backpack, gloves, and steel-toe boots.

## Shared prompt contract

Each accepted action requested exactly one horizontal row of four separated,
equal animation slots; a consistent full-body scale and anchor; crisp 16-bit
pixel clusters; a restrained palette; and a genuinely transparent background.
Every prompt explicitly excluded scenery, UI, text, labels, frame numbers,
extra characters, logos, watermarks, green hair, exposed faces, copied or
copyrighted designs, and poster composition.

The generator returned an RGB checkerboard despite the transparency request.
The pipeline therefore removes only edge-connected neutral near-white pixels,
normalizes all four source slots at one shared scale into 64×64 cells,
quantizes each four-frame strip to at most 32 colours, and applies alpha
threshold 24. The deterministic packer nearest-neighbour enlarges any body
pose below a 48px maximum alpha extent. Tread/swim frames are clipped at atlas
row 48 and shifted upward by the renderer so their last opaque pixel meets the
live waterline. The canopy-only overlay is separately quantized to 32 colours.

## Accepted action requests

| Row | Exact action direction | Generated source |
|---|---|---|
| Walk | Purposeful right-facing walk: left boot/right arm, passing pose, right boot/left arm, opposite passing pose; compact loop and subtle backpack bob. | `exec-1ad275ff-c3ac-4de5-8031-ef52e2694c4f.png` |
| Bash | Right-facing horizontal bash with one compact twin-head pneumatic drill: brace, extension, amber contact spark/recoil, return; drill attached to both hands. | `exec-215d24fb-5b05-43ea-b1e5-002fd543ec40.png` |
| Fall | Right-facing startled fall: arms lift, clear flail and splayed legs, opposite flail, compact recovery; feet never imply ground contact. | `exec-1c093538-679e-4fbb-bc53-79d26f731124.png` |
| Float overlay | Descent under a compact cyan-and-amber rescue parachute: opening reach, stable glide, opposite sway, compact loop; complete canopy visible. Only the canopy is retained as an overlay so the full-size fall body and live world remain independent. | `exec-37035df3-621e-4afa-963f-6bbf15ad42f9.png` |
| Shrug | Brief relieved standing shrug: shoulders lift, both palms open, shoulders/headlamp drop, neutral settle; no tool. | `exec-eea28233-4a4d-40cc-9b40-95a8306e5a03.png` |
| Climb | Free-climb right without wall or rope: alternating high hand, lifted boot, compressed pull, opposite pull; large centred body and exaggerated limb silhouette. | `exec-7d5e9b86-a772-4c4a-85cc-a9d40557ece7.png` |
| Block | Mostly forward immovable blocker: arms open, both palms out, warning lamp pulse, full stop pose; wide planted silhouette. | `exec-421eab1d-f7f4-4a2b-a3d6-0d448fe81376.png` |
| Build | Build right with compact amber rivet gun and short steel-blue plank: carry, set, rivet spark, recoil/reach; no constructed floor. | `exec-8909ba85-406e-4416-8c2e-1fb0c4ecc006.png` |
| Mine | Mine diagonally down-right with a chunky steel pickaxe: raise, downswing, low-right impact spark, recovery; grounded boots. | `exec-865e76f1-73b8-44ea-8cf9-abd6b59c4f8e.png` |
| Dig | Dig straight down with a compact two-handed pneumatic spade: raise, drive between boots, compressed impact spark, recovery. | `exec-3d636a46-daf3-49c8-b70b-81713b9fe6e8.png` |
| Tread | Safely tread deep water without baked water: upright/dangling legs, left scull, right scull, compact reset; no floor contact. | `exec-a202f92d-602c-40c6-9c66-eb80198342ed.png` |
| Swim | Swim strongly right without baked water: streamlined reach, pull, opposite reach, recovery kick; near-horizontal silhouette. | `exec-d0702672-b0b6-4bb0-99c2-b2de2fb9caa3.png` |
| Death | Generic non-gory worksite collapse: reel/lamp flicker, one knee, side slump/eyes dim, compact still pose; no blood, fire, water, explosion, or detached parts. | `exec-d15c58b3-17cf-4fe6-95e0-6471d0bf6045.png` |

## Accepted source SHA-256

```text
55372f290428b5ca10ca3577ab983b677a32c540365eb47a1a0273050a7323f3  bash-source.png
4cf0c3b2660bc31df352b31388cc6b59445d3ac16543191307b25ce2e41930d7  block-source.png
b377312a23a8d728e80fb19d67a539187c7fe1b217c97cb351a7735c554bf23c  build-source.png
547f1f904a876bf18e536e5538a9deb2c6343d627171ea832a98c179373900a8  climb-source.png
ec5252b0d963bd174bef9a7ec242ba71d3e577a17d10f43b56b85be4cfcc5787  death-source.png
806c27c55213a0aa6275ad10f2072628d9b4c4f45fd6eec946b7d46aafa63b88  dig-source.png
953c3d165c2aa2c9aeb49beb3066e65cdff29e0207725c4d1516a4289470ad24  fall-source.png
244448613677106cb1123ff2e061f1d52f6502818a2c979ab5222a9ad1db69eb  float-source.png
410a564c5591af2ee44047a42eab064dc3a83ea6bd2ffec477e37a0ef5de0457  mine-source.png
08cc95bffe0ca0c57ffbd7957b2184e75561b28853343ab5e184bb9c6b38c621  shrug-source.png
86498bf5eb4a68b644f55b07178ff93701cb58e7cdcf00d234c6b6f57225a9a6  swim-source.png
288ea7b7d8d794329bc1f1c8c308c0768927a2d9db945e48baefa501b5e61be7  tread-source.png
1011a4d7b13f7a5bf52d47e67576025534848eaa0809d1db6340d200abb63d1d  walk-source.png
```

The runtime atlas is assembled deterministically by
`scripts/build-crew-salvager-actions.py`; it never samples the title splash or
simulation state.
