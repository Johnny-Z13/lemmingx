# Lemmings X presentation gauntlet

## Experience contract

The player should feel clever and protective while a tiny, brave salvage crew
survives a huge living machine-world that the player reshapes.

The title splash is a mood and hierarchy reference, not a sprite source. Runtime
art must use an original industrial salvage-crew chassis, deep navy machinery,
warm amber practical lights, cyan water/exit energy, and strong material edges.
Crew, hazards, editable materials, hatch, and exit always outrank decoration.

Do not trace, crop, or reconstruct splash pixels or silhouettes. Do not restore
green swept hair, exposed-face/smock anatomy, numeric fuse countdowns, or other
recognizably adjacent motifs. Presentation remains render-only: no art pass may
write display offsets into simulation coordinates, change collision geometry,
or advance the CA/release random streams.

## Milestone gates

| Gate | Acceptance evidence | Current state |
|---|---|---|
| M0 — contract and provenance | Style contract, runtime/source hashes, prompt/model record, 907×510, 800×450, and 844×390 baselines | In progress; contract and asset records exist, full baseline matrix remains |
| M1 — character vertical slice | Walker + Basher cached atlas; 22–25 CSS-px mobile read; stable feet; touch selection; no sim changes; ≤10% frame regression | In progress; first adversarial review was NO-GO and its correctness fixes are being gated |
| M2 — character family | All ten roles and every gameplay state readable by silhouette/prop and in HUD; compact declared atlas; restart memory soak | Not started |
| M3 — terrain/material slice | Dirty-region/chunk strategy precedes richer mutable faces; six materials remain truthful and deterministic; Level 2 + Sand Lab perf | Not started |
| M4 — setpieces and light | Hatch/exit/hazards recognized without labels; lighting never masks crew/material boundaries; reduced motion works | Hatch/exit slice implemented; hazards remain |
| M5 — UI and camera | Required phone/tablet/desktop shapes; 48px controls; no crew occlusion; minimap/manual ownership and grace preserved | 844×390 desktop/mobile active paths pass; full matrix remains |
| M6 — campaign rollout | Levels 1–3 first; screenshots, solvability, full tests/build, 10-minute run, then small reversible batches | Not started |
| M7 — release | All assets human-cleared and inventoried; public name reviewed; debug fail-closed; payload/device/subpath gates; clean tree | Blocked by human rights/name review and unfinished milestones |

## M1 slice constraints

- Source: one generated eight-frame side-view strip, preserved under
  `docs/assets/sources/`, normalized by
  `scripts/prepare-generated-sprite-strip.py` into an eight-cell 64px atlas.
- Runtime: cached Phaser images for plain Walker and Basher on Level 1 only.
  Fuse, trait, queued-role, fall, shrug, and unsupported-job affordances retain
  the complete procedural renderer until their prop/state sheets pass M2.
- Camera: scrolling levels default to 1.2×; Levels 1–2 remain exact locked rooms.
- Crowds: stable ID-ordered horizontal fan-out keeps feet on each simulation
  ground line; job/fuse changes never change a crew member's display slot.
- World slice: the cargo gantry and powered transit gate surround, but never
  alter, the authored hatch and exit coordinates.

## Kill conditions

Stop rollout if the slice needs simulation/collision changes, hides crew behind
the ribbon, causes manual/minimap camera fighting, consumes seeded randomness,
blurs at normal zooms, exceeds the declared mobile frame budget, or cannot pass
clean-room and provenance review.

## Current M1 evidence (2026-08-15)

- The packaged CrazyGames proof contains seven files / 4,687,170 uncompressed
  bytes and passes the player-only, relative-asset, payload, hash, and complete
  `public/assets/**` inventory checks. It remains explicitly proof-only because
  thirteen provenance records require human review.
  Its tracked metadata is explicitly labelled a pre-merge working-tree build;
  it is not represented as proof of a self-referential final commit.
- At 844×390, the Level-1 atlas paints at about 24.3 CSS px. An off-centre
  touchscreen tap on the visible body selected crew ID 9, consumed Basher stock,
  preserved that ID through the dam action, and left the locked camera at 1×.
- A headless Chromium iPhone-landscape proxy with ten crew measured cached vs
  procedural real-RAF p95 at 26.6 vs 26.4 ms at 1× (+0.8%), and 26.4 vs 26.8 ms
  at 3× (-1.5%). This satisfies the ≤10% proxy gate but does not replace real
  iPhone Safari profiling.
  Raw method, environment, samples, and restart arrays are retained at
  `output/playwright/character-killtest/m1-render-evidence.json` (ignored QA
  evidence, never part of the player artifact).
- Ten Level-1 restarts held scene children at 10 and texture keys at 2 with no
  monotonic image-count growth. Scene shutdown and level changes explicitly
  destroy and clear the cached-image map.
- A held Level-4 minimap drag retained its chosen scroll position while owned;
  release set 1,600 ms grace, and the camera remained at that position after
  both 900 and 2,100 ms because no explicit focus event occurred.
- Absolute minimap jumps now preserve the chosen X while short-room Y uses the
  measured dock-safe frame. At 844×390, a mid-map Level-4 jump placed the route
  at client Y 180 versus dock top Y 314 instead of hiding it under the ribbon.
- The Level-4 gantry never paints the bashable wall or a synthetic water edge.
  Browser checks carved 112 dirt cells and showed the wall disappear while the
  gantry remained; erasing the marsh removed all cyan while its rear railing
  remained.
- The compiled title tree contains only the labelled modal, focuses Start, and
  marks the background inert/aria-hidden. After Start, those states restore and
  the gameplay/briefing controls return to the accessibility tree.
- The full deterministic/unit/solvability suite passes 177 tests. The compiled
  844×390 player was also exercised from title to Level-1 planning with no
  Sandbox UI and only the known missing `favicon.ico` request in the console.
