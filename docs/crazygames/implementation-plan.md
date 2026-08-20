# LemmingX CrazyGames Early Candidate — Implementation Plan

> **Historical record (superseded 2026-08-20).** This local-proof plan predates
> the integrated product and single runtime-selected portal artifact. Do not run
> its retired build-split, no-SDK, dirty-tree, branch, or stop-condition
> instructions. Use `docs/product-status.md`, `docs/platform-runtime.md`, and
> `AGENTS.md` for current work.

**Accepted design:** D3 (`docs/crazygames/early-candidate-design.md`)

**Design Gate:** PASS, 89%, 2026-08-12

**Historical scope:** Local proof candidate only. No upload, deploy, submission,
SDK, ads, IAP, accounts, backend, paid/provider generation, commit, push, or PR.

## Engineering constraints

- Keep `src/sim/` headless and seeded. Phaser/DOM/audio feedback continues through scene/UI layers and drained `SimEvent`s.
- Preserve existing dirty user work: modified `.gitignore`, untracked `.artifacts/`, and untracked `design-qa.md`.
- Keep one mutating integrator. Adversarial reviewers remain read-only.
- Every changed campaign geometry or skill path gets a real solvability guard; no timeout/quota weakening to hide a broken route.
- Player-only behavior is compile-time excluded where practical, not CSS-hidden.
- A passing proof build is not release-cleared while provenance states remain unresolved.

## Checkpoint 1 — deterministic clock and host-safe loading

### Changes

1. Add a small scene-owned fixed-step clock module using the existing 16 ms simulation convention.
   - Accumulate active-play wall delta and execute 16 ms sim ticks.
   - Apply speed as tick throughput, not variable `deltaMs`.
   - Use the same clock for planning-only living-terrain ticks.
   - Bound active catch-up work; visibility pause resets the accumulator so returning never replays background wall time.
2. Keep animation/VFX clocks render-driven and out of the headless sim.
3. Configure a dedicated CrazyGames Vite mode with `base: './'`.
4. Resolve the public backdrop through `import.meta.env.BASE_URL` (or an equivalent Vite-owned URL) so Phaser requests the nested runtime path. Leave Vite's already-correct CSS rewrite alone.

### Verification

- Unit-test the clock's accumulation, catch-up cap, pause/reset, planning mode, and speed behavior.
- Run the same seeded input schedule through 60, 144, and 165 Hz frame sequences; compare outcome, sim time, agent state, emitter state, and terrain hash.
- Build to a temporary CrazyGames output and host at `/subpath/`; require no root-absolute runtime request or missing texture.
- Run the full existing suite and build before moving on.

## Checkpoint 2 — lifecycle and player-build boundary

### Changes

1. Add explicit visibility/blur lifecycle ownership at the scene shell.
   - Hidden/blur: clear held canvas/keyboard input, stop clock accumulation, pause sim and procedural audio.
   - Return: remain paused behind a focused `Tap/click to resume` surface.
   - Resume only from a user gesture; reset accumulator before play.
2. Add `suspend()`/gesture-resume behavior to SFX and music. Music scheduling must reset its look-ahead cursor so resume cannot burst queued notes.
3. Introduce a compile-time player-build flag through Vite configuration.
   - Player mode excludes prototype level imports/cards, debug labels and build tag, dev `window.game`, unlock-all behavior, source maps, and any opt-in harness.
   - Player mode keeps the ten campaign factories and unlocks Sand Lab only after Level 3.
4. Keep Basic Launch SDK-free. Define a future host-adapter seam without importing platform code now.

### Verification

- Lifecycle tests: blur clears input; hidden time does not advance; resume is explicit/focused; first resumed tick is bounded; audio remains suspended until gesture.
- Player-boundary tests assert prototypes, labels, unlock-all, debug globals, and developer copy are absent behaviorally and from the compiled artifact.
- Corrupt progress/audio/UI blobs continue to fail safely.

## Checkpoint 3 — direct first play and Levels 1–3

### Level 1

- Replace the simple wall with the D3 compact dam chain while keeping one visible, preselected Basher.
- The valid Basher breach must produce the actual seeded sequence: dirt/sand fall → contained water release → wood lift → walkable crossing → exit.
- New player boot goes directly to this level. No level grid or second Start action.
- Emit or expose harness milestones for assignment, breach, sand fall, water release, first wood lift, walkable crossing, and first save.

### Level 2

- Author the compact marked pour channel and buoyant wood crossing.
- Show Water only; use explicit Start after the player's pour.
- Invalid setup uses instant Retry with Water still selected. Do not add Undo/history or automatic bridge detection.

### Level 3

- Bound the existing Hold the Line identity to the D3 two-route lesson: Blocker + bomb-debris bridge, or Blocker + limited Sand ramp.
- Preserve a deterministic canonical route plus a guarded alternate route.

### Flow and progression

- New save: direct Level 1.
- Returning save: lightweight Continue surface focused on the next unsolved level; Campaign and Settings remain secondary.
- Success focuses Next; failure freezes at the causal state and focuses Retry.
- Sequential unlocks and best save percentage survive refresh. Sand Lab unlocks after Level 3; prototypes never participate.

### Verification

- Update `test/levels.test.ts` for all intentional geometry/skill changes and both Level 3 routes.
- Add first-three deterministic journey tests for success, failure, retry, next, unlock, refresh, and return.
- Require Level 1's full bridge chain within ten simulated seconds of valid assignment.
- Preserve all ten campaign solvability scripts; report the first broken decision point rather than weakening gates.

## Checkpoint 4 — responsive player UI and touch controls

### Changes

1. Replace the all-tools dock in player mode with a contextual single-row belt.
   - First three levels show at most the tools required by their lesson.
   - Persistent UI: compact status, contextual belt, pause.
   - Objective, controls, audio, retry, and Campaign move to transient hints or pause drawer.
2. Add safe-area tokens using `env(safe-area-inset-*)` plus a 12 px minimum.
3. Keep 800×450 persistent budgets at ≤64 px bottom and ≤40 px top.
4. Add touch targeting in a small render/input helper.
   - 48×48 CSS px effective region around each rendered crew position.
   - Deterministic overlap ordering: display distance, display Y/frontmost, then ID.
   - Preserve sim coordinates; target only the render/display position.
   - 8 px gesture threshold; crew tap, empty-world pan, active-brush paint, and DOM controls have exclusive ownership.
5. Respect reduced motion for decorative rain/glow/results motion.

### Verification

- Bounding-box tests at 907×510, 1216×684, 1280×720, 800×450, and 844×390.
- Assert no viewport overflow and no HUD overlap with hatch, exit, swarm, immediate danger, or editable target.
- Assert all UI and effective crew targets are at least 48 px and safe-area-contained.
- Browser-touch tests cover crowded selection (including Bomber), paint-vs-pan arbitration, pause, retry, and continuation.
- Capture compiled-player screenshots at all three critical target sizes; DOM checks alone are insufficient for Phaser canvas state.

## Checkpoint 5 — proof build, provenance, and deterministic journeys

### Tooling

1. Add a development-only, opt-in LemmingX harness with typed snapshots and manual fixed-tick advance. It must not enter the player build.
2. Add focused automated lanes:
   - first-minute deterministic milestones;
   - real-RAF 60-second feel/performance capture;
   - first-three journey;
   - lifecycle/audio;
   - responsive/touch;
   - CrazyGames build boundary;
   - provenance freshness and credits.
3. Add a CrazyGames proof-build verifier.
   - archive-root `index.html`;
   - relative HTML/CSS/runtime asset paths;
   - ≤1,500 files and a conservative <20 MB uncompressed budget;
   - no source maps, external game assets, prototype/debug markers, or internal tools;
   - required dependency notices;
   - asset registry paths and hashes current.
4. Write proof metadata outside the player payload with branch/commit, dirty exclusions, file inventory, artifact hash, and `releaseCleared: false`.

### Audio/provenance

- Retain current procedural WebAudio for the early candidate.
- Do not prepare or call ElevenLabs unless a later evidence-backed audio gap justifies it.
- If requested later, use `.env.local` with server/offline-only `ELEVENLABS_API_KEY`, a dry-run manifest, exact batch/model/voice/cost disclosure, and stop before the first provider call for approval.
- The proof build may use explicitly marked prototype-only media locally; release packaging must fail until every shipped record is `release-cleared` and human-reviewed.

## Checkpoint 6 — local candidate evidence and Build Gauntlet handoff

1. Run full tests, TypeScript/build, relative/subpath proof, player-boundary scan, refresh-rate equivalence, lifecycle, persistence, journey, responsive/touch, provenance, and `git diff --check`.
2. Play the compiled player build as a cold player on desktop and landscape mobile.
3. Capture:
   - first actionable Level 1 frame;
   - complete Level 1 material chain and walkable bridge;
   - Level 2 authored pour;
   - Level 3 choice/retry;
   - success/Next and failure/Retry;
   - 907×510, 800×450, and 844×390 evidence;
   - browser console and subpath request proof.
4. Record which targets are automated, observed by the maker, or still require independent humans. The ≥4/5 Level 1 comprehension target cannot be self-certified by automation.
5. Dispatch a fresh-context read-only Build Gauntlet critic against the compiled proof build and evidence, then fix the largest evidence-backed gap per round (maximum five).

## Stop conditions and remaining external gates

- Stop before any provider call, upload, deployment, portal action, public marketing media, terms acceptance, spend, commit, push, or PR.
- Do not call the artifact release-ready while backdrop provenance, dependency notices, human originality/brand review, or cold-player evidence remains open.
- Hosted Preview, portal metadata, title/icon clearance, commercial-rights review, and mobile-app eligibility remain later human/external gates.
