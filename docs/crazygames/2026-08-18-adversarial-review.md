# Swarmwright CrazyGames Product Design — Adversarial Review

> **Historical design-gate review.** Findings below were resolved into the D3
> contract or deliberately left for player/market evidence. The fresh compiled
> product review is `2026-08-20-adversarial-review.md`; current status is
> `docs/product-status.md`.

**Reviewed draft:** D1, 2026-08-18

**Method:** Fresh-pass hostile review against the supplied portal pillars, current
official CrazyGames documentation, the live repository audit, and production
scope. This is an internal critique, not independent player evidence.

**Verdict:** REVISE
**D1 confidence score:** 79/100

## Scorecard

| Category | D1 score | Gate |
|---|---:|---|
| Distinctive promise and intrinsic play | 4.5/5 | Pass |
| First 5/30/90 seconds | 4.0/5 | Pass with findings |
| Landscape touch usability | 4.0/5 | Pass with real-device gate |
| Session structure and retry | 4.25/5 | Pass |
| Progression and return architecture | 3.25/5 | Revise |
| Monetisation restraint and SDK fit | 4.0/5 | Pass with finding |
| Technical feasibility and payload | 3.5/5 | Revise |
| Scope and evidence discipline | 3.25/5 | Revise |
| Platform compliance and brand safety | 4.5/5 | Pass with external gates |

## Findings

### F1 — BLOCKER: continuously banked Salvage is trivially farmable

**Attack:** Rescue one crew in Site 1, restart, and repeat. D1 says every rescue
banks immediately, so the easiest ten seconds of the game becomes the optimal
economy. That destroys site mastery and makes Workshop prices meaningless.

**Resolution:** Each campaign site stores `bestSavedCount`. A rescue grants one
Salvage only when the current attempt’s saved count exceeds that stored best.
The new best and grant persist together immediately. Improving from 4/10 to 7/10
grants three; repeating 7/10 grants zero. Atlas bonuses remain one-time. Daily
rewards are keyed by UTC date and threshold. Offline Workshop production is the
bounded renewable source.

### F2 — MAJOR: returning-player behavior is undefined

**Attack:** The design correctly removes first-time title friction but says
nothing concrete about a player returning to changed Workshop state. Auto-loading
straight into danger hides the return hook; loading a full hub breaks the portal
start rule.

**Resolution:** Returning players see the next live site behind a single-action
Continue surface. A compact Workshop vignette visibly reflects away progress;
`CONTINUE` is dominant, while Workshop/Daily are secondary. This is at most one
click and is never shown to a new save.

### F3 — MAJOR: the first instruction violates the one-verb constraint

**Attack:** `TAP THE CREW TO BASH` contains two verbs and teaches both input and
system vocabulary at once.

**Resolution:** Use `TAP THE CREW`. Basher selection, icon pose, gold target halo,
and the nearby dirt face communicate the consequence. Record whether players can
predict or explain the bash after the input.

### F4 — MAJOR: Level 1 risks being a disguised cutscene

**Attack:** If the authored chain happens regardless of which crew receives the
command, or if it starts on a timer, the player learns that spectacle is automatic
rather than caused by them.

**Resolution:** The acceptance proof must show that no breach/material/bridge
milestone occurs without the valid Basher command; invalid input changes no stock
or terrain; the commanded crew causes the real carve that releases the chain.

### F5 — MAJOR: local-only storage cannot produce the required aggregate funnel

**Attack:** The document mandates an 80% 90-second reach metric while forbidding
a backend. Local event logs can support a lab study, not live aggregate drop-off.
CrazyGames Basic Launch supplies playtime, D1, and one-minute conversion, not the
custom event sequence.

**Resolution:** Make this an explicit owner decision before external testing:
approve one privacy-safe analytics service, dynamically loaded after first input,
or accept that custom-funnel evidence comes only from instrumented cold playtests.
Do not claim live funnel observability until that decision is made.

### F6 — MAJOR: the first Workshop purchase is too weak

**Attack:** Paying to make a hint button “easier to find” reads like the game
selling a UI repair.

**Resolution:** Signal Lamp becomes a tangible assist: after a failed attempt it
highlights the first dangerous material relationship once per site. The ordinary
free hint remains available; the project improves clarity without changing stock
or canonical solvability.

### F7 — MAJOR: Daily streak “freeze forever” removes both meaning and urgency

**Attack:** A 30-day chain that remains 30 after a month away is not consecutive
and makes the counter dishonest.

**Resolution:** One missed UTC day consumes an automatic grace and preserves the
chain. Two consecutive missed days end the current chain but preserve best chain,
total Daily completions, all rewards, and all content. No earned asset decays.

### F8 — MAJOR: the Worker migration can consume the project before the product is proven

**Attack:** Moving a mutable terrain grid, all agents, and CA into a Worker without
SharedArrayBuffer can create a second engine and weeks of transfer/performance
work before Level 1 comprehension is validated.

**Resolution:** Keep Worker as the production requirement, but Gate A remains
main-thread-capable and product-first. Gate B is a bounded spike: Level 1, one
emitter/fire stress site, deterministic replay equivalence, and dirty-chunk
bandwidth. No wholesale migration or remaining-content reauthoring begins until
the spike passes. If it cannot sustain 30 fps without changing outcomes, shrink
level/CA workload before changing the deterministic rules.

### F9 — MAJOR: the Daily pool and ten-level rewrite create a scope cliff

**Attack:** Reauthoring ten sites, building three meta systems, migrating to a
Worker, creating 28 Dailies, integrating analytics/SDK/ads, and replacing public
art is a full production, not one milestone. Parallel work risks polishing
retention around an unproven first minute.

**Resolution:** Retain strict sequential gates. Gate A must pass cold players;
Gate B must pass delivery; Gate C must prove one Expedition and continuous save.
Only then build return systems. Basic Launch needs 21 certified Daily variants to
cover its maximum 21-day test without forced repetition; expand to 28+ before
Full Launch.

### F10 — MAJOR: delayed Workshop doubling is cognitively awkward

**Attack:** D1 grants away production on return but proposes doubling it only
after a later Expedition result to satisfy the 90-second ad rule. The delayed
offer is hard to explain and weakens trust.

**Resolution:** Replace it with `Double this Expedition's Salvage` on an eligible
later-session Expedition result. Base Salvage is already banked before the offer.
The reward is immediate, optional, and legible.

### F11 — MINOR: host orientation abandonment may be unobservable in-game

**Attack:** If CrazyGames prevents the iframe/game from starting until rotation,
the game cannot emit `orientation_prompt_seen`. Inventing that event would create
false confidence.

**Resolution:** Record `orientation_at_game_load` only when code actually runs,
and use the portal’s conversion breakdown or a CrazyGames-provided report for
pre-load orientation abandonment. Do not recreate the host prompt merely to
measure it.

### F12 — MINOR: first-minute reward stack can obscure causality

**Attack:** Rescue burst, Salvage pop, Workshop meter, Atlas unlock, confetti,
audio, and chain effects within seconds can cover the terrain event the player is
supposed to understand—especially muted at 800×450.

**Resolution:** Keep rescue feedback in-world, show a small `+1 Salvage`, and defer
the first Atlas card to the site result. No full-screen reward interrupts the
bridge crossing.

### F13 — MINOR: clock manipulation can inflate away production and Daily state

**Attack:** Local-only time can jump backward or forward. A forward clock change
could generate repeated four-hour claims or change the Daily seed unexpectedly.

**Resolution:** Clamp each away calculation to four hours, persist last-seen UTC,
ignore negative deltas, and allow at most one away grant per boot/session epoch.
Daily selection is locked for an active attempt. Treat clock cheating as a local
integrity limitation, not a reason to add a backend.

### F14 — MINOR: public-title replacement is a release blocker, not marketing polish

**Attack:** Deferring the name until cover production can waste art and repeat the
current `LEMMINGS X` confusion problem.

**Resolution:** Clear a public name and wordmark before final UI strings, covers,
previews, or public playtest distribution. `Swarmwright` remains explicitly
temporary.

## D2 acceptance conditions

D2 passes this internal design gate when it:

- closes the Salvage farming exploit;
- defines the one-click returning flow;
- uses a single-verb first cue and proves command causality;
- marks live custom analytics as an unresolved owner decision;
- strengthens the first Workshop purchase;
- repairs Daily and away-time semantics;
- replaces delayed away-production doubling;
- phases Worker and Daily scope behind product evidence;
- retains all official landscape, SDK, ad, media, and brand gates.

Independent cold-player, real-device, hosted Preview, and Basic Launch evidence
remain unavailable and cannot be passed by documentation.

## D2 disposition — PASS for product direction

**Reviewed revision:** D2, 2026-08-18

**D2 confidence score:** 90/100

**Gate state:** PASS for staged product validation; not an implementation,
release, or market-evidence pass

D2 resolves F1–F14 in the design source of truth:

- campaign Salvage now uses atomic per-site saved-count records and cannot be
  farmed by repeating an already rewarded rescue;
- new and returning entry flows are separately defined;
- the first cue contains one verb and a deterministic guard proves causality;
- live aggregate analytics is marked as an open owner decision rather than an
  assumed capability;
- Workshop, Daily, away-time, and rewarded-double semantics are concrete;
- Worker migration and Daily/content scope are staged behind the first-minute
  product proof;
- orientation measurement does not invent access to the host-owned rotate gate;
- brand clearance remains an early release blocker.

The largest remaining unknown is cold-player conversion: whether a player can
select the first crew, understand the material chain, and want another Site
without coaching. Gate A correctly makes that evidence the next product step.

## D3 refinement disposition — LOCKED FOR GATE A

**Reviewed revision:** D3, 2026-08-18

**D3 design confidence score:** 93/100

**Gate state:** Product contract locked; implementation and market evidence
remain unproven

D3 responds to the post-D2 critique without expanding the launch fantasy:

- defines the primary experience as feeling clever through understood causality,
  not merely watching systemic spectacle;
- locks the platform, onboarding, session, persistence, retry, monetisation, and
  delivery decisions behind explicit change control;
- adds a first-five-minute playable storyboard in which Site 2 requires a
  predicted material consequence by 90 seconds and Site 3 presents a real route
  trade-off by five minutes;
- makes the first Workshop purchase a choice between two equal-price projects,
  each with an immediate visible world change;
- adds a starting economy ledger and validator while keeping the numbers marked
  as tunable rather than falsely proven;
- constrains 21 Basic Daily configurations to seven authored bases with three
  meaningfully different, solver-certified variants each;
- separates Gate A, the first-Expedition vertical slice, the complete Basic
  Launch candidate, and Full Launch expansion;
- adds a hypothesis register with mandatory responses and kill/pivot criteria;
- moves public-name comprehension testing before full media production and
  recommends a replaceable privacy-reviewed analytics adapter;
- revalidates the contract against the current official technical, gameplay,
  Basic Launch, and advertisement requirements; rewarded hint controls are now
  confined to frozen failure surfaces with a later free path to the same hint.

### Remaining hostile findings

1. **The document cannot prove H1/H2.** Level 1 may still feel like a cutscene,
   and Site 2 may still present only the appearance of choice. Gate A must use
   cold players and the real deterministic sim.
2. **The economy values are starting assumptions.** Final Site quotas, player
   performance, Daily use, and return behavior can invalidate them. The economy
   validator is a delivery requirement, not optional balancing polish.
3. **The Basic candidate is still a substantial production.** Sequential gates
   protect against premature scale, but they do not make ten Sites, retention
   content, platform integration, brand media, and device QA small.
4. **Landscape viability is established, not guaranteed.** Only hosted and
   device-segmented conversion evidence can show whether this product survives
   the orientation cost.
5. **The title remains open.** `Swarmwright` may be evocative yet too obscure or
   factory-coded at portal size. It has no special protection in the name test.

No additional design-document pass should precede Gate A unless an official
CrazyGames requirement changes. The next meaningful refinement must come from
observed player behavior, timing, performance, or delivery evidence.
