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
| M0 — contract and provenance | Style contract, runtime/source hashes, prompt/model record, 907×510, 800×450, and 844×390 baselines | Complete for technical rollout; human clearance remains M7 |
| M1 — character vertical slice | Walker + Basher cached atlas; 22–25 CSS-px mobile read; stable feet; touch selection; no sim changes; ≤10% frame regression | Complete in `cfca845`; retained as the rollback boundary |
| M2 — character family | All ten roles and every gameplay state readable by silhouette/prop and in HUD; compact declared atlas; restart memory soak | Complete; three-agent technical GO after adversarial review |
| M3 — terrain/material slice | Dirty-region/chunk strategy precedes richer mutable faces; six materials remain truthful and deterministic; Level 2 + Sand Lab perf | Complete; three-agent technical GO after adversarial review |
| M4 — setpieces and light | Hatch/exit/hazards recognized without labels; lighting never masks crew/material boundaries; reduced motion works | Complete; three-agent technical GO after adversarial review |
| M5 — UI and camera | Required phone/tablet/desktop shapes; 48px controls; no crew occlusion; minimap/manual ownership and grace preserved | Complete; three-agent technical GO after adversarial review |
| M6 — campaign rollout | Levels 1–3 first; screenshots, solvability, full tests/build, 10-minute run, then small reversible batches | Complete; three-agent technical GO after adversarial review |
| M7 — release | All assets human-cleared and inventoried; public name reviewed; debug fail-closed; payload/device/subpath gates; clean tree | Technical gates complete; blocked by human rights/name review, real-device Safari testing, and an uncommitted proof candidate |

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

## Current M2 evidence (2026-08-16)

- One 512×448 atlas holds 52 used 64px cells plus four reserved cells. It is
  146,192 bytes transferred and 917,504 bytes decoded RGBA. The in-repository
  zero-dependency validator checks all 48 body frames at a minimum 48px alpha
  extent, stable non-water/water anchors, and at most 32 colours per authored
  four-frame strip (including the separately quantized canopy).
- Ten roles share the original visor-and-hardhat salvage chassis, with broad
  role-coloured workwear and body-scale hooks, chute pack, hazard sash,
  shields, plank/rivet kit, drill, pick, spade, or swim tank. The bomber uses
  five abstract warning lamps rather than a numeric countdown. Permanent and
  queued roles retain the same body-scale identifiers.
- The HUD fits each complete 64px source cell into a 28×28 view instead of
  cropping its top/right edges. A sandbox-only QA roster captured all nine
  cards together at 844×390; shipped roster filtering is unchanged.
- The full renderer uses 16-world-px horizontal crowd spacing on every level.
  A ten-role Level-9 crowd remains grounded, the unit targeting lane selects
  every ID from an off-centre visible-body tap. Render-only hit regions follow
  the same uniform/gear front order, including both-direction drill/plank tips,
  hooks, and chute packs; a browser hover on a crowded Basher drill at +22px
  selected its exact owner rather than the nearer neighbour.
- Tread/swim alpha ends at the live waterline (`lemming.y + 2`) and the render
  overlay adds only a ripple/wake. A Level-2 live-cell capture shows both poses
  partially submerged without opaque legs painting over the water.
- The worst proxy lane uses ten simultaneous faller-floaters: ten cached body
  images, ten cached canopies, full trait overlays, and active 1×/3× sim. Cached
  vs procedural p95 was 26.1/27.1 ms at 1× (-3.7%) and 27.1/27.1 ms at 3×
  (0%). Ten populated restarts stayed exactly 10 bodies/10 canopies/2
  textures and each fresh level returned to 0/0 without child growth. Raw
  method and counts are in
  `output/playwright/m2-worst-case-render-evidence.json` (ignored QA evidence).
- The complete deterministic/unit/solvability suite passes 186 tests. The
  atlas validator, compiled player, CrazyGames verifier, final mobile capture,
  and three-agent adversarial re-review are rerun after every candidate fix;
  this section is evidence for review, not a release-clearance claim.

## Current M3 evidence (2026-08-16)

- Terrain mutations now invalidate persistent 32×32-cell render chunks instead
  of clearing and rebuilding the whole level. The largest campaign terrain is
  75 chunks; Level 10 held exactly 75 terrain objects, 83 scene children and
  two texture keys across ten restarts with no lifecycle climb.
- Dirty tracking expands by one authoritative cell before mapping to chunks, so
  cuts on a seam refresh the material faces on both sides. Unit coverage proves
  one local edit redraws one chunk while a seam edit redraws the four touching
  chunks. This metadata never changes material values or advances either RNG.
- All texture, strata, panel, grain, foam and edge treatments are derived from
  current `Terrain` cells and the coordinate hash. In the Level-7 browser lane,
  79 timber/43 flame cells rendered before settling; after burn, both counts
  reached zero and their geometry disappeared while all 80 protected water
  cells and their animated surface remained.
- The Level-2 hydraulic-lock lane retained 135 live water cells, raised all 54
  timber cells to world Y 426, and confined animation redraws to two of its 15
  terrain chunks. The canonical scripted solution still reaches the quota.
- On the 64,800-cell finale, the same richer draw function measured 1.0ms p95
  for a full Graphics sweep versus 0.1ms p95 for a local edit through a fully
  populated 75-object cache. The local lane averaged 1.09 chunks and never
  redrew more than two.
- An 844×390 Chromium proxy with simultaneous sand, water, wood and fire
  activity measured 95.2 median FPS at 1× and 91.7 at 3×. Terrain rendering was
  0.4ms p95 at both speeds, averaging 8.90/11.07 redrawn chunks per frame and
  peaking at 16/17. Raw method and arrays are retained in
  `output/playwright/m3-terrain-cache-evidence.json` (ignored QA evidence).
- The complete deterministic/unit/solvability suite now passes 190 tests, and
  the production build plus compiled 844×390 player path pass. The only browser
  console error is the existing missing `favicon.ico`; real iPhone Safari
  thermal/memory profiling remains a later release gate.
- Character/readability, world-truth and production/performance adversarial
  reviewers all returned technical GO. The CrazyGames proof verifier passes at
  eight files / 4,844,492 bytes with artifact SHA-256
  `5d1f1c801a5be0c20e9907c2f55f8224d1fc9a39e615864fd0bffd0bea9b95af`;
  it remains proof-only while 14 human provenance decisions are unresolved.

## Current M4 evidence (2026-08-16)

- Hatch, exit, trap, hazard and emitter rendering now live in the dedicated
  `WorldSetpieces` module. The hatch remains an amber cargo aperture and the
  exit a mint inward-chevron transit arch; neither fills its gameplay volume
  with a fake solid face.
- Each 14×28 trap trigger gains a 36px suspended warning rail and a shared
  danger diamond above the route. Unit geometry checks cover crusher, zapper
  and chomper: every rectangle at route height stays within the original
  trigger plus the existing three-pixel mechanism posts. The larger silhouette
  never changes or misrepresents the simulation trigger.
- Final compiled-player 844×390 captures show the crusher, zapper and chomper
  in planning plus their killing-cycle states. Authored hazard bodies and warning
  lips stay exactly on their death-zone width, including odd-width zones.
  Emitter housings remain above the material spawn cell; their drip appears only
  while the simulation is advancing, the budget is live and that authoritative
  cell is empty, so planning, paused and blocked emitters never promise flow.
- Terrain is depth 0, additive light depth 6, setpieces depth 10, cached crew
  around depth 20, shared actor/gear overlays depth 21 and FX depth 30. Lighting
  cannot paint over crew silhouettes, role gear or selection affordances, and
  no full-screen filter or RenderTexture was added.
- The live render-only reduced-motion controller freezes decorative presentation
  time at zero for rain, material shimmer, lamps, setpiece pulses, crowd jitter
  and light breathing; impact camera shake and flash, ambient sparkles and
  fast-forward streaks are suppressed. A media-query change takes effect without
  reload and its listener is removed with the scene lifecycle. Fixed simulation
  ticks and essential trap-cycle state continue unchanged.
- A ten-crew final compiled Level-6 proxy measured 86.2/92.6 median FPS at
  1×/3× with 27.1ms p95 in both lanes. Raw method, live preference values,
  final screenshot paths and exact artifact/source hashes are retained in
  `output/playwright/m4-setpiece-evidence.json` (ignored QA evidence).
- The deterministic/unit/solvability suite passes 196 tests. The production
  build and compiled proof verifier pass at eight files / 4,846,720 bytes with
  artifact SHA-256
  `db5b62a43b4930af36e5826b1ec78213ba2a70b56b051a6b770ae8e72ef4769a`.
  The proof remains explicitly non-release-cleared while 14 human provenance
  decisions remain unresolved. Character/readability, world-truth and production
  reviewers all returned technical GO on the hash-bound final candidate.

## Current M5 evidence (2026-08-16)

- The final compiled player passes 844×390 Mobile Chromium and WebKit proxy
  lanes, 1194×834 iPad landscape, 834×1194 iPad portrait, 907×510 and
  800×450 desktop, 390×844 phone portrait, and a 390×844 portrait-shaped
  Desktop window. Capability classes stay Mobile on phone/iPad and Desktop on
  the narrow desktop; only Mobile receives the portrait rotation surface.
- The phone/compact-desktop ribbon is a bounded single 58px row. At 844px all
  eleven tools fit with no scroll (`548px` client/scroll width); at 800px the
  full rail likewise fits exactly (`528px`). Real Mobile Chromium and WebKit
  taps selected Bomb then Basher. The portrait-shaped Desktop keeps a 58px dock
  and a scrollable 118/528px rail whose first and last tools each expose their
  full 48px target at the corresponding endpoint.
- Every visible interactive target in the matrix is at least 48 CSS px. The
  minimap is now a fixed 182×48px capture surface with `touch-action: none`.
  Short-landscape briefing width is 400px when the minimap is present, avoiding
  any overlap at 800/844/907px; narrow Desktop portrait moves the minimap below
  its 219px canvas instead of covering the briefing or route.
- Camera attention receives the clipped rectangles for the status, mission,
  action cue, Hero panel, dock, queue and minimap. A corner-overlay regression
  moves an upper-right event target clear of the minimap without reserving that
  corner as a wasteful full-width top strip. The final 844×390 Hero lane selected
  `Milo · Walker · Walking · Digger` from a tap eight CSS pixels left of the
  visible body centre at 1.2×, then kept the selected crew and ring above the
  Hero panel at 3.2×. Commit measured 75.48×48px and Cancel 56.92×48px.
- The 1.2× scrolling-camera model now passes visible-world rectangles into
  Phaser and pads raw bounds by the zoom crop. Level 4 opens at world view
  `(0,163,800,450)`, Start pans horizontally without changing Y, and a spawned
  crew foot measured at client Y 215 versus dock top 326 (110.7px clearance).
  The render-only crew hit radius remains exactly 48 CSS px in that phone lane.
- A real minimap drag owned the camera completely at world X 1673. An attempted
  event focus changed neither position nor pan state while held; release armed
  exactly 1,600ms grace, the same event was rejected at 900ms and accepted after
  1,750ms. A manual gesture then cancelled the event pan immediately and renewed
  the full grace. Minimap endpoints resolve exactly to visible-world X 0/2080.
  Scripted motion is limited to Start, first escape and death events and always
  yields to drag, pinch, wheel, arrows, edge-scroll and minimap ownership.
- Minimap ownership now tracks its pointer independently from browser capture.
  A forced `lostpointercapture` cleared ownership and fired the 1,600ms release
  grace exactly once; a second pointerdown immediately recaptured pointer 1.
  Released touch positions can no longer activate desktop edge-hover scrolling.
- The phone portrait rotate surface and landscape Resume surface are true nested
  modals. Portrait exposes only the rotate dialog, Enter cannot activate the
  hidden title/game, and a persisted `pagehide`/`pageshow` re-arms ownership.
  After rotation, Resume alone owns focus while the HUD is inert; activation
  restores the exact pre-rotation Restart control.
- The deterministic/unit/solvability suite passes 199 tests and the 52-frame
  atlas validator, production build and CrazyGames proof verifier pass. The
  exact final proof is eight files / 4,856,086 bytes with artifact SHA-256
  `831e2dec3ed3185763ef80046208c62d45154d66f371beb642483e740c6522c4`.
  Machine-readable viewport, camera, source-hash and screenshot evidence is in
  `output/playwright/m5-ui-camera-evidence.json` (ignored QA evidence). Real
  iPhone Safari hardware profiling remains an M7 release gate, not represented
  by the WebKit proxy.

## Current M6 evidence (2026-08-16)

- The exact final compiled player was recaptured at 844×390 in both planning
  and running states for every campaign level. All twenty images are named
  `output/playwright/m6-final-level-{01..10}-{planning,running}-844x390.png`.
  The full matrix retains readable authored routes, materials, setpieces,
  roster controls, hatch/exit landmarks and crew clearance above the dock.
- Locked Levels 1–2 remain at zoom 1 and scroll X 0, but now apply measured
  HUD-safe vertical framing after the dock exists. Final captures include the
  complete initial catch/timber geometry, Level-1 dam breach plus live water
  rise and crossing crew, and Level-2's ten finite water stamps lifting the
  timber route to the banks. The player cannot pan either room and no level
  geometry or collision state changed.
- Hero visibility and enabled state now use the same assignability contract as
  scene arming. Zero-skill locked Levels 2 and 7 hide the control; an armed
  brush/world/placement tool disables it; selecting an assignable crew skill
  restores it. Active Hero phases remain visible but cannot be re-armed.
- Hero camera ownership is explicit. An active minimap vetoes focus; minimap,
  touch, drag, pinch, wheel, keyboard and edge-pan input after focus cancel the
  saved return frame and in-flight camera tweens. A pre-focus release grace no
  longer strands the player at 3.2×. The compiled sequence captures a minimap
  frame, immediate Hero focus, one committed beat and return to the selected
  frame. Separate focus/resolving blur–Resume lanes preserve the Hero phase,
  then Cancel/finish returns to normal zoom with the panel removed.
- The exact-final Level-10 compiled soak ran 602.747 wall-clock seconds at 3×
  and made eight scheduled restarts. Its 46,690 real-rAF samples measured
  11.2ms p50, 26.7ms p95, 27.2ms p99 and 36.6ms maximum, with no gap above
  50ms, no WebGL context loss and no page exception. DOM/HUD/canvas/button and
  resource counts stayed exactly flat after warm-up. Unforced-GC heap samples
  remained bounded at 69.7–93.5MB and finished at 73.4MB versus 88.7MB at
  start; this is proxy trend evidence, not a precise or real-device memory
  claim. The sole console entry was the known browser-shell `favicon.ico` 404.
  Raw arrays, timestamps, samples, restarts, source hashes and artifact binding
  are retained in `output/playwright/m6-final-600s-soak-raw.json`.
- Dedicated earlier lifecycle lanes remain the authority for internal object
  counts: M2's ten restarts held 10 body images, 10 canopies and two textures,
  returning to zero cached crew on every fresh level; M3's Level-10 lane held
  75 terrain chunks, 83 scene children and two texture keys across ten
  restarts. The production player intentionally exposes no `window.game`, so
  the compiled soak does not invent Phaser-internal counts.
- The complete deterministic/unit/solvability suite passes 203 tests in 27
  files, including one scripted win for every campaign level and the final
  camera/Hero regressions. TypeScript, the 52-frame/13-strip atlas validator,
  production build, diff check and CrazyGames proof verifier pass. The proof
  artifact is eight files / 4,856,868 bytes with SHA-256
  `493ea0c311e844da5216310d55a5dc40c5743ad5a0884c21b1fbe7196827a0d1`.
  Machine-readable rollout evidence is retained at
  `output/playwright/m6-campaign-rollout-evidence.json`.
- Character/readability, world-truth/camera and production/performance
  adversarial reviewers all returned final technical GO. M7 remains
  deliberately fail-closed on real iPhone/iPad Safari hardware testing,
  fourteen human provenance decisions, public name/logo review, user-approved
  milestone commits and a clean-tree rebuild.

## Current M7 technical evidence (2026-08-16)

- The exact technical candidate passes 203 tests in 27 files, all ten scripted
  campaign solutions, TypeScript, the 52-frame/13-strip atlas validator,
  CrazyGames build, proof verifier and diff check. Its eight-file payload is
  4,856,906 uncompressed bytes with SHA-256
  `71cd55251c9679854e0b69849e85e7dadd323798d9d712dc854da1c24a11eb96`,
  below the 20MB release budget. The verifier still reports 14 unresolved human
  provenance decisions and therefore remains proof-only.
- A data-URL favicon prevents the browser shell from issuing the previous
  `/favicon.ico` request. Fresh compiled title-to-game smoke tests at 844×390
  Mobile and 907×510 Desktop recorded zero failed requests, HTTP errors,
  console warnings/errors or page exceptions. The compiled player exposes no
  Dev Sandbox control. The small title footer remains because the user
  explicitly requested build/runtime context; it includes the player mode and
  device profile, but exposes no interactive Sandbox control, prototype roster,
  or hidden debug tooling.
- The identical `dist` was mounted at `/games/lemmingx/`. Its JS, CSS, backdrop,
  character atlas and title splash all resolved beneath that prefix, with no
  root-relative leak, failed request, 4xx/5xx response or console/page error.
  Title and gameplay screenshots are retained under
  `output/playwright/m7-final-{phone,desktop,subpath}-*.png`.
- The final Level-10 compiled soak ran 604.206 wall-clock seconds at 3× with
  eight scheduled restarts. Its 40,945 real-rAF samples measured 12.8ms p50,
  27.1ms p95, 35.0ms p99 and 45.7ms maximum, with no gap above 50ms, no WebGL
  context loss, no console warning/error and no page exception. DOM, HUD,
  canvas, button, minimap and resource counts stayed exactly flat. Unforced-GC
  heap samples ranged from 69.5–94.6MB and finished at 85.4MB versus 91.1MB at
  start; this is bounded Chromium-proxy trend evidence, not precise leak or
  real-device memory proof. Raw arrays and hash bindings are retained at
  `output/playwright/m7-final-600s-soak-raw.json`; the consolidated record is
  `output/playwright/m7-technical-release-evidence.json`.
- Technical completion does not clear release. Real iPhone and iPad Safari
  hardware touch/thermal/memory/crash testing is still required. A human must
  clear all 14 originality/commercial-rights records and review the public
  `Lemmings X` name/logo for brand confusion. The working tree also remains
  intentionally dirty until the user authorizes the milestone commit and push.
  The exact device journeys, sign-off fields, clearance records, and post-commit
  binding sequence are consolidated in `docs/m7-release-signoff.md`.
