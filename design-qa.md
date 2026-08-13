# Design QA — Industrial cavern reskin

Historical evidence captured on 2026-07-13. Test counts and local-server details
below describe that pass; current release validation lives with the CrazyGames
candidate proof packet.

## Comparison target

- Source visual truth: three generated industrial-cavern concept frames retained
  in the creator archive (not part of the runtime or repository).
- Browser-rendered implementation:
  - `.artifacts/design-qa/level10-planning-1280x720.png`
  - `.artifacts/design-qa/level7-fire-light-1280x720.png`
  - `.artifacts/design-qa/level-select-1280x720.png`
- Local implementation: Vite development server (the assigned port was `5174`).
- Primary viewport: 1280 × 720 CSS pixels.
- Resilience check: 1024 × 640 CSS pixels.
- Primary state: Level 10, paused pre-release planning state, full HUD visible.
- Supporting state: Level 7 with a finite Fire charge painted into a timber choke, showing live fire emission.

The source concepts are an art-direction target rather than a literal level-layout replacement. Existing campaign geometry, camera behavior, simulation footprint, and solvability scripts were intentionally preserved.

## Full-view comparison evidence

The source and implementation were opened together at original detail in one comparison pass. The implementation preserves the source's major visual hierarchy: dark rainy industrial skyline, warm earth cross-section, moss/surface highlights, yellow-black hatch, cyan/mint goal language, glass-black status and mission panels, and a compact bottom control dock. The live camera shows a closer slice of the existing wide level than the composed concept screen; that is an expected gameplay constraint, not layout drift introduced by this reskin.

The Level 7 supporting capture confirms the requested new lighting state: the hatch torch, painted fire cells, powered goal, lava, emitters, and zapper traps contribute small additive pools without turning light into a visibility mechanic.

No focused crop was needed. At 1280 × 720 the full-view captures keep the status bar, mission typography, dock labels, terrain treatment, hatch, and fire-light pool readable at original detail. The separate Level 7 capture isolates the only additional state that could not be judged from the Level 10 planning view.

## Required fidelity surfaces

- Fonts and typography: the existing system sans stack remains legible and closely matches the concepts' compact utilitarian UI. Hierarchy, weights, line height, mission wrapping, and small dock text are coherent. No truncation was observed at 1280 × 720 or 1024 × 640.
- Spacing and layout rhythm: top status, left mission, minimap, and bottom dock retain the source grouping and do not overlap at the primary viewport. At 1024 × 640 the level-select panel fits without document overflow; its lower edge has only a one-pixel safety margin, classified as follow-up polish.
- Colors and tokens: navy/ink backgrounds, cyan outlines, mint success, gold interaction, brown dirt, green moss, steel grey, blue water, wood brown, sand gold, and orange fire are consistently mapped through shared tokens or matching HUD colors.
- Image quality and asset fidelity: the generated industrial skyline is a real 1672 × 941 raster asset, scaled as a low-contrast parallax background without obvious halos or mismatched crop. Terrain and crew remain intentionally procedural because they must reflect mutable deterministic simulation state; no photographed or promotional image substitutes were used.
- Copy and content: existing objectives, hints, counters, queue controls, and campaign names are preserved. The build tag identifies the active reskin without adding permanent gameplay instructions.
- States and interactions: level selection, Level 10 load, Fire selection, finite-charge painting, planning-to-running transition, and outcome navigation were exercised successfully. Fire stock decremented from 2 to 1 and the painted material emitted light.
- Accessibility: semantic buttons and labels remain present, focus styling is retained, panel text contrast is strong, and no control became unreachable in the compact desktop check. Reduced-motion behavior was not separately exercised; rain and light animation remain decorative.

## Findings

- [P3] Live terrain is intentionally more schematic than the concept illustration.
  - Location: mutable terrain cross-section.
  - Evidence: the concepts use hand-placed grass clumps, roots, and chunky timber detail; the implementation uses stable coordinate-hashed material texture so every painted/carved cell remains deterministic and cheap to redraw.
  - Impact: the direction reads correctly, but close inspection is less painterly.
  - Follow-up: add a render-only surface-decoration pass with a strict density cap; do not change the terrain bitmap or collision geometry.

- [P3] Compact level select has minimal vertical breathing room.
  - Location: `.select__panel` at 1024 × 640.
  - Evidence: the panel ends at y=639 in a 640px viewport, with no document overflow.
  - Impact: usable, but visually tight on short desktop windows.
  - Follow-up: reduce vertical card gaps or add a short-height media query if 640px-tall windows become a target.

No actionable P0, P1, or P2 differences remain.

## Comparison history

- Pass 1: compared the primary source concept and the browser-rendered Level 10 planning capture together. No P0/P1/P2 issue was found. The denser concept terrain and wider composed camera were classified as expected differences because changing campaign geometry or camera scale would alter established play and solvability.
- Supporting-state check: compared the concept's warm practical-light language against the Level 7 painted-fire capture. The torch/fire emission is visible, bounded, and consistent with the source palette; no blocking fix was required.
- Compact-layout check: 1024 × 640 had no horizontal or vertical page overflow. The one-pixel lower safety margin is recorded as P3.

## Browser verification

- Page load: passed; meaningful level-select content and canvases rendered.
- Error overlays: none.
- Console warnings/errors: none.
- Primary interactions tested: level select, open Level 10, open Level 7, select Fire, paint fire into wood, start the run, observe animated burn/light state, and return through the outcome flow.
- Production verification: `npm test` passed 120 tests; `npm run build` passed.

## Implementation checklist

- [x] Industrial skyline and rain backdrop.
- [x] Material-specific terrain rendering with deterministic visual variation.
- [x] Industrial hatch and powered exit treatment.
- [x] Additive, render-only practical lights for torch, fire, exit, lava, emitters, and zapper traps.
- [x] HUD, minimap, level-select, and feedback palette aligned to the concepts.
- [x] Browser, console, compact-layout, test, build, and campaign-solvability verification.

final result: passed
