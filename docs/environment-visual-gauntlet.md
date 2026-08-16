# Environment visual gauntlet

## Gauntlet Card v1

- Status: APPROVED
- Approved by: user
- Date: 2026-08-16
- Artifact revision: `8ca1535474fa8523a0c8e97ccd61109550c2a7e9` plus the preserved character, terrain-icon, and touch-label working-tree pass

### Objective

Bring the playable world materially closer to `public/assets/title-splash.png`
through stronger saturation, material depth, atmospheric layering, and practical
lighting. Preserve the current character readability, diamond-exit identity,
mobile ribbon, camera ownership, and deterministic living terrain.

### Target and translation boundary

- Primary reference: `public/assets/title-splash.png`.
- Transfer: deep navy negative space; saturated gold sand; luminous cyan
  water/energy; hot orange fire; warm practical lamps; layered industrial depth;
  and a clear foreground/material/crew hierarchy.
- Do not copy: pixels, characters, structures, portal geometry, scene layout,
  logo, or protected visual identity from the reference.
- Runtime remains 2D Phaser. No simulation, collision, level geometry, camera,
  UI layout, or gameplay change belongs to this pass.
- A clean-room replacement parallax backdrop is allowed only as an in-place
  replacement for the existing full-screen texture. No second resident backdrop,
  post-process, full-screen filter, bloom, or RenderTexture.

### Candidate evidence matrix

- Scenes: campaign Levels 1, 2, 6, 7, and 10 plus active Sand Lab.
- States: planning and running; live water, lifted timber, traps, fire, sand, and
  multiple material families.
- Viewports: 844x390 Mobile/touch proxy; 800x450 and 907x510 Desktop.
- Modes: normal motion and reduced motion.
- Capture: compiled player, matched camera/state wherever practical, reference
  and candidate normalized before visual comparison.
- Evidence directory: `output/playwright/environment-gauntlet/`.

### Pointwise rubric

- [x] Saturation is materially richer than the baseline without crushing dark detail.
- [x] Practical lights visibly affect nearby structures and materials.
- [x] Dirt, steel, sand, water, wood, and fire are immediately distinguishable.
- [x] Crew, hazards, hatch, and exit outrank decoration at phone size.
- [x] Mutable material art remains truthful after carve, burn, flow, settle, and erase.
- [x] UI and camera framing never obscure important crew or routes.

### Deterministic gates

- [x] Full test, solvability, atlas/icon validation, production build, and player proof pass.
- [x] No `src/sim` change and no seeded-RNG boundary change.
- [x] Active-material mobile-proxy p95 frame time regresses no more than 10%.
- [x] Reduced motion, touch targets, modal ownership, minimap ownership, and camera grace survive.
- [x] Uncompressed player payload remains below 20 MB.
- [x] New runtime assets are inventoried fail-closed; human rights/name clearance stays explicit.

### Comparison and bounds

- Blind baseline/candidate labels and reversed-order repeats are required when practical.
- PASS requires every observable rubric item, every deterministic gate, and a
  candidate win in both display orders at medium or high confidence.
- Missing evidence, order disagreement, or low confidence is INCONCLUSIVE.
- Maximum three coherent rounds. Stop after two rounds without material gain.
- New gameplay, camera, simulation, geometry, additional full-screen textures,
  or a changed visual bar requires a revised card and human approval.

### Roles

- Orchestrator/builder: root Codex agent.
- Evidence verifier: independent agent against the compiled player.
- Fresh-context critic: read-only blinded reference/candidate reviewer.
- Integration critic: adversarial whole-game presentation/performance reviewer.
- Human reviewer: user on iPhone; final authority for taste and permission to ship.

### Evidence retention

Retain final evidence and every round report under the approved evidence path.
Failed reports remain available so a retry must change strategy. Release rights,
brand review, and real-device thermal/memory clearance remain separate gates.

## Final result

- Completed rounds: 3 / 3.
- Pairwise: the richer candidate won both sealed display orders at medium confidence.
- Integration: character/readability, world-truth, and production/performance reviewers returned technical GO on the final source-bound candidate.
- Validation: 29 files / 214 tests; 52-frame crew validator; seven-icon validator; deterministic Levels 1–3 proof; CrazyGames build and verifier.
- Exact proof: 14 files / 4,376,579 bytes / SHA-256 `f45716fb04c96d43456aa4ba97b79dfc9041c20582f96ca7dd3b9642f3d3d047`.
- Matched performance at 844x390: candidate p95 26.8ms at 1x and 26.9ms at 3x versus baseline 27.0/27.0ms; ratios 0.993/0.996; zero intervals over 50ms.
- Evidence: `output/playwright/environment-gauntlet/environment-round-2-evidence.json` plus retained reports `round-1-report.md`, `round-2-report.md`, and `round-3-report.md`.
- Technical gauntlet: passed.
- Public release: still fail-closed pending human originality/commercial-rights and public-name review, plus real iPhone/iPad Safari hardware testing.
