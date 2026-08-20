# Documentation map

Last reconciled: 2026-08-20.

This index separates the current shipping contract from dated design history.
When documents disagree, use the first applicable source below.

## Current authority

1. [`../AGENTS.md`](../AGENTS.md) — engineering rules, architecture boundaries,
   and delivery workflow.
2. [`product-status.md`](./product-status.md) — current product scope, internal
   readiness, CrazyGames/Poki alignment, and the next evidence gates.
3. [`platform-runtime.md`](./platform-runtime.md) — the one-artifact direct,
   Vercel, Poki, and CrazyGames runtime contract.
4. [`crazygames/2026-08-18-product-design.md`](./crazygames/2026-08-18-product-design.md)
   — accepted product intent, hypotheses, economy, onboarding, and success
   criteria. Its dated baseline audit describes the repository on 2026-08-18,
   not the current implementation.
5. Headless simulation behavior remains governed by the accepted specs in
   [`superpowers/specs/`](./superpowers/specs/) and the solvability contract in
   [`level-design-review-and-solvability-test-plan.md`](./level-design-review-and-solvability-test-plan.md).

`CLAUDE.md` mirrors `AGENTS.md` for tools that discover that filename. Keep the
two files aligned except for their headings.

## Current evidence and release control

- [`crazygames/2026-08-20-adversarial-review.md`](./crazygames/2026-08-20-adversarial-review.md)
  — fresh compiled-flow audit and current hostile findings.
- [`m7-release-signoff.md`](./m7-release-signoff.md) — human, device, hosted,
  identity, and provenance gates that local automation cannot close.
- [`crazygames/2026-08-18-performance-worker-spike.md`](./crazygames/2026-08-18-performance-worker-spike.md)
  — bounded performance evidence; it does not authorize a Worker migration.
- [`../marketing/crazygames/README.md`](../marketing/crazygames/README.md) —
  submission media inventory and validation commands.

## Historical records

The remaining dated CrazyGames plans, proof reports, review logs, presentation
gauntlets, and `superpowers/plans/` files are decision history. They explain why
the product changed, but they are not executable delivery plans. In particular:

- do not restore separate Basic/Full/CrazyGames build variants;
- do not recreate the retired `codex/crazygames-d3` branch;
- do not restore a title screen, level grid, custom portal rotation gate, or
  pre-game settings step;
- do not treat old artifact hashes, test counts, dirty-tree notes, or release
  blocker counts as current evidence.

## Maintenance rule

Update `product-status.md`, `platform-runtime.md`, and the release sign-off when
the shipping contract changes. Preserve dated records as history and add a
supersession note instead of silently rewriting their original evidence.
