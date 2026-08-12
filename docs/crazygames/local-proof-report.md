# LemmingX CrazyGames Local Proof Report

**Date:** 2026-08-12

**Accepted design:** D3

**Build Gate:** PASS — 91%

**Claim:** early local proof candidate only; not release-cleared and not uploaded, deployed, or submitted

## Deterministic and build result

| Gate | Result |
|---|---|
| Full Vitest suite | PASS — 17 files, 136 tests |
| Refresh equivalence | PASS — seeded 60/144/165 Hz outcomes match |
| Level 1 proof | PASS — 10 saved, 0 lost; breach/material chain within 10 simulated seconds |
| Level 2 proof | PASS — reserved-endpoint eight-stamp water stroke; 10 saved, 0 lost |
| Level 3 proof | PASS — bomber 7/10, sand 10/10 |
| Normal build | PASS |
| CrazyGames build | PASS |
| Proof verifier | PASS — 5 files, 2,969,225 bytes |
| Release verifier | PASS (fail closed) — exit 1 on 10 unresolved provenance records |
| Artifact SHA-256 | `cc07a5ce5db4f6f2de6efe791dd5e7223552070a61f498bfb1f07c2fb9e85fa8` |
| Player marker scan | PASS — no prototype/debug/unlock/harness markers found |
| Relative/subpath loading | PASS — round-1 exact `/ui11/` proof plus final exact root proof; backdrop loaded, no browser warning/error |
| Diff hygiene | PASS — `git diff --check` |

Machine-readable results are in `.artifacts/crazygames-candidate/deterministic-proof.json` and `.artifacts/crazygames-candidate/proof-metadata.json`.

## Compiled-browser evidence

- `level1-first-actionable-907x510.png` — direct first-play action cue.
- `level1-first-click-missed-907x510.png` — explicit miss acknowledgement with Basher stock retained.
- `level1-first-click-accepted-907x510.png` — explicit accepted order with Basher stock consumed.
- `level1-material-chain-907x510.png` — actual sand, water, wood, and crossing state.
- `level1-complete-907x510.png` — 100%, 10/10, no losses.
- `level2-pour-800x450.png` and `level2-844x390.png` — responsive marked pour/bridge state.
- `level2-outcome-800x450.png` — 100%, 10/10, no losses.
- `level3-planning-800x450.png` and `level3-live-cue-800x450.png` — two-route lesson and live cue.
- `level3-bomber-result-800x450.png` — observed live destructive route, 80%, two lost.
- `level3-sand-result-800x450.png` — observed live lossless route, 100%, no losses.

At 800×450 and 844×390 the compiled player HUD had no viewport overflow, persistent bars stayed within their D3 budgets, and visible controls measured at least 48 CSS px. These were browser-emulated landscape sizes, not real-device safe-area evidence.

## Explicitly unproven or release-blocking

- Ten provenance records remain unresolved: the industrial backdrop is `prototype-only`; nine authored/dependency entries remain `rights-review`. Release packaging must fail closed.
- `LemmingX`, its icon, and public marketing identity still require human brand/confusion/originality clearance.
- Independent cold-player targets are not self-certified: ≥4/5 Level 1 causal comprehension/completion, median first interaction, Retry behavior, first-three completion, and session retention remain unobserved.
- Independent moving-crew click reliability remains a human-observation gate; the compiled gesture now acknowledges both miss and acceptance explicitly.
- Real-device touch, notch/safe-area, DPR-1, iOS AudioContext recovery, hosted iframe/subpath, CrazyGames Preview, portal metadata, and mobile-app eligibility remain external gates.
- No provider call, SDK, ad/IAP, account action, spend, upload, deployment, submission, commit, push, or pull request was performed.
