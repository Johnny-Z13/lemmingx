# Swarmwright CrazyGames D3 — Implementation Plan

**Design source:** [`2026-08-18-product-design.md`](./2026-08-18-product-design.md)

**Review source:** [`2026-08-18-adversarial-review.md`](./2026-08-18-adversarial-review.md)

**Branch:** `codex/crazygames-d3`

**Target:** a complete CrazyGames Basic Launch candidate plus feature-gated Full
Launch integration, merged to `main` and pushed after internal verification.

**Implementation status (2026-08-18):** Phases A–G are implemented and the
internal automated acceptance matrix is green. The final Git delivery is the
remaining in-repository step. Human name/rights clearance, five-player cold
comprehension, and hosted CrazyGames app/webview QA remain external release
gates and are intentionally not self-certified here.

## 1. Delivery rules

1. `src/sim/` remains deterministic, headless, seeded, and independent of
   Phaser, DOM, audio, platform SDKs, analytics, and storage.
2. Existing campaign factories continue returning fresh mutable terrain.
3. Every changed Site keeps a scripted canonical solution; Site 3 also keeps a
   guarded alternate route.
4. Player progression is persisted at the moment of earning. No earned value
   waits for a Site, Expedition, or session to end.
5. Player builds exclude prototypes, debug tools, queue/random/release-rate
   controls, the nuke, Hero Move, and open-toolbox campaign presentation.
6. The Basic Launch feature boundary contains no visible ad affordance. Full
   Launch advertising remains feature-detected through the platform adapter.
7. DPR 1, 800×450 landscape touch and muted play are acceptance targets, not
   later polish.
8. A passing automated suite is necessary but cannot self-certify cold-player
   comprehension, public-name clearance, or CrazyGames hosted/app behavior.

## 2. Preserve and absorb existing work

The working tree already contains an unfinished pause/options implementation:

- `PauseOptionsOverlay`;
- graphics-quality persistence;
- save deletion;
- related HUD, scene, style, progress, and test changes.

This work is product-aligned and will be completed and verified inside this
branch. It must not be discarded or overwritten while simplifying the player
HUD.

The repository also already provides:

- fixed-step simulation timing and refresh-rate tests;
- a deterministic playtest harness;
- render-only crowd targeting and touch/pan arbitration;
- player/Sandbox compile boundaries;
- continuous material simulation and authored solvability tests;
- lifecycle pause/resume and procedural audio;
- CrazyGames build/provenance verification scaffolding.

## 3. Phase A — baseline and product skeleton

### Implementation

- Record the starting branch, build inventory, payload, tests, and known proof
  verifier state.
- Remove the player-owned portrait modal and declare landscape as host-owned.
- Replace public `LemmingX` strings with the working identity `Swarmwright` while
  retaining the repository/internal name where technically useful.
- Add a versioned product configuration with `basic`, `full`, and local/no-op
  platform capability resolution.
- Add typed instrumentation and platform-adapter seams outside the critical sim.
- Complete the pause/options work and keep Settings off the first-play path.

### Verification

- Existing full test suite and both builds pass before and after the skeleton.
- Player build contains no custom rotate modal, unsafe public title, prototype
  marker, debug control, or dead ad UI.

## 4. Phase B — Gate A first 90 seconds

### Site 1

- First-time saves boot directly into a live Site 1 with no title, grid,
  briefing, planning card, or separate Start action.
- Frame one contains moving water, a waving held lead crew member, the exit, and
  one readable editable dirt face.
- Basher is selected; the only text cue is `TAP THE CREW`.
- A valid assignment produces the real seeded chain: dirt breach → sand fall →
  water release → timber lift → walkable crossing → first rescue.
- No accepted command means no breach or downstream milestone.
- Instrument first frame, input, breach, material milestones, chain, and reward.

### Site 2

- Water is the only exposed terrain verb and begins selected.
- Two broad valid pour regions create visibly different fill speed, timber
  height, or rescue yield; neither requires pixel precision.
- The hatch pulses `RELEASE` after a valid pour. The player predicts a material
  consequence before release.
- First failure retains the scene, names one cause, and offers focused Retry plus
  a free Hint. Retry is playable in under three seconds.

### UI

- Replace the player dock with a fixed contextual belt: at most three tools,
  Pause, Retry, and post-onboarding Fast-forward.
- Top status contains Site and saved/quota only; Salvage appears after first
  earning.
- Effective controls and crew targets are at least 48×48 CSS px.
- No permanent objective card, queue, release rate, nuke, labels, draggable
  window, audio controls, or level grid appears during first play.

### Verification

- Deterministic milestone tests prove the chain depends on the Basher command.
- Browser journeys capture first actionable frame, assignment, chain, rescue,
  transition, both Site 2 pour outcomes, failure, Hint, and Retry.
- Screenshots pass at 907×510, 800×450, 844×390, and DPR 1.
- H1/H2 remain externally open until five-player cold testing.

## 5. Phase C — first Expedition and continuous progression

### Site 3

- Present a fast destructive charge route and slower lossless sand route.
- Both meet quota; result feedback makes the saved-count and landscape trade-off
  obvious.
- Preserve deterministic canonical and alternate solvability scripts.

### Flow

- Three Sites form `First Shift`; the result prioritizes `NEXT SITE` until Site
  3, then shows the Expedition result.
- Success and failure are compact DOM surfaces; full statistics remain optional.
- Returning saves see the next live Site behind one `CONTINUE` action with a
  compact changed-Workshop vignette.

### Persistence

- Introduce a versioned `swarmwright.save.v2` model behind `StorageLike`.
- Migrate campaign completion, best percentages, audio, and UI settings.
- Persist per-Site best saved count, Salvage, Atlas discoveries, rescued total,
  Workshop projects, Daily state, current Site, and return timestamps atomically.
- Unavailable or corrupt storage falls back to safe in-session progress.

### Verification

- Refresh/close simulation tests cover every earned mutation.
- Journey tests cover new save, Site transitions, both Site 3 routes, first
  Expedition, return entry, migration, corruption, and unavailable storage.
- A no-meta build tests whether the core remains worth replaying.

## 6. Phase D — Workshop, Atlas, Daily, and economy

### Workshop

- Build a compact DOM Workshop scene with six visible incomplete/completed
  projects and rescued residents.
- First choice is Signal Lamp versus Crew Quarters at equal cost; purchasing
  immediately changes the Workshop.
- Away state changes visually and grants one Salvage per completed hour, capped
  at two hours initially and four hours after projects.

### Material Atlas

- Track 12–16 real interaction discoveries from sim events/state transitions.
- Show owned entries and visible silhouettes with one acquisition clue.
- First Site 1 interaction is revealed on its result, not over the chain.
- Test Yard remains on-demand after the first Expedition.

### Daily Rescue

- Add a UTC-date selector over seven authored base rescues and three
  solver-certified variants each.
- Every configuration has a deterministic solution guard.
- Persist score, current/best chain, grace use, completion, reward, and active
  attempt date; one missed day is forgiven and no earned value decays.
- Replays can improve score but cannot repeat the dated Salvage reward.

### Economy

- Implement the D3 starting ledger and a validator for minimum, average,
  perfect, Daily-active, and no-return paths.
- Assert that campaign access and canonical solvability never depend on a
  Workshop purchase or away production.

## 7. Phase E — complete campaign candidate

- Reauthor Sites 4–10 around one required concept per Site and a maximum of
  three exposed tools.
- Group them as Pressure Works, Hazard Line, and The Last Crossing.
- Remove graphic blood from the player presentation and retain cause-specific
  dust, sparks, soot, water, or helmet feedback.
- Replace the level grid with an Expedition/Workshop navigation surface shown
  only after first play; keep `CONTINUE` dominant for returns.
- Preserve rapid Retry, continuous gains, muted completeness, camera safety, and
  every campaign solvability guard.

## 8. Phase F — delivery, platform, and performance

- Implement local/no-op and CrazyGames platform adapters for environment,
  gameplay start/stop, mute, system information, and ad lifecycle.
- Keep the SDK and analytics adapter outside the critical entry; batch typed,
  no-PII events asynchronously after first input.
- Code-split returning shell, Workshop, Atlas, Daily, Test Yard, later
  Expeditions, settings, and result detail.
- Add low/medium/high device tiers and one-way automatic quality step-down after
  sustained frame-budget failure.
- Run a bounded Worker spike over Site 1 plus an emitter/fire stress Site. Only
  adopt the Worker transport if deterministic replay and dirty-chunk bandwidth
  pass; otherwise retain the simpler deterministic architecture and document the
  evidence-backed exception.
- Handle WebGL context loss and observe Canvas/WebGL1 fallback behavior.
- Keep critical transfer ≤1.5 MB compressed and no audio request before input.

## 9. Phase G — monetisation and identity boundaries

- Basic mode: no ad UI or simulated fallback copy.
- Full mode: rewarded deeper Hint only on a frozen failure surface, free after
  one further failure; optional Expedition double only after base banking.
- Midgame requests occur only at eligible later-session Expedition results.
- All ad paths preserve mute preference, pause simulation/input, and continue on
  disabled, blocked, unfilled, or error responses.
- Replace launch-facing `LemmingX` assets/strings with working `Swarmwright`
  presentation. Keep name clearance explicitly external.
- Produce and validate landscape, portrait, and square cover compositions plus
  silent landscape/portrait previews from honest gameplay once the product view
  is stable.

## 10. Final verification and Git delivery

Run and record:

1. all Vitest suites and TypeScript builds;
2. CrazyGames build and verifier;
3. deterministic refresh-rate, replay, solvability, economy, migration, and
   Daily-variant guards;
4. compiled subpath loading and request inventory;
5. payload/file-count and player-marker scans;
6. browser journeys on desktop and landscape mobile with screenshots;
7. pointer, touch, keyboard, pause, focus, resize, reduced-motion, muted, safe
   area, and storage-unavailable passes;
8. performance sampling at the busiest authored scene and automatic step-down;
9. WebGL loss/fallback and ad/platform no-op/error paths;
10. an adversarial visual/playability pass against the D3 contract.

Fix every reproducible internal blocker and major finding. Clearly record the
external evidence that cannot be self-certified: five-player comprehension,
CrazyGames hosted/app QA, public-name rights clearance, aggregate Basic Launch
metrics, and live ad fill.

When internal verification is green:

- update proof/provenance metadata intentionally;
- commit the complete scoped change on `codex/crazygames-d3`;
- switch to `main`, merge the feature branch non-destructively, rerun the final
  smoke suite, and push `main` to `origin`.
