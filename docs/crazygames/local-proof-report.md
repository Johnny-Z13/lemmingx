# Swarmwright CrazyGames D3 — Local Proof Report

**Date:** 2026-08-18

**Accepted design:** D3 Basic Launch candidate with feature-gated Full Launch
integration

**Internal result:** PASS

**Claim boundary:** verified local candidate; not release-cleared, uploaded, or
submitted to CrazyGames. This report was captured before Git integration; the
final handoff records the merge and push.

## Automated acceptance evidence

| Gate | Result |
|---|---|
| Full Vitest suite | PASS — 37 files, 267 tests |
| Dependency audit | PASS — 0 known vulnerabilities after Vite 8 / Vitest 4 upgrade |
| Level 1 causal proof | PASS — 10 saved, 0 lost; material chain within 10 simulated seconds |
| Level 2 proof | PASS — broad water interaction; 10 saved, 0 lost |
| Level 3 route proof | PASS — fast charge 8/10; lossless sand route 10/10 |
| Daily Rescue certificates | PASS — 7 bases × 3 variants = 21 deterministic solutions |
| Simulation benchmark | PASS — busiest sampled Site p99 3.964 ms; maximum 9.076 ms |
| Basic build | PASS — 25 files, 1,608,397 uncompressed bytes |
| Critical JS | PASS — 373.75 kB gzip |
| Basic artifact SHA-256 | `5249e53babad368e094e1a25509ef583452f373b8100c17242bd01fbf01ddd86` |
| Basic boundary | PASS — no SDK URL, dev harness, prototype, custom rotate gate, or deleted splash marker |
| Full boundary | PASS — SDK present only in Full; no dev/prototype/rotate markers |
| Full mocked SDK journey | PASS — init 1, gameplay starts 2, stops 1, no premature ad request |
| Submission media | PASS — 3 required covers; 2 silent 15–20 second previews |
| Diff hygiene | PASS — `git diff --check` |

Machine-readable results are in
`.artifacts/crazygames-candidate/deterministic-proof.json` and
`.artifacts/crazygames-candidate/proof-metadata.json`.

## Compiled-browser evidence

- Desktop 907×510: playable in 905 ms with eight cold-start requests; the first
  Basher command was accepted and consumed.
- Android-class 844×390, DPR 1, four cores / 4 GB: Mobile profile selected the
  low presentation tier; controls met the 44 px target.
- Portrait mobile boundary: no game-owned orientation modal; supported
  orientation is delegated to the CrazyGames host.
- Storage denied: the first Site remained playable with safe in-session
  progression.
- Workshop 800×450: all six projects, Daily Rescue, Atlas gaps, and 44 px
  controls fit without root overflow.
- Deferred UI: Pause and Workshop assets loaded when opened; the Basic cold
  path made no CrazyGames SDK request.

Screenshots are under `.artifacts/crazygames-candidate/browser/`. Honest
gameplay frames used to validate preview motion and composition are under
`.artifacts/crazygames-candidate/media/`.

## Media evidence

- Covers: 1920×1080 landscape, 800×1200 portrait, and 800×800 square.
- Preview clips: 1920×1080 at 18.64 seconds and 1080×1620 at 18.80 seconds.
- Both previews are silent, below 50 MB, open on the matching cover, contain no
  cursor or promotional copy, and show the real Basher/material chain.
- Exact built-in image-generation prompts and output identifiers are retained
  in `marketing/crazygames/source/prompts.md`.

## External release gates

- `Swarmwright` requires human name and trademark clearance.
- Fifteen provenance records intentionally remain unresolved pending human
  originality, commercial-rights, and procedural visual/audio review. The
  proof build passes; release packaging fails closed while these remain.
- Five-player cold comprehension, real-device touch/safe-area behavior, and
  aggregate Basic Launch funnel/retention metrics require people and traffic.
- The uploaded archive still needs CrazyGames Developer Portal Preview and
  iOS/Android app-webview QA, including the host landscape rotation gate.
- Full Launch still requires a hosted test of real SDK availability, ad fill,
  lifecycle callbacks, and mute restoration.
