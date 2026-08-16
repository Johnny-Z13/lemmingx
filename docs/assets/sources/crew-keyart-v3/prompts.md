# Key-art crew V3 generation record

Generated for this repository on 2026-08-16 through OpenAI's built-in image
generation available to the user's Pro account. The requested direction was
GPT Image 2.0; the built-in interface did not expose a backend model identifier
or seed, so this record does not invent either. All outputs remain
prototype-only pending human originality, commercial-rights, and public-brand
review.

`public/assets/title-splash.png` was supplied only as a visual-language
reference: compact rounded workers, one dominant capability colour, a nearly
black face window, and two bright eyes. The prompts explicitly prohibited
tracing, copied pixels, or a recognizable copyrighted character design.

## Shared identity and layout contract

Each body strip requested exactly four separated equal-scale poses in one
horizontal row, consistent proportions and bottom-centre anchoring, crisp
16-bit pixel clusters, a restrained palette, a neutral near-white/light-grey
body suitable for runtime capability tinting, a dark face window, exactly two
bright eyes, short limbs, and a compact rounded cap with a small top knot.

Every request excluded hard-hat brims, harnesses, cross shapes, chest stripes,
badges, backpacks, logos, text, labels, UI, scenery, floors, shadows, extra
characters, presentation cards, and borders. A flat white background was used
because the built-in generator returned RGB output; edge-connected neutral
pixels are removed deterministically during normalization.

## Accepted action directions and output identifiers

| Strip | Accepted direction | Built-in output |
|---|---|---|
| Walk | Neutral stand, walk contact, passing pose, opposite contact; same right-facing rounded worker and anchor. | `exec-47e55d42-71fe-4729-8d82-07ff18a835c2.png` |
| Bash | Brace, forward thrust, tiny contact spark, recoil with a single neutral chunky pick/drill. | `exec-016df42e-81c1-4cea-a2de-b5f4200abf0b.png` |
| Fall | Startled drop, splayed flail, opposite flail, compact reset; no implied floor contact. | `exec-dd7e3765-5c77-4fe5-8801-09d444c7b300.png` |
| Shrug | Neutral, shoulders and open palms raised, settle, neutral recovery. | `exec-ffe1011c-4f5a-4c03-8732-5c640e69eeef.png` |
| Climb | Alternating raised hands and boots in a free-climb loop without wall or rope. | `exec-d0c50e77-8ea3-46f9-a430-55ba2609fef4.png` |
| Block | Wide planted stance, both palms out, firm hold, stable reset; no warning symbol. | `exec-04239700-0276-47f4-bf76-262bd5a32ce0.png` |
| Build | Carry, reach, place one neutral plank/brick with tiny spark, recover; no constructed floor. | `exec-d686657e-2728-4549-b838-480d4856217a.png` |
| Mine | Raise, swing, low-right impact with tiny spark, recover using one neutral pickaxe. | `exec-453d60f8-7c97-480f-a4fe-664a2f4150bf.png` |
| Dig | Raise, drive between boots, compressed impact with tiny spark, recover using one neutral spade. | `exec-1192b2e0-ef2b-4dc6-9c77-700467c43efd.png` |
| Tread | Upright deep-water scull loop with dangling legs and no baked water. | `exec-14b9de75-3c8b-415b-be36-eab6eec34a89.png` |
| Swim | Near-horizontal forward reach, pull, opposite reach, recovery kick with no baked water. | `exec-41640b7f-0d8b-4ffc-9728-2f6c669dc861.png` |
| Death | Non-gory reel, kneel, side slump, still collapsed pose with dimmed eyes. | `exec-f83bbf18-1fab-415d-8a78-255ad13bcfc6.png` |
| Float | Four complete compact parachute poses with neutral canopy and two simple suspension lines. | `exec-9b216f7c-f0e2-40cd-aaf3-fe0b88fc281a.png` |

## Deterministic transformation

Each body source is split into four equal slots, stripped of edge-connected
neutral background, normalized once at shared scale into 64×64 cells,
quantized to at most 32 colours, and alpha-thresholded at 24. The packer raises
sub-48px poses to the readability floor, clips tread/swim at the live waterline,
extracts and quantizes the parachute canopy, and packs 52 used frames into a
512×448 atlas. Runtime Phaser tint applies one dominant role colour to the
generated neutral master; no colour or identity enters simulation state.
