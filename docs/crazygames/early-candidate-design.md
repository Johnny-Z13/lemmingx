# LemmingX CrazyGames Early Candidate — Design Packet

**Revision:** D3

**Date:** 2026-08-12

**Status:** Accepted and frozen for scoped local implementation; Design Gate PASS recorded 2026-08-12

**Scope:** Early local candidate only. No upload, submission, deployment, SDK, ads, IAP, account, backend, provider call, or Git action.

## Evidence baseline

### Verified platform requirements (official CrazyGames documentation checked 2026-08-12)

- Bundled file references must use relative paths. Total size is capped at 250 MB and 1,500 files; initial download is at most 50 MB, or 20 MB for mobile-homepage eligibility. [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- Chrome and Edge are required targets. A mobile claim requires touch support. Mobile app/fullscreen layouts must protect important UI with safe-area padding. [Technical requirements](https://docs.crazygames.com/requirements/technical/) · [CrazyGames App](https://docs.crazygames.com/resources/crazygames-app/)
- Named QA viewports include 907×510 desktop and 800×450 mobile. Text/images must be readable at device pixel ratio 1, and physics must behave consistently at refresh rates such as 144 and 165 Hz. [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Full implementations should land new users directly in gameplay or require at most one click. Official guidance recommends onboarding inside gameplay, focused on the core functionality, visual, limited in text, and skippable. [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/) · [Quality guidelines](https://docs.crazygames.com/requirements/quality/)
- Basic Launch runs at least seven live days and 500 plays, or closes after 21 days if 500 plays are not reached. Its reported product measures are average playtime, D1 retention, and one-minute gameplay conversion. No SDK is required and ads remain disabled during Basic Launch. [Basic Launch guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Submission eventually requires consistent landscape, portrait, and square covers plus silent 15–20 second landscape and portrait previews. This design defines an honest promise but does not create media. [Game covers](https://docs.crazygames.com/requirements/game-covers/)

### Current local observations

- Repository identity is confirmed: Phaser 3 renderer, TypeScript, Vite, DOM HUD, and a headless seeded simulation.
- Baseline commit is `9be8a7ef0565da70828b2a46aaab10198122d72b` on `main`. Existing user work is preserved: modified `.gitignore`, untracked `.artifacts/`, and untracked `design-qa.md`.
- `npm test`: 12 files and 120 tests passed. `npm run build`: passed; output is about 1.60 MB JS and 11.91 KB CSS before compression.
- At 800×450, the live dock measures 772×211 px (about 47% of viewport height) and covers the route during planning and play. At 907×510 it also materially obscures the lower playfield.
- The opening exposes ten campaign cards, two prototype cards, Sand Lab, and a build tag before a second Start action. `PLAYTEST_UNLOCK_ALL_LEVELS` is `true`.
- `GameScene.update()` calls `sim.step(clamped)` once per rendered frame and calls `stepLivingTerrain()` once per rendered planning frame. No fixed-tick accumulator exists.
- There is no visibility/focus lifecycle handler. Simulation time can advance across focus loss, and WebAudio is not explicitly suspended on blur or restored through a resume gate.
- A compiled `--base=./` build was served successfully from `/subpath/`: entry JS/CSS were relative and Vite rewrote the CSS backdrop to the nested asset. Entering Level 1 still made Phaser request `/assets/industrial-cavern-backdrop.png`, which returned HTTP 404 and displayed a missing-texture pattern. The confirmed fix belongs in Phaser's runtime loader, not the processed CSS.
- Baseline browser captures are under `.artifacts/crazygames-baseline/`. The dev-server level-select, planning, and running samples had no browser warnings/errors; the compiled subpath Level 1 sample has the confirmed runtime-asset 404 above.
- The machine-readable provenance inventory is `docs/assets/crazygames-provenance.json`. The industrial backdrop is `prototype-only`; the remaining authored procedural media and Lucide icons remain `rights-review`.

### Product recommendations (not platform mandates)

- Keep the game 2D. A readable cross-section lets a player see the swarm, editable terrain, fluids, and cause-and-effect in one frame; a 3D conversion would dilute that legibility and spend the candidate scope on camera/asset problems rather than the distinctive system.
- Make the first three levels a compact authored onboarding arc. Do not expose the entire toolbox, queue editor, debug labels, prototypes, or level grid before the player understands the basic fantasy.
- Treat the early candidate as a product hypothesis: players will stay because they immediately alter a living landscape, then discover that skills and materials combine into multiple solutions.

### Unresolved or explicitly gated

- Player-behavior targets below are hypotheses until instrumented local runs and cold-player evidence exist.
- Hosted Preview behavior, portal fields, mobile-app eligibility, and submission metadata cannot be verified locally and remain outside this goal.
- The exact rights origin of the industrial backdrop is unresolved and blocks a release-cleared claim.
- `LemmingX` is a working internal title. Clean-room implementation does not establish an ownable public name or icon; human brand/confusion/originality review is mandatory before creating public marketing media or submitting.
- No formal reference-image Visual Gauntlet is authorized. Existing concepts may inform direction, but no new production art comparison loop is implied.
- SDK integration is not required for this early Basic candidate and is deferred. A later Full path needs an adapter for lifecycle/settings/save calls.

## Market promise

**Player fantasy:** Guide a tiny industrial swarm by carving, pouring, floating, and igniting a living world that keeps moving after every decision.

**Visible distinction:** The terrain is not a static tile map or cosmetic destruction layer. Dirt becomes falling sand, water flows, wood floats and burns, and the swarm reacts inside the same readable 2D cross-section.

**Working-title cover/preview promise:** The current internal title “LemmingX” shows a bold, readable swarm crossing a player-made bridge while gold sand pours into blue water beneath an industrial cavern. The preview opens on the actual Level 1 breach chain—not a cinematic, menu, or mechanic that appears hours later. The public title and icon remain human-gated for brand/confusion/originality clearance.

**Opening-ten-second fulfilment:** A new player lands directly in Level 1. The hatch starts opening, a short pointer pulse marks the lead walker, and one click assigns the already-selected Basher. The walker breaches a thin dirt dam: dirt becomes falling sand, released water flows beneath a pre-positioned wood pallet, and the pallet lifts into the crossing. Camera, particles, and audio make this single-input material chain unmistakable.

**Why 2D wins:** One side-on composition can expose the goal, obstacle, swarm, material movement, and tool consequence. That simultaneous readability is the pitch. 3D would hide interactions behind depth and camera control while adding no stronger systemic promise.

## Core play and session structure

### Primary verbs

1. Read the route from hatch to exit.
2. Select a crew role or terrain material.
3. Click a crew member or drag on the landscape.
4. Watch the living terrain and swarm respond.
5. Adjust, retry quickly, or continue to the next compact puzzle.

The hatch queue remains a later precision verb, introduced after the player understands assigning a role in the world. It is not part of the first interaction.

### Feedback and reward cadence

- **Under 100 ms after input:** selected-state confirmation and valid/invalid cursor feedback.
- **Under 500 ms:** visible carve/pour/float/burn response plus a concise matching sound.
- **Every 5–15 seconds:** route visibly improves, a crew state changes, danger is avoided, or a lemming reaches safety.
- **Every 30–90 seconds:** a level resolves with saved count, success grade, one-line lesson, and immediate Retry/Next.
- **Every 2–3 levels:** a new material interaction or crew role becomes available on the campaign path.

### Failure, retry, and success

- Failure freezes the simulation at the causal moment and states the reason in plain language: “The route was still blocked,” “The crew fell,” or “Water sealed the tunnel.”
- `Retry` is the focused primary action. Pointer/touch activates it; `R` is a desktop shortcut. Retry resets only the level and begins in at most one action.
- Success grades are based on saved percentage, with a visible best score. The next level unlocks immediately and `Next` is the focused primary action.
- No energy timer, wait gate, ad gate, or artificial loss friction is introduced.

### Five-to-ten-minute session

- First-time session: Levels 1–3 take roughly 4–7 minutes including one retry, followed by a clear new branch on the campaign map.
- Returning session: `Continue` opens the next unsolved campaign level in one action. Players may improve their save percentage or use a newly unlocked Sand Lab after the onboarding arc.
- Return motivation comes from persistent best save percentage, visible next-mechanic previews, alternate solutions, and compact mastery—not daily chores or manipulative streaks.

## First-three-level onboarding slice

### Level 1 — First Steps: “Break the dam”

**One idea:** A crew skill starts a readable living-material chain.

- New players bypass level select and land in this compact, single-screen level.
- The hatch begins opening immediately. Basher is the only visible tool and starts selected.
- A brief visual gesture points from the Basher button to the lead walker near a thin dirt dam. Text is limited to “CLICK A WALKER TO BASH.”
- The first valid click starts the Basher. The breached dirt falls as sand into a catch, a small contained water pocket flows beneath a pre-positioned wood pallet, and buoyancy lifts that pallet into the crossing. The route then opens and the crew walks to the exit.
- Sand, water, and wood are authored into the level; the player still sees only one selected tool and makes one decision. The chain uses existing deterministic material rules and requires no scripted animation or second selectable verb.
- No terrain toolbar, queue editor, release rate, speed, nuke, debug labels, minimap, or settings are exposed during this level. Pause and audio remain available behind compact icons.
- Target resolution: first meaningful response within 10 seconds; success in 30–60 seconds.

**By 10 seconds:** click a moving crew member to apply the selected role; the breach produces falling sand, flowing water, and lifting wood.

**By 30 seconds:** the pallet forms a bridge and the swarm follows the changed route toward the clearly marked exit.

**By 60 seconds:** save enough crew, see a grade, and understand Retry/Next.

### Level 2 — Float the Way: “Make the world move”

**Variation and first real decision:** The player edits material, and one material moves another.

- A compact pool blocks the route. A wood platform rests below bridge height; the hatch remains safely closed while the world is editable.
- Water is the only active landscape tool. A marked pour channel constrains the onboarding stroke without faking the fluid response; the player decides where and how much to pour inside it.
- Water flows under the platform and lifts it into a walkable bridge. This is the first authored terrain gesture and visibly fulfils the cover promise.
- `Start` is an explicit 48 px action after the pour; the design does not invent automatic safe-bridge detection. The marked target and deterministic geometry make the intended bridge position testable.
- An invalid pour uses instant Retry with the water tool still selected. No CA snapshot, Undo, or history system is added.
- Target resolution: visible material reaction within 15 seconds; success in 45–90 seconds.

**By 10 seconds:** dragging pours a fluid with immediate directional feedback.

**By 30 seconds:** water can lift wood and create a route rather than merely act as a hazard.

**By 60 seconds:** the player has chosen a pour location, released the swarm, and is watching the bridge decision play out.

### Level 3 — Hold the Line: “Combine tools”

**Combination and possibility-space reveal:** Control the swarm while choosing between two systemic routes.

- The swarm approaches a blocked route with a safe blocker point and a visible sand catch below the obstacle.
- The compact belt exposes Blocker and Bomber plus a limited Sand pour. A contextual two-step cue teaches “HOLD THEM” then “MAKE A PATH.”
- Route A: plant a Blocker, then bomb the dirt obstacle; debris falls into the catch and becomes the crossing.
- Route B: plant a Blocker, then pour a stable sand ramp around the obstacle, preserving the bomber and improving the grade.
- The first mistake should produce an understandable failure in under 30 seconds and an immediate retry. The alternate solution is visible on the result card as an optional mastery hint, not front-loaded prose.
- Target resolution: first meaningful decision within 20 seconds; success in 60–120 seconds.

**By 10 seconds:** Blocker controls timing and buys space to reshape the route.

**By 30 seconds:** crew skills and landscape tools can be sequenced.

**By 60 seconds:** multiple valid solutions exist, and saving more tools/crew improves mastery.

### Early campaign after Level 3

- Completing Level 3 reveals a compact campaign path rather than the current twelve-card debug grid.
- Levels 4–6 introduce, one at a time: deeper water/Swimmer rescue, wide-map camera movement, then steel and directional excavation.
- Levels 7–9 combine traps, emitters, fire/wood, and vertical traits. Level 10 remains the authored-system finale.
- Difficulty cadence alternates a teaching level, a variation, then a combination test. No more than one new required mechanic appears in a level.
- Unlocks are sequential for the primary path. Best save percentage persists. Sand Lab unlocks after Level 3 as a reward; prototypes remain entirely absent from the player build.
- The early candidate may retune or reorder the first six levels, but it does not build a new full campaign.

## Interaction and responsive composition

### Desktop

- Pointer: select a visible tool, click a crew member to assign, drag on the world to paint, drag empty world/right-drag to pan where needed.
- Keyboard shortcuts are optional accelerators: `1–9` visible only for currently available roles, `Space` pause/resume, `R` retry. Avoid relying on `Escape` because the host owns fullscreen behavior.
- First three levels fit within the 960×540 logical view and require no camera movement.
- A compact top status strip shows level, saved/quota, and time only when time matters. One contextual hint chip appears near—but never over—the current decision.
- A contextual bottom tool belt shows only available tools. Release rate, speed, queue details, settings, and restart live in a pause/secondary drawer after onboarding.

### Landscape phone

- Primary gestures: tap tool, tap crew, drag to paint, one-finger drag on empty terrain to pan. Gesture ownership is explicit so painting never also pans.
- Minimum interactive target is 48×48 CSS px with at least 8 px separation; critical controls remain inside `max(12px, env(safe-area-inset-*)))` padding.
- Every visible crew member has an effective 48×48 CSS px touch region even though its sprite is smaller. The input layer converts 24 CSS px to world scale and selects the nearest live **display** position, preserving the sim coordinates.
- Overlapping crew candidates are resolved deterministically by display-distance, then highest display Y/frontmost, then lemming ID. The chosen crew flashes its role colour before the assignment result; no hover, double-tap, or long-press is required.
- Gesture arbitration uses an 8 CSS px movement threshold: a touch beginning on a crew member remains a tap candidate until the threshold; a touch beginning on empty world becomes pan after it; an active terrain brush always paints and never pans; DOM controls stop the pointer before it reaches the canvas.
- Tool belt is a single 56–64 px safe-area-aware row, with at most four contextual tools visible. Overflow tools use horizontal paging only after onboarding.
- Status compresses to saved/quota plus one state icon. Pause sits in the opposite top corner. Large mission cards and audio sliders never remain over live play.
- At 800×450 the persistent UI budget is at most 64 px bottom + 40 px top; the central route, hatch, exit, swarm, danger, and editable target must not be covered.
- At 907×510 the same hierarchy is used with labels expanded where space permits. No breakpoint may reintroduce the current two-row 200+ px dock.
- The platform submission can declare landscape orientation. A local non-platform fallback may show a simple rotate notice in portrait, without trying to programmatically lock orientation.

### Pause, blur, resume, and audio

- Simulation uses a fixed tick and accumulates only while actively playing. Blur/hidden state clears held input, stops accumulation, and pauses simulation and procedural audio.
- Returning from focus loss shows an explicit `Paused — tap/click to resume` surface. No elapsed wall time or catch-up steps are applied.
- iOS-interrupted AudioContexts resume only from the player’s next valid gesture. Muted state remains authoritative.
- A future CrazyGames host adapter can report gameplay start/stop without mixing platform calls into the headless sim. Focus loss itself must not emit a host gameplay-stop event because official SDK guidance handles focus separately.

## UI states

### Start flow

- New player: loader → Level 1 gameplay, with no title menu or level-select choice.
- Returning player: a lightweight Continue surface overlays the next unsolved level preview; `Continue` is primary, Campaign and Settings are secondary.
- Build tags, prototype names, debug labels, and developer instructions are absent from the player journey.

### Player-only proof build

- A dedicated CrazyGames mode sets relative base paths and compiles only campaign, post-Level-3 Sand Lab, and player UI. Prototype levels, debug labels, the dev `window.game` handle, unlock-all behavior, playtest harness, and source maps are excluded—not merely hidden.
- The local artifact is explicitly a **proof build** while any provenance record is not `release-cleared`. Its manifest records `releaseCleared: false`; a separate release packaging command must fail closed on the current backdrop and rights-review records.
- The verifier checks archive-root `index.html`, relative HTML/CSS/runtime asset requests, ≤1,500 files, <20 MB uncompressed early-candidate budget, no external runtime URLs except separately approved platform code, no prototype/debug markers, and required licence/credits notices.
- Compiled browser evidence must cover the real `/subpath/` player artifact at 907×510, 800×450, and 844×390. A dev-server pass cannot substitute for this gate.

### In-game HUD

- Persistent: compact status, contextual tool belt, pause.
- Transient: gesture cue, valid/invalid action response, saved celebration, danger/failure cause.
- Secondary pause drawer: objective recap, controls, audio toggles, retry, campaign. Volume sliders are not part of the live play HUD.

### Success and failure

- Success: saved percentage, best improvement, one-line lesson, focused `Next`, secondary `Retry`.
- Failure: cause in one sentence, focused `Retry`, secondary `Try a hint` and Campaign.
- Both fit inside 800×450 safe areas with 48 px actions and do not depend on keyboard activation.

### Progression and settings

- Campaign shows the completed path, the next unlocked level, best grade, and a one-image mechanic preview. Locked future levels are visible in small groups, not as a wall of choices.
- Settings contain audio toggles/volume, reduced motion, labels/accessibility, and reset progress. Reset is namespaced to LemmingX keys and requires confirmation.

## Visual and audio direction

- **World:** dark industrial undercity with high-contrast living materials: gold sand, blue water, brown wood, orange fire, mint exit. The material action must be brighter than the backdrop.
- **Crew:** cute, chunky silhouettes with role colour carried by headwear/uniform. At thumbnail scale, the swarm reads as a bright moving group rather than isolated pixels.
- **UI:** glass-black utilitarian panels, mint/cyan confirmation, gold interaction, danger pink. Fewer panels, stronger hierarchy, and no dashboard-like grid during first play.
- **Motion:** reserve strong motion for carve collapse, water lift, burn, saved crew, and result transitions. Decorative rain and glow reduce or stop under reduced-motion mode.
- **Audio:** retain locally synthesized SFX/music for the candidate. Each primary interaction gets a distinct short cue; music remains supportive and lower than action feedback. No production voice, generated provider audio, or runtime API is needed.
- Placeholders may coexist with this direction if the goal, tool, material, hazard, and outcome stay readable. The industrial backdrop remains prototype-only until provenance is repaired or the asset is replaced.
- No public cover or preview is accepted until a human clears the working title/icon and a media check confirms that the cover's material composition is delivered by actual Level 1 footage. The silent preview must use real Level 1–3 player-build capture; synthetic or prototype-only scenes cannot carry the promise.

## Measurement and acceptance

These are pre-registered product targets, not current observations.

| Measure | Event definition | Early local target |
|---|---|---|
| Time to first interaction | player input after first actionable Level 1 frame | median ≤8 s in cold-player tests |
| Meaningful feedback | valid input to visible terrain/swarm state change | ≤100 ms automated; noticed by player within 2 s |
| Level 1 promise chain | valid Basher assignment → breach → sand fall → water release → wood lift → walkable crossing | complete, visibly readable bridge within 10 s; each milestone timestamped |
| Level 1 comprehension | post-run cold-player explanation, not an in-game blocking survey | ≥4/5 identify that the breach released water and lifted the wood |
| Level 1 completion | first Level 1 start to success | ≥4/5 cold players; median 30–60 s |
| Retry behaviour | failure to accepted Retry action | median ≤5 s; no menu detour |
| Tutorial abandonment | Level 1 started, then closed/idle 30 s before meaningful action | <20% directional target |
| First-three completion | new players completing Levels 1–3 in one session | ≥50% directional local target |
| Session duration | active gameplay time excluding blur/pause | designed for 5–10 min first session |
| Desktop usability | 907×510, 1216×684, 1280×720 | no overflow, hidden critical control, or route occlusion |
| Mobile usability | 800×450 and 844×390 touch landscape | all UI and effective crew targets ≥48 px; deterministic overlap selection; safe-area contained; no route occlusion |

The LemmingX-owned harness should record first actionable frame, first valid input, Level 1 breach assignment, sand fall, water release, first wood lift, walkable crossing, hatch open, first decision, first save/failure, retry, level completion, next-level entry, pause reason, and active session time. Synthetic/manual stepping is for deterministic thresholds; a real-RAF lane is required for feel/performance. Cold-player observation remains mandatory because automated scripts cannot prove comprehension.

## Galactic Hordes precedent disposition

### Adopt

- Development-only, opt-in typed playtest harness with deterministic manual stepping and a separate real-RAF lane.
- Bounding-box responsive tests, lifecycle tests, first-minute/journey tests, provenance freshness checks, compiled-player artifact verification, and proof-versus-release package separation.

### Adapt

- Replace combat telemetry with LemmingX route/material/swarm milestones.
- Make 907×510, 800×450, and 844×390 first-class; test that UI does not cover hatch, exit, swarm, hazard, or editable terrain.
- Put the richer provenance registry under `docs/assets/`, and fail release packaging on any state other than `release-cleared` while allowing explicitly non-release local proof.

### Reject

- No global `Math.random` replacement, fabricated result state as journey proof, `localStorage.clear()`, copied game-specific storage/branding/balance, or auto-staging in this dirty worktree.
- Passing Galactic Hordes checks is precedent only and provides no LemmingX evidence.

## D2 revision response

- Corrected the compiled subpath finding: processed CSS is safe; Phaser runtime loading is the confirmed 404.
- Moved the full sand → water → floating-wood promise into Level 1's single Basher action.
- Removed automatic bridge-band detection and one-stroke CA Undo from Level 2.
- Defined effective crew hit regions, overlap selection, and gesture arbitration for landscape touch.
- Added human brand/originality clearance, proof-versus-release packaging, and real-footage marketing gates.

## D3 acceptance amendment

- Added chain-specific Level 1 telemetry and a ten-second complete-bridge gate.
- Added a post-run cold-player comprehension gate requiring at least 4/5 players to identify the causal water/wood interaction.

## Design Gate submission D3

The critic should test whether this packet offers one honest promise, delivers it in the first ten seconds, teaches skill → terrain → combination across Levels 1–3, protects desktop/mobile playfield, stays feasible in the existing sim architecture, and leaves release/provenance unknowns explicitly gated.
