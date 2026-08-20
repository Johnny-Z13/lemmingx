# Swarmwright product and delivery status

Last reconciled: 2026-08-20.

## Decision

Swarmwright is an internally green, guarded multi-portal candidate. It maps well
to the CrazyGames success levers that can be designed and verified locally:
immediate play, a one-verb first action, visible cause and effect, fast retry,
short progression units, persistent growth, daily return content, small initial
delivery, responsive play, and portal-safe lifecycle handling.

That is not the same as proving market success. CrazyGames Basic Launch remains
the authority for one-minute conversion, average playtime, and D1 retention.
The repository must not describe those traffic-dependent outcomes as passed.

## Shipping product

- One production artifact serves direct/Vercel, Poki, and CrazyGames. Runtime
  host detection selects no SDK, Poki v2, or CrazyGames v3; there are no portal
  build variants.
- A new player lands directly in live Site 1. `TAP THE CREW` is the only opening
  instruction, and the accepted command causes the real sand → water → timber
  chain before the first result.
- Sites 1–3 form the first Expedition. The ten-site campaign, six Workshop
  projects, 14-entry Atlas, 21 solver-certified Daily configurations, capped
  away accrual, and Test Yard provide progression and return reasons.
- Player mode keeps the HUD contextual and hides Sandbox/prototype machinery.
  Local Dev Sandbox remains a development-only diagnostic surface.
- Progress is written continuously through an incognito-safe versioned save.
  Core play never depends on ads, an account, a backend, or optional meta.

## CrazyGames success mapping

| Success lever | Current implementation | Evidence state |
|---|---|---|
| Immediate gameplay / at most one click | Zero pre-game clicks; live Site 1 is the first frame | Internally observed |
| One-minute conversion | Small build, direct action, no intro, fast causal payoff | Product-aligned; only Basic Launch traffic can prove 80%+ |
| Average playtime | Ten Sites, three-Site Expeditions, Workshop, Atlas, Daily, Test Yard | Product-aligned; only Basic Launch traffic can prove 10+ minutes |
| D1 retention | Continuous save, visible progression, Daily, away change, Atlas gaps | Product-aligned; only Basic Launch traffic can prove 10–15% |
| Clear onboarding | One verb in Site 1; one terrain prediction in Site 2; route trade-off in Site 3 | Deterministic and screenshot-backed; five-player comprehension remains open |
| Performance and delivery | Relative paths, streamed later content, portal payload/file checks, deterministic fixed ticks | Internally verified; hosted and low-end hardware evidence remains open |
| Mobile eligibility | Landscape layout, capability-based device profile, safe-area policy, touch targeting | Automated proxy green; real Vercel/portal iPhone and iPad passes remain open |
| Original presentation | Clean-room runtime and provenance inventory | Technical boundary green; human name, originality, and commercial-rights review remains open |
| Full Launch integration | CrazyGames lifecycle/progress/happytime/ad seams; Poki lifecycle/ad seam; direct no-op | Mocked compiled checks green; real hosted SDK/ad-fill behavior remains open |

Official CrazyGames targets and mandatory requirements are linked from
[`platform-runtime.md`](./platform-runtime.md). Platform metrics are hypotheses
until the Developer Portal reports them.

## Development order

1. **Protect the first minute.** Do not add a title screen, mode picker, account,
   settings step, narrative modal, or permanent instruction panel before play.
2. **Collect external evidence next.** Run five cold-player sessions, then the
   signed Vercel/portal iPhone and iPad journeys in the release sign-off.
3. **Resolve release identity.** Clear or replace the working name and review
   every unresolved provenance record before public media or release claims.
4. **Use Basic Launch data to revise.** Change onboarding, difficulty, session
   pacing, or return systems only in response to observed drop-off and retention.
5. **Activate monetisation only after eligibility.** Basic Launch has no visible
   ad affordance. Full Launch may enable the already guarded placements after
   hosted SDK and disabled/unfilled/error paths pass.

Do not begin a Worker migration, add more permanent currencies, expand the
campaign, or build a backend before evidence identifies that work as the next
constraint.

## Verification snapshot

Fresh on 2026-08-20:

- 38 Vitest files / 273 tests pass, including all campaign and Daily solvability
  certificates;
- the production build passes TypeScript and Vite compilation;
- the portal artifact passes at 30 files / 2,070,107 bytes with SHA-256
  `53ef69e7b31b16d77edb988b73450bac8799ce9ed7404ab4ba769ecd01c1107d`;
- CrazyGames and Poki compiled SDK lifecycles pass with no premature ad request;
- the compiled browser journey passes desktop 907×510, Android-class 844×390,
  direct/embedded orientation ownership, denied storage, Workshop, and Test Yard;
- all character, terrain-icon, cover, and silent-preview validators pass.

The artifact remains proof-only because 15 shipped/submission provenance records
are unresolved. See the release sign-off for the external gates.

## Engineering and delivery contract

- Stay on `main`; do not create delivery branches for this repository.
- Keep simulation deterministic and headless, preserve render-only crowd
  spacing, and add/update solvability guards for every campaign change.
- Build with `npm run build`. Validate the same artifact with
  `npm run verify:portals`, `npm run verify:crazygames:browser`,
  `npm run verify:crazygames:sdk`, and `npm run verify:poki:sdk`.
- A local technical pass may be called **internally green**. Only completed
  human, hosted, and traffic rows in [`m7-release-signoff.md`](./m7-release-signoff.md)
  can support a public release or success claim.
