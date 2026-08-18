# Swarmwright Worker Spike and Performance Decision

**Date:** 2026-08-18

**Candidate:** CrazyGames Basic Launch / D3

**Command:** `npm run benchmark:sim`

## Decision

Keep the deterministic simulation on the main thread for the Basic Launch
candidate. Do not introduce a Worker transport before hosted device evidence
shows simulation is the source of frame loss.

This is the bounded exception allowed by the D3 implementation plan. A Worker
would require replacing synchronous input/terrain access with command queues,
serialising agent snapshots, and transferring dirty material cells. That change
touches every causal onboarding beat and creates more determinism and latency
risk than the measured simulation cost currently justifies.

## Reproducible local evidence

The benchmark advances 5,000 deterministic 16 ms ticks per case and consumes
the same dirty-chunk descriptors used by rendering.

| Case | Average tick | p95 | p99 | Maximum | Avg dirty chunks | Max dirty chunks |
|---|---:|---:|---:|---:|---:|---:|
| Site 1 chain | 0.371 ms | 1.595 ms | 3.027 ms | 9.076 ms | 1.65 | 5 |
| Site 7 fire/timber | 0.079 ms | 0.641 ms | 1.899 ms | 5.914 ms | 0.16 | 6 |
| Site 10 full-system geometry | 0.640 ms | 2.642 ms | 3.964 ms | 7.548 ms | 0.38 | 2 |

A production-browser sample at 800×450 over 240 animation frames measured a
15.87 ms average, 27.2 ms p95, 35.2 ms p99, and 36 ms maximum on the development
machine. This is evidence about the local candidate only, not a substitute for
the required low-end Android and CrazyGames app-webview pass.

## Safeguards shipped instead

- low/medium/high presentation classification from cores, memory, DPR, and host
  device type;
- particle, lighting, and animated-terrain redraw budgets that never alter sim
  ticks, seeds, command order, or solvability;
- one-way automatic tier reduction after three continuous seconds below 30fps;
- telemetry for frames over 100 ms with particle and dirty-chunk counts;
- chunked terrain redraw and fixed-step catch-up reset on lifecycle suspension;
- explicit WebGL context-loss recovery plus observed Phaser Canvas fallback to
  be checked in the final browser matrix.

## Reopen criterion

Reopen the Worker migration if a real target device shows either:

1. simulation p99 above 8 ms while rendering is independently within budget;
2. any repeatable simulation task above 50 ms;
3. three-second quality degradation that persists at the low presentation tier;
4. dirty-chunk traffic that can be transferred below 256 KB/s without adding
   more than one fixed-tick of input latency.

Until then, the simpler synchronous architecture is the safer causal-puzzle
implementation. Hosted iOS/Android app-webview performance remains an external
submission gate and cannot be self-certified locally.
