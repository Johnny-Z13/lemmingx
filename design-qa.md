# Design QA — final environment visual gauntlet

## Target and scope

- Reference: `public/assets/title-splash.png` as a mood, colour, depth and hierarchy reference only.
- Runtime target: compiled Phaser player at 844×390, with supporting 800×450 and 907×510 captures.
- Protected boundaries: no simulation, level geometry, camera policy, UI layout or RNG changes; no copied reference pixels, characters, portal geometry or scene layout.

## Visible result

- The world now uses deep navy industrial negative space with warmer practical pin lights and substantially stronger layered depth.
- Dirt, steel, sand, water, wood and fire have independent hue, value and pattern cues. Gold sand, cyan water and hot orange fire provide the selective saturation visible in the reference without globally grading the scene.
- The existing diamond exit remains the unique mint objective. Hatch, hazard diamonds, crew silhouettes, selected gear and the mobile ribbon retain priority over scenery and light.
- The final light batch lands horizontally on nearby terrain rather than reading only as detached circular halos. It remains below setpieces and crew and adds no global filter, bloom or screen-wide wash.

## Hard-state evidence

- Mixed live roles plus selected Basher across saturated sand, wood and water.
- Level 2 live water, lifted timber and crossing crew.
- Level 6 crew at trap approach and contact.
- Sand Lab active fire before and after authoritative erase.
- Level 10 final compiled material/performance state at 844×390.
- Reduced-motion Level 6 and Level 10 at 800×450 and 907×510.

Evidence and exact hashes are retained under `output/playwright/environment-gauntlet/`; the consolidated record is `environment-round-2-evidence.json` and the three round reports remain alongside it.

## Visual review outcome

- The sealed candidate won both reversed A/B display orders at medium confidence.
- Character/readability review: GO.
- World-truth/material review: GO.
- Production/performance review: GO.
- Largest accepted difference: the mutable cell terrain remains more schematic than the painted title because every carved, flowed, burned and erased cell must stay visually truthful.

## Technical verification

- 29 Vitest files / 214 tests pass, including every campaign solvability script.
- 52-frame crew atlas and seven terrain-tool icons validate.
- Deterministic Levels 1–3 proof, TypeScript/Vite build and CrazyGames verifier pass.
- Final proof artifact: 14 files / 4,376,579 bytes / SHA-256 `f45716fb04c96d43456aa4ba97b79dfc9041c20582f96ca7dd3b9642f3d3d047`.
- Matched 844×390 p95: candidate 26.8ms at 1× and 26.9ms at 3×; old-backdrop baseline 27.0/27.0ms; ratios 0.993/0.996; zero intervals over 50ms.
- No `src/sim` or `src/levels` diff.

## Release boundary

Technical merge is green. Public release remains fail-closed pending human originality/commercial-rights review for the 14 unresolved records, public-name/logo review, and real iPhone/iPad Safari hardware touch/thermal/memory testing.

final result: passed
