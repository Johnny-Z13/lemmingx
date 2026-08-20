# LemmingX CrazyGames Gauntlet Review Log

> **Historical local-proof log.** Scores, artifact boundaries, and blocker
> counts below describe the 2026-08-12 D3 proof, not the current repository.
> Use `2026-08-20-adversarial-review.md` and `docs/product-status.md` for the
> current decision.

## Design round 1 — REVISE

- **Maker revision:** D1, 2026-08-12
- **Packet:** `docs/crazygames/early-candidate-design.md`
- **Evidence:** `.artifacts/crazygames-baseline/`
- **Provenance:** `docs/assets/crazygames-provenance.json`
- **Critic result:** `REVISE`, 78%
- **Gate state:** Failed: MAJOR findings remained; mobile/player-build/provenance categories were below 4/5 and overall was below 85%
- **Implementation state:** Gated; no gameplay or production UI implementation begun

### Scores

| Category | Score |
|---|---:|
| Promise and originality | 4.0/5 |
| First 10/30/60 seconds | 4.0/5 |
| Levels 1–3 onboarding | 4.5/5 |
| Clarity, retry, session loop | 4.5/5 |
| Mobile/touch composition | 3.5/5 |
| Feasibility and lifecycle | 4.0/5 |
| Player build and CrazyGames operations | 3.0/5 |
| Provenance, gating, and scope | 3.5/5 |

### Findings retained

- No design-only blocker; release remains blocked by prototype-only and rights-review assets.
- MAJOR: correct compiled-subpath evidence; Vite/CSS are safe after `--base=./`, while Phaser runtime asset loading 404s.
- MAJOR: the unique living-material promise arrived in Level 2 rather than the first minute.
- MAJOR: mobile specified UI targets but not effective moving-crew targets or overlap disambiguation.
- MAJOR: the working title and visual identity need explicit human brand/originality clearance.
- MINOR: one-step CA Undo added undefined state/history scope.
- MINOR: later marketing acceptance was not bound to actual Level 1–3 footage.

**Largest gap:** the marketable living-material combination was not proven in the first minute.

**Bounded revision:** D2 corrects evidence, moves the full chain into Level 1 without another tool, removes Undo/auto-threshold scope, defines touch targeting, and adds human brand/provenance and proof-build gates.

## Design round 2 — PASS

- **Maker revision:** D2, 2026-08-12
- **Packet:** `docs/crazygames/early-candidate-design.md`
- **Evidence:** `.artifacts/crazygames-baseline/`
- **Provenance:** `docs/assets/crazygames-provenance.json`
- **Critic result:** `PASS`, 88%
- **Gate state:** Passed for scoped local implementation; no BLOCKER or MAJOR findings, every category at least 4/5, overall above 85%, unknowns gated
- **Implementation state:** Gated; no gameplay or production UI implementation begun

### Scores

| Category | Score |
|---|---:|
| Promise and originality | 4.5/5 |
| First 10/30/60 seconds | 4.25/5 |
| Levels 1–3 onboarding | 4.5/5 |
| Clarity, retry, session loop | 4.5/5 |
| Mobile/touch composition | 4.5/5 |
| Feasibility and lifecycle | 4.0/5 |
| Player build and CrazyGames operations | 4.25/5 |
| Provenance, gating, and scope | 4.5/5 |

### Minor retained and maker response

- The Level 1 promise needed chain-specific evidence rather than a generic terrain-change event. D3 adds breach, sand, water, wood, crossing, and comprehension gates.
- Moving-crew touch reliability, player-build exclusions, lifecycle, safe areas, and runtime-relative loading remain implementation evidence gates.

## Design round 3 — PASS / accepted freeze

- **Maker revision:** D3, 2026-08-12
- **Packet:** `docs/crazygames/early-candidate-design.md`
- **Critic result:** `PASS`, 89%
- **Findings:** no BLOCKER, MAJOR, or MINOR findings
- **Gate state:** Passed for scoped local implementation
- **Accepted design:** D3, frozen 2026-08-12
- **Implementation state:** Authorized locally by the goal; external/Git/provider actions remain gated

D3 was confirmed to add chain-specific timestamps, a complete visibly readable bridge within ten seconds, and ≥4/5 cold-player causal comprehension without adding gameplay scope or weakening D2.

## Build round 1 — REVISE

- **Reviewed build:** accepted D3 local proof, 2026-08-12
- **Critic result:** `REVISE`, 81%
- **Gate state:** Failed: the result/reward loop contradicted the accepted mastery promise
- **Release state:** correctly remained proof-only; no release-cleared claim

### Scores

| Category | Score |
|---|---:|
| Promise and D3 fidelity | 4.0/5 |
| First 10/30/60 seconds | 3.75/5 |
| Levels 1–3 teaching arc | 4.0/5 |
| Responsiveness, reward, retry | 3.5/5 |
| Mobile composition and touch | 4.25/5 |
| Determinism, lifecycle, build | 3.75/5 |
| Player-only artifact and subpath | 4.5/5 |
| Provenance and scope gating | 4.5/5 |

### Findings and bounded response

- No BLOCKER for a local proof artifact.
- MAJOR: quota completion froze the run before all crew were accounted for, so Level 1 and 2 displayed 70% and 60%, while the Level 3 destructive and lossless routes could not express different mastery scores.
- MAJOR: the exact post-adjustment evidence packet needed a fresh full-suite and compiled-artifact pass.
- MAJOR: a cold moving-crew click could fail silently; this remains a separate, observable interaction risk rather than part of the reward fix.
- MINOR: the causal material chain is deterministic but still visually dense; real touch hardware and independent cold-player evidence remain unobserved.

**Largest gap:** the result system rewarded meeting quota quickly instead of saving more crew.

**Bounded revision:** campaign levels now remain active after quota until every crew member is saved/lost or time expires. A focused regression test protects that rule.

### Revision evidence

- Full suite: 16 files, 135 tests passed after the change.
- Deterministic proof: Level 1 10/10; Level 2 10/10; Level 3 bomber 7/10 with three lost versus sand 10/10 with none lost.
- Actual compiled-browser result captures: Level 1 100%, Level 2 100%, Level 3 bomber 80% in the observed live timing, Level 3 sand 100%.
- Normal and CrazyGames builds passed. The proof verifier passed at 5 files / 2,968,450 bytes with SHA-256 `48a20b3ad14d2748bcc6832ca6f02c08628339b88389dc4f67b4f2b87d37ef0a`.
- The round-1 exact build loaded at `/ui11/` with the relative backdrop and no browser warning/error; the prototype/debug marker scan and `git diff --check` were clean. The final round-3 artifact was subsequently rechecked at the root proof route with the same clean console result.

**Round state:** submitted to a fresh-context Build critic. Release provenance, title/icon, human-comprehension, hosted Preview, portal, and real-device gates remain explicitly open.

## Build round 2 — REVISE

- **Critic result:** `REVISE`, 85%
- **Accepted correction:** the quota/mastery fix is sound and the exact evidence distinguishes the Level 3 routes
- **Gate state:** Failed: one MAJOR first-action feedback finding remained

### Scores

| Category | Score |
|---|---:|
| Promise and D3 fidelity | 4.25/5 |
| First 10/30/60 seconds | 3.75/5 |
| Levels 1–3 teaching arc | 4.25/5 |
| Responsiveness, reward, retry | 3.75/5 |
| Mobile composition and touch | 4.0/5 |
| Determinism, lifecycle, build | 4.5/5 |
| Player artifact and subpath | 4.75/5 |
| Provenance and scope gating | 4.75/5 |

### Findings and bounded response

- No BLOCKER for the local proof.
- MAJOR: a no-target pointer-up during the mandatory opening click returned silently; pure target-selection tests did not prove visible compiled-gesture acknowledgement.
- MINOR: the result card does not yet state the alternate route, although 80%/100% route mastery is visible.
- MINOR: the proof predicate did not itself require the Level 3 routes to produce distinct saved/lost results.

**Largest gap:** reliable, visibly acknowledged completion of the first required input.

**Bounded revision:** the Level 1 gesture now displays an ARIA live status for both miss and acceptance. A miss retains the Basher stock and shows `MISSED — TAP INSIDE THE GOLD RING`; an accepted tap consumes the stock and shows `ORDER SET — BASHER FIRES AT THE DAM`. The deterministic proof predicate now also requires the sand route to save more and lose fewer crew than the bomber route.

### Revision evidence

- Focused tests cover the transient acknowledgement timer alongside targeting, simulation, and all campaign solvability scripts.
- Exact compiled-browser checks observed the missed message with Basher stock 1 and the accepted message with stock 0 after a 54 ms post-gesture observation delay.
- Captures: `level1-first-click-missed-907x510.png` and `level1-first-click-accepted-907x510.png`.

**Round state:** pending the final exact-source suite/build packet and a fresh-context Build critic.

## Build round 3 — PASS

- **Critic result:** `PASS`, 91%
- **Gate state:** Passed for the scoped early local proof candidate
- **Release state:** not release-ready; all external and rights gates remain open

### Scores

| Category | Score |
|---|---:|
| Promise and D3 fidelity | 4.5/5 |
| First 10/30/60 seconds | 4.25/5 |
| Levels 1–3 teaching arc | 4.25/5 |
| Responsiveness, reward, retry | 4.5/5 |
| Mobile composition and touch | 4.25/5 |
| Determinism, lifecycle, build | 4.75/5 |
| Player artifact and subpath | 4.75/5 |
| Provenance and scope gating | 5.0/5 |

### Final findings

- BLOCKER: none.
- MAJOR: none.
- MINOR: Level 3 visibly distinguishes the destructive and lossless scores but still uses generic quota copy instead of the optional alternate-route lesson.
- Largest remaining gap: independent cold-player comprehension, explicitly retained as a later human gate.

**Build Gate:** PASS for the accepted D3 local proof only. Ten provenance records, title/icon/public identity, real-device behavior, hosted Preview/iframe/portal behavior, and independent player targets remain NOT_OBSERVABLE or release-blocking as documented.
