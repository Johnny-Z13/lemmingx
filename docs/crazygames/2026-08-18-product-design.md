# Swarmwright — CrazyGames Product Design

**Working public title:** Swarmwright

**Repository/internal title:** LemmingX

**Revision:** D3

**Date:** 2026-08-18

**Status:** Accepted product contract; internally implemented, with market and
human release evidence still open

**Scope:** CrazyGames-first browser delivery; desktop and landscape mobile/tablet
**Review record:** [`2026-08-18-adversarial-review.md`](./2026-08-18-adversarial-review.md)

> `Swarmwright` is a product placeholder, not a cleared public name. Human
> trademark, confusion, originality, and domain/store review is required before
> public use. The shipped title must not use “Lemmings”, “LemmingX”, or imagery
> that implies ownership of that IP.

## 1. Executive decision

This is not a port of the current prototype. It is a smaller, clearer product
built around the part of the prototype that is genuinely distinctive:

> **Issue one simple rescue command, then feel clever when a living landscape
> turns it into a chain reaction that carries the swarm home.**

The CrazyGames version remains a deterministic side-on rescue puzzle. It does
not become an idle game, a generic level grid, a full Noita chemistry toy, or a
classic-role checklist. Living terrain remains the star; retention systems make
that play easier to return to, not more important than the play itself.

**Experience target:** the player feels clever because a small, intentional
action produces a surprising consequence they can understand, predict, and
improve. Surprise without understood causality is spectacle, not success.

**Product problem statement:**

> We are creating a landscape touch-first rescue puzzle that makes a portal
> player feel clever within 30 seconds by turning one legible command into a
> real, understandable living-terrain reaction.

Decision labels in this document have fixed meanings:

- **LOCKED:** do not revisit before Gate A unless official platform rules change
  or observed evidence directly contradicts the decision.
- **TEST:** the preferred design, with a named experiment and response if it
  fails.
- **OPEN:** an owner decision still required before its named delivery gate.
- **DEFERRED:** outside the CrazyGames launch contract.

The following primary product decisions are **LOCKED**:

1. **Landscape-only mobile is intentional.** Declare landscape support in the
   CrazyGames submission and rely on the host orientation experience. Do not
   show a second in-game rotate modal. The game must be fully touch-playable at
   800×450 CSS pixels and DPR 1 without requiring pinch, hover, or a second
   simultaneous touch.
2. **First-time boot goes directly to a live rescue.** No logo, title, level
   select, settings, difficulty, story card, or separate `Start run` action.
3. **The first input is a crew command within five seconds.** A single waving
   lead crew member is safely held near the dirt face, enlarged by framing and
   surrounded by a generous target halo. Basher is already selected. The only
   cue is `TAP THE CREW`.
4. **The signature chain happens in the first 15 seconds.** The real seeded sim
   performs dirt breach → falling sand → released water → floating timber →
   walkable bridge. It must not be a canned animation.
5. **The first rescue and permanent gain happen inside 30 seconds.** Each new
   per-site saved-count record immediately banks the corresponding Salvage. The
   first material interaction is recorded permanently in the Material Atlas.
6. **Three compact sites form one Expedition.** An Expedition lasts roughly
   four to six minutes and supplies a conclusion, a workshop change, and a
   natural stopping/ad boundary. A successful session target is two or more
   Expeditions and at least ten minutes.
7. **Progress is continuous.** Salvage, discoveries, rescued total, daily
   state, settings, and completed sites save at the moment they change. Closing
   the tab cannot erase an earned reward.
8. **Return architecture has three independent hooks.** The Workshop changes
   while away, a forgiving Daily Rescue changes with UTC date, and the Material
   Atlas exposes meaningful missing interactions.
9. **Basic Launch contains no ad affordances.** Full Launch may add optional
   rewarded hints and Expedition doubling plus interstitial requests only at
   Expedition boundaries, under the stricter pacing in this document.
10. **The delivery budget is stricter than the platform limit.** Initial
    critical transfer is ≤1.5 MB compressed, with a live frame in one second
    and interaction in two seconds on the defined mid-tier Android/4G profile.

These decisions may be simplified in response to evidence, but they may not be
quietly expanded. New mechanics, currencies, permanent HUD controls, onboarding
steps, or launch modes require removing comparable scope and demonstrating that
the change strengthens the experience target.

### 1.1 Locked product contract

| Contract area | Locked decision |
|---|---|
| Player feeling | Clever through understood cause and effect; then curious to try another solution |
| Core differentiator | Author living terrain and issue contextual crew commands to rescue a visible swarm |
| First-time entry | Live Site 1, zero pre-game clicks, one cue and one verb |
| Mobile posture | Landscape-only, touch-first, single-pointer; portrait play is not supported |
| Play unit | 45–120 second Site; three Sites per 4–6 minute Expedition |
| First-session promise | First input ≤5 sec, real chain ≤15 sec, rescue and permanent gain ≤30 sec |
| Agency promise | By 90 seconds the player predicts a consequence and makes a choice that changes the outcome |
| Progress | Save at the moment of earning; no run-end-only banking |
| Return hooks | Changed Workshop, Daily Rescue, Material Atlas; all subordinate to rescue play |
| Monetisation | No Basic Launch ad affordances; later ads are optional gifts at defined breaks |
| Failure | Cause shown visually, free retry, playable again in <3 sec |
| Delivery | ≤1.5 MB compressed critical transfer; DPR 1 and 800×450 are first-class targets |
| Scope posture | Reauthor around the living-terrain USP; existing mechanics have no right to ship merely because they exist |

The only unresolved owner decisions are the cleared public name and the custom
analytics provider. Neither may delay Gate A, but both must be resolved before
external Basic Launch submission.

## 2. Source hierarchy and interpretation

When requirements appear to conflict, use this order:

1. The supplied CrazyGames Design Pillars & Onboarding Guidance is the product
   target unless the owner explicitly revises it.
2. Current official CrazyGames mandatory requirements are publication gates.
3. Current official CrazyGames quality and monetisation guidance informs design
   but does not override a stricter product choice.
4. Every retention or monetisation claim in this document is a hypothesis until
   measured with real players.

Official CrazyGames documentation was rechecked on 2026-08-20. Notable
distinctions:

- CrazyGames permits a 50 MB initial download, or 20 MB for mobile-homepage
  eligibility. The 1.5 MB target here is a deliberate retention budget, not an
  official maximum.
- CrazyGames allows developers to configure supported orientation and supplies
  its own rotate experience. Portrait play is not a publication requirement.
- Full implementations must land a new player in gameplay immediately or after
  at most one click. This design uses zero pre-game clicks.
- CrazyGames’ Basic Launch references 80%+ one-minute conversion, 10+ minutes
  average playtime, and 10–15% D1 retention as strong performance.
- Basic Launch lasts at least seven days and up to 21 days when 500 plays are not
  reached. The 21 dated Daily configurations cover that maximum evaluation
  window; this is a content decision, not a platform content requirement.
- Rewarded request controls may not sit over active gameplay, must make the video
  exchange and optional path clear, and must handle disabled/unfilled paths.
  D3 therefore places hint offers only on frozen failure surfaces and makes the
  same deeper hint available for free after one further failed attempt.

## 3. Audit of the 2026-08-18 baseline

> This section records the implementation baseline that motivated the product
> contract. It is not a description of the current repository. Current delivery
> status lives in `docs/product-status.md`; current portal behavior lives in
> `docs/platform-runtime.md`.

### 3.1 What is already strong

Protect these assets:

- A deterministic, headless TypeScript simulation with no Phaser/DOM imports.
- Seeded sand, water, timber, and fire interactions with real causal value.
- Fixed-step behavior and scripted solvability guards for all ten campaign
  levels.
- A readable 2D cross-section in which route, hazard, crew, and material motion
  can appear in one frame.
- A proven player/Sandbox build boundary and relative-path build verification.
- Render-only crowd spacing, large effective crew hit regions, lifecycle pause,
  safe-area tokens, reduced-motion support, and procedural audio.
- A first-three-level candidate that already demonstrates the complete living
  material chain and two different Level 3 solutions.
- Ten authored levels that can be treated as raw material rather than discarded
  wholesale.

### 3.2 What currently blocks the CrazyGames product

The following observations come from source inspection, the prior proof report,
and a live browser pass on 2026-08-18:

| Area | Current evidence | Product consequence |
|---|---|---|
| Opening | Static title art and `START`, followed by a planning briefing and another `Start run` | The signature mechanic arrives after two non-core actions |
| First target | A moving crew member is only a few visible pixels high at 907×510 | The mandatory first command is fragile on cold pointer/touch play |
| Mobile portrait | Full-screen custom `Rotate to play` modal | Portrait is a dead end and duplicates host orientation behavior |
| Mobile landscape | Current emulated mobile context can under-fill the available frame | Real-device 800×450 framing is an unresolved acceptance gate |
| Progress | Only level wins and best save percentage persist | A closed tab loses all sub-level value and exposes no live meta loop |
| Retention | No accrual, daily, or visible collection gaps | The session ends without an open loop |
| Delivery | Current build is about 4.84 MB uncompressed and 3.08 MB by a gzip/PNG transfer estimate | It misses the deliberately strict 1.5 MB critical target |
| Critical assets | 1.67 MB title PNG, 897 KB backdrop PNG, 1.66 MB JS (391 KB gzip) | The largest asset pays for a screen that should not exist for new users |
| Bundle | Phaser, all levels, menus, Lab, results, and debug-adjacent code are in one JS entry | Later-session systems are paid for before first play |
| Performance | Fixed step exists; no simulation Worker; graphics quality is manual | Main-thread stalls and automatic degradation are unproven |
| Platform | No current CrazyGames SDK/game/ad adapter | Full-launch lifecycle and monetisation are absent |
| Analytics | No end-to-end product funnel | Retention decisions cannot be evidence-led |
| Brand | Title art visibly says `LEMMINGS X` | Public release has an avoidable IP/confusion risk |
| Tone | Fatal falls use large blood spray and persistent stains | Unnecessary PEGI-12, thumbnail, and broad-audience risk |
| Complexity | Nine roles, queue ordering, Random queue, release rate, nuke, open toolbox, movable dock, Hero Move, minimap, labels | The product exposes expert vocabulary before proving its core verb |

The current proof verifier also fails after the in-progress pause/settings edits
because provenance hashes are stale. That is expected working-tree evidence, not
a product defect; provenance must be regenerated only when the relevant code is
actually accepted.

## 4. Experience and Elemental Tetrad

The four parts of the game must all support the same experience.

| Element | Current state | CrazyGames target |
|---|---|---|
| Mechanics | Strong systemic simulation; too many controls and overlapping roles | One or two contextual tools per site, immediate consequence, multiple later solutions |
| Story | Generic rescue context | A tiny salvage crew restores a stranded Workshop by recovering people and material knowledge |
| Aesthetics | Distinctive industrial pixel world; dark, dense, and visually tiny at portal sizes | Brighter material contrast, larger crew silhouettes, obvious exit/obstacle, muted-complete feedback |
| Technology | Excellent deterministic test seam; oversized critical path and main-thread sim | Streamed/code-split delivery, Worker simulation, device tiers, automatic quality fallback, SDK adapter |

The story is intentionally light. It exists to make rescued crew, Workshop
growth, and collected interactions feel coherent. It must never delay play.

## 5. Product structure

### 5.1 Core loop

`Read route → issue one command → watch material reaction → adjust or release → rescue crew → bank Salvage/discovery → next site`

The repeated decision is **where and when to alter the crew or landscape**. If
that decision is not interesting without Salvage, unlocks, or a streak, the site
is not ready.

### 5.2 Play units

| Unit | Target duration | Purpose |
|---|---:|---|
| Reaction beat | 5–15 sec | Input produces visible terrain/crew consequence |
| Rescue Site | 45–120 sec | One compact puzzle and one reward conclusion |
| Expedition | 4–6 min | Three sites, one meaningful route choice, one Workshop change |
| Session | 10–15 min | Two or more Expeditions, mastery, Daily Rescue, or Test Yard |

The ten existing campaign levels become three Expeditions plus a finale:

1. **First Shift — Sites 1–3:** bash/material chain, water/timber, blocker plus
   destructive versus lossless route.
2. **Pressure Works — Sites 4–6:** scrolling, steel/sand excavation, emitters and
   traps. Only one new required concept per site.
3. **Hazard Line — Sites 7–9:** fire/timber/quenching, vertical mining, fatal
   drops and permanent traits.
4. **The Last Crossing — Site 10:** a longer finale combining mastered systems.

The current geometry is not sacred. Every site is cropped or rebuilt until its
main route, immediate risk, and editable target remain readable at 800×450.

### 5.3 Planning and time

- Site 1 has no planning phase and no separate start action.
- Site 2 introduces a safe planning state through the world, not a modal. Water
  is selected; after the first valid pour, the hatch itself pulses `RELEASE`.
- From Site 3 onward, players may pause to plan at any time. Selecting a crew
  command briefly freezes the sim until a target is chosen or cancelled.
- Introductory sites have no fail timer. Later timers are optional mastery
  targets unless a level’s fiction and geometry genuinely require one.
- Fast-forward appears after the player completes the first command and remains
  a deterministic 1×/2×/3× render-independent throughput control.

### 5.4 Failure and retry

- Failure freezes on the causal state and names one cause in plain language.
- One dominant `RETRY` action reconstructs the site from its factory and is
  playable in under three seconds.
- A second action, `HINT`, appears only after the player has first experienced
  the failure. The first hint on each site is free.
- Every failed attempt retains previously banked Salvage and Atlas discoveries.
- No energy, life, cooldown, or ad is required to retry.

## 6. First-session specification

### 6.1 0–90 seconds

| Time | Player experience | Acceptance event |
|---:|---|---|
| 0–1 sec | Level 1 world is visible and alive: crew waves, water moves, exit pulses | `first_frame` |
| 1–5 sec | Gold halo marks the safely held lead crew; cue says `TAP THE CREW` | `first_input` |
| 5–15 sec | Basher breaches nearby dirt; actual seeded sand, water, and timber chain resolves | `first_chain_reaction` |
| 15–30 sec | Timber forms the crossing; first crew exits; `+1 Salvage` banks immediately | `first_reward` |
| 30–60 sec | Remaining crew cross; result states saved percentage and `NEXT SITE` | `site_complete` |
| 60–90 sec | Site 2 starts with Water already selected and one cue: `POUR WATER` | `second_verb_shown` |

Level 1 must pass three cold-player tests:

1. At least four of five players complete the first command without coaching.
2. At least four of five can explain that water lifted the timber because the
   breach changed the landscape.
3. At least four of five say their command caused the rescue rather than
   describing the sequence as something the game did for them.

It must also pass a deterministic causality guard: without the accepted Basher
command, no breach, water release, timber lift, or crossing milestone occurs.
Invalid input must consume no stock and alter no terrain.

The first chain must be causal but not cognitively noisy. Reward presentation is
sequenced: rescue feedback first, quiet Salvage increment second, Atlas reveal
on the result card. Do not stack three full-screen celebrations.

### 6.2 90 seconds–5 minutes

- Site 2 completes the full author/release/rescue loop with a terrain stroke.
- Its pour target is a broad successful region rather than a single correct
  pixel. Two visibly plausible pour areas both rescue the quota but alter the
  fill speed, timber height, or number rescued. The player must predict one and
  see the consequence before `RELEASE`.
- Site 3 introduces the first consequential choice: a fast destructive charge
  route or a slower lossless sand route.
- The two routes must produce visibly different mastery results while both can
  meet the quota.
- Completing Site 3 ends the first Expedition, restores a visible Workshop
  module, and guarantees enough Salvage for the first Workshop project.
- The end surface shows, without forcing navigation:
  - one affordable project;
  - the Workshop’s next incomplete construction;
  - the Material Atlas with visible gaps;
  - today’s always-available Daily Rescue.

### 6.3 First-five-minute playable storyboard

This is the Gate A/C authoring contract. Timing may compress when a player acts
quickly, but no beat may be replaced by a modal explanation.

| Time | Required player agency | Visible consequence | Failure condition |
|---:|---|---|---|
| 0–5 sec | Tap the held lead crew member | Basher commits toward the marked dirt face | Player cannot identify a target without coaching |
| 5–30 sec | Observe the result of that command | Dirt, sand, water, and timber resolve; the route opens and rescue begins | Chain reads as decoration or an autoplay sequence |
| 30–60 sec | Confirm `NEXT SITE`; no menu detour | Site 2 appears alive with Water selected and its basin framed | Reward surface interrupts momentum or introduces meta vocabulary |
| 60–90 sec | Choose a broad pour region, then predict the effect | Fill speed/bridge height responds to placement; hatch pulses only after a valid pour | Only one exact pixel works, or all placements look equivalent |
| 90–150 sec | Release and, if needed, make one corrective pour | Crew cross the player-shaped route; feedback links outcome to placement | Site completes without the player understanding what changed |
| 150–240 sec | Choose the fast destructive route or slower lossless route in Site 3 | Saved count, landscape damage, and mastery result diverge visibly | Choice is cosmetic or has one obviously correct answer |
| 240–300 sec | Finish the Expedition and choose one of two first Workshop projects | Rescued crew visibly occupy and restore the selected Workshop area | Meta reward overwhelms the rescue result or purchase is forced |

**Agency gate:** by 90 seconds, at least four of five cold players must correctly
predict one material consequence before it resolves. By five minutes, at least
four of five must identify the Site 3 trade-off without reading a rules page. If
either test fails, reauthor the Sites before building return systems.

### 6.4 Returning-player entry

- A returning player loads the next live Site behind a one-action Continue
  surface, not a static title or a mandatory hub.
- A compact Workshop vignette behind or beside the Continue action visibly
  reflects away progress. `CONTINUE` is dominant; Workshop and Daily are
  secondary.
- The surface is never shown to a new save and never requires more than one
  click before play.
- If the player closed during a Site, return to that Site’s initial deterministic
  state while retaining every Salvage and Atlas gain already banked.

Vocabulary order:

1. First minute: `Bash`, `Pour`, `Rescue`.
2. First Expedition: `Salvage`, then `Workshop`.
3. Expedition result: `Atlas` and `Daily Rescue`.
4. Later Expeditions: specialist roles, mastery, interaction names.

## 7. Controls and HUD

### 7.1 Common interaction contract

- Tap a visible tool, then tap a crew member or drag on the landscape.
- All controls and effective crew targets are at least 48×48 CSS pixels.
- Selecting a crew command pauses the site until assignment, preventing a
  precision race against a tiny moving target.
- A touch beginning on a crew target remains a target gesture until an 8 CSS px
  threshold; a touch beginning on empty world becomes a pan after that threshold;
  an active brush paints and never pans.
- No required action uses hover, right-click, double-click, long-press, pinch,
  two simultaneous touches, keyboard, or device tilt.
- Desktop keyboard support remains an accelerator, not the teaching surface.

### 7.2 Persistent HUD budget

- Top: Site, saved/quota, and optional mastery timer. Salvage appears only after
  the first rescue and never competes with the immediate goal.
- Bottom: a fixed contextual belt with at most three visible tools plus Pause,
  Retry, and—after onboarding—Fast-forward.
- No movable/collapsible window, release-rate control, queue strip, nuke, Hero
  Move, audio sliders, build metadata, permanent mission card, or labels.
- Pause owns audio, graphics, restart, campaign, privacy, and delete-save.
- Minimap appears only when scrolling is introduced and never during the first
  Expedition.

### 7.3 Landscape mobile

- Supported play orientation: landscape only.
- Primary acceptance viewport: 800×450 CSS px at DPR 1.
- Additional checks: 844×390, 915×412, 1080×607, and tablet safe-area variants.
- Important UI uses `env(safe-area-inset-*)` plus a 12 px minimum.
- The canvas fills the usable viewport; letterboxing may preserve 16:9 only when
  the remaining bars are visually integrated and no interaction is stranded.
- The game itself contains no portrait modal. CrazyGames submission metadata
  owns the orientation request.

## 8. What ships, what changes, what is removed

| Disposition | Systems |
|---|---|
| Keep | Deterministic headless sim, materials, fixed tick, 2D camera, level factories, solvability guards, crowd layout, event-driven feedback, procedural audio |
| Rework | First three sites, all mobile framing, result flow, campaign map, role availability, planning, failure text, visual contrast, public identity |
| Retain later | Basher, Blocker, Bomber, Digger, Miner, Swimmer, Floater, Climber; no site exposes more than three actionable tools |
| Remove from campaign | Builder where landscape authoring replaces it, Random queue, explicit hatch queue ordering, release-rate control, nuke, open toolbox, Hero Move |
| Remove from player build | Prototype 11/12, debug labels, developer controls, playtest harness, Sandbox strings/code, title splash on the critical path |
| Remove from tone | Large blood spray and permanent blood stains; replace with dust, sparks, flattened helmet, or soot appropriate to cause |
| Defer | Online/lockstep, accounts, IAP, full chemistry, rigid chunks, procedural daily generation, public leaderboards |

The Test Yard is the renamed Sand Lab. It unlocks after the first Expedition,
loads on demand, and supports free experimentation plus Atlas discoveries. It is
not shown before the player understands the rescue loop.

### 8.1 Scope contract

| Release slice | Required scope | Explicitly absent |
|---|---|---|
| Gate A product proof | Complete Site 1, Site 2 agency slice through the first predicted pour, direct boot, target viewports, cold-player evidence | Workshop, economy, Atlas UI, Daily, later Sites, ads, final brand art |
| First Expedition vertical slice | Reauthored Sites 1–3, continuous save, one result flow, two first Workshop choices, first Atlas reveal, instrumentation adapter | Away accrual, full Daily pool, Sites 4–10, monetisation |
| Basic Launch candidate | Ten campaign Sites, six Workshop projects, 12–16 Atlas entries, 21 certified Daily configurations, return entry, final brand/media, performance/platform gates | Ad affordances, IAP, public leaderboard, procedural unsolved content |
| Full Launch | Basic candidate plus approved rewarded placements, eligible later-session interstitial requests, 28+ Daily configurations, evidence-led fixes | Any system listed as deferred or a new permanent currency |

Basic Launch is not permission to ship a thin demo. It is the smallest complete
product capable of producing meaningful conversion, playtime, return, and
content-churn evidence. Conversely, no Full Launch feature may enter the Basic
candidate merely because its code already exists.

## 9. Continuous progression

### 9.1 Salvage

- Each campaign Site stores `bestSavedCount`. During an attempt, a rescued crew
  member grants one Salvage only when the current saved count exceeds that stored
  best. The new best and grant persist atomically on exit.
- Improving a Site from 4/10 to 7/10 grants three Salvage. Repeating 7/10 grants
  none, so restarting the easiest rescue cannot farm the economy.
- A newly observed material interaction grants a one-time discovery bonus.
- Salvage is written to storage on each grant, not at site or Expedition end.
- Salvage never unlocks the next campaign site; competence, not currency, opens
  campaign progression.

### 9.2 Workshop projects

Workshop projects provide convenience, expression, or return capacity without
changing a site’s canonical solvability:

| Project | Starting cost | Visible Workshop change | Effect |
|---|---:|---|---|
| Signal Lamp | 18 | Restores and lights the broken beacon tower | After a failure, pulses the first dangerous material relationship once per Site |
| Crew Quarters | 18 | Opens the bunkhouse and adds rescued residents | Unlocks the first uniform palette set and resident scenes |
| Archive Scanner | 20 | Activates the Workshop analysis table | Reveals one acquisition clue for each silhouetted Atlas entry |
| Salvage Crane | 22 | Repairs the yard crane and moving cargo track | Raises the away-production cap from two hours toward four |
| Paint Locker | 24 | Adds a visible colour bay | Unlocks later cosmetic palettes; no stat benefit |
| Yard Gantry | 24 | Completes a large exterior Workshop structure | Adds resident activity and the final four-hour accrual cap |

The first Expedition guarantees at least 18 Salvage and presents Signal Lamp
and Crew Quarters as an equal-price choice. Neither is a campaign requirement.
The selected project changes the Workshop immediately; the unselected project
remains visibly incomplete. No first purchase is forced or framed as repairing
an intentionally unclear tutorial.

### 9.3 Economy ledger

The invariants below are **LOCKED**. The numeric starting model is a **TEST** and
must be simulated against final quotas before content lock.

| Source | Amount | Repeatability | Launch envelope |
|---|---:|---|---:|
| Campaign best-saved improvement | 1 per newly rescued crew slot | Once per Site/slot | Up to 100 if ten Sites retain ten crew each |
| Material Atlas discovery | 2 per first interaction | Once per entry | 24–32 across 12–16 entries |
| Daily Rescue completion | 24; +4 for mastery | Once per UTC date | 24–28 per played day |
| Away Workshop production | 1 per completed hour | Once per boot/session epoch | Initially 2, eventually 4 per return |

| Sink rule | Starting model |
|---|---|
| First meaningful choice | Two projects at 18; first Expedition guarantees one |
| Launch project costs | 18, 18, 20, 22, 24, 24; total 126 |
| Dead-zone limit | Each next uncleared Expedition guarantees at least the cheapest newly available project; one Daily completion can buy any single launch project |
| Away-value ceiling | A fully capped four-hour return remains worth less than the minimum first Expedition |
| Campaign access | Never purchased; Sites unlock through completion only |
| Solvability power | Never purchased; projects may clarify, express, or change the Workshop, not make a required route possible |

Before Gate D, run an economy validator over minimum-quota, average, perfect,
Daily-active, and no-return player paths. Change costs or yields if a newly
available project is not reachable from the next uncleared Expedition or one
Daily, if leaving is more efficient than active play, or if the first purchase
is not available after a minimum-quota first Expedition. Numeric changes do not
weaken the locked invariants.

### 9.4 Storage contract

- Use a versioned `*.save.v2` JSON schema behind a `StorageLike` adapter.
- Migrate existing `lemmingx.progress.v1`, audio, and UI settings without losing
  campaign completion.
- Write atomic snapshots after each earned change and maintain an in-memory copy.
- Invalid/corrupt/unavailable storage falls back to an in-session save and never
  blocks play.
- No account, login, or game backend is required. CrazyGames’ Automatic Progress
  Save can back up localStorage for authenticated platform users without a game
  account implementation.

## 10. Return architecture

The three hooks are required but not equal. Their priority is **Atlas first,
Daily second, Workshop accrual third**. The Atlas extends intrinsic curiosity
about material behavior; the Daily supplies a changing rescue; the Workshop
provides a gentle visible return signal. If any hook delays or competes with
rescue play, simplify that hook rather than adding more prompts or rewards.

### 10.1 Accrual — the Workshop changed

- Rescued crew produce one Workshop Salvage per completed away hour, initially
  capped at two hours and eventually capped at four hours.
- The return presentation is a changed Workshop scene—new crates, lit machinery,
  crew at work—not a modal number claim.
- Away production supports cosmetics/convenience only and can never be required
  for a campaign site.
- Its four-hour maximum output remains lower than one active Expedition reward,
  so the game is not better played by leaving.
- The incomplete next Workshop module is visible before the player closes the
  first session.
- Persist last-seen UTC, ignore negative clock deltas, clamp forward deltas to
  four hours, and allow at most one away grant per boot/session epoch. Local
  clock manipulation remains a known local-only integrity limit.

### 10.2 Daily — one shared Rescue

- Unlock after the first Expedition; never require an advertisement.
- Choose from authored, solver-certified variants only. The UTC date selects the
  same variant and starting seed for every player.
- Basic Launch pool: seven authored base rescues, each with three
  solver-certified rule/loadout variants, for 21 dated configurations covering
  the maximum 21-day test without an identical repeat. A variant is accepted
  only when its route, constraint, or optimization question is visibly
  different—a seed or palette change is insufficient. Expand to at least 28
  certified configurations before Full Launch. Repetition after the full pool
  is disclosed by theme, not presented as novel procedural content.
- Score uses saved crew first, then commands used, then time. A compact result
  code can be copied/shared without a backend.
- The first completed Daily per UTC date grants 24 Salvage; meeting its mastery
  target grants four more. Replays improve the result code but grant no further
  Salvage that date.
- One missed UTC day consumes an automatic grace and preserves the current chain.
  Two consecutive missed days end the current chain while preserving best chain,
  total completions, every reward, and every unlocked entry. No earned asset
  decays.

### 10.3 Collection — Material Atlas

- The Atlas contains 12–16 interaction entries such as Wood Floats, Sand Smothers
  Fire, Water Quenches Fire, Blast Opens a Floodgate, and Swimmer Crosses Deep
  Water.
- Locked entries remain visible as silhouettes with one acquisition clue.
- The first entry is earned from the true Level 1 chain and shown on its result
  card.
- Test Yard experiments can fill optional entries; campaign completion is not
  required for every discovery.
- The Atlas is accessible from the Expedition result and Workshop, not buried in
  Settings.

## 11. Monetisation architecture

### 11.1 Basic Launch

- No ad buttons, disabled affordances, fallback ad copy, IAP, or banners.
- SDK integration may exist for gameplay/loading events, but ad availability is
  feature-detected and absent UI stays absent.
- Basic Launch success is decided by core conversion, playtime, and return—not
  simulated monetisation.

### 11.2 Full Launch rewarded placements

1. **Deeper hint:** the first hint for a site is free. After at least two failed
   attempts and 90 seconds of active site play, a rewarded offer may reveal the
   next causal step. It appears only on the frozen failure/result surface, never
   over active play. Declining preserves normal retry, and the same deeper hint
   becomes free after the next failed attempt. The ad accelerates help; it never
   owns the information permanently.
2. **Expedition double:** on an eligible later-session Expedition result, and
   only after at least 90 seconds of session play, optionally duplicate that
   Expedition’s Salvage. Base Salvage is banked before the offer.

No rewarded offer appears more than once per 90 seconds. Ads do not unlock the
Daily Rescue, campaign sites, Atlas entries, roles, materials, or retry.
Every offer visibly names the reward and video exchange before the request.
`CONTINUE` without the ad is immediately available with equal visual prominence;
an unfilled or blocked ad never weakens the base outcome.

### 11.3 Interstitials

- Request only at an Expedition result, never between individual sites or during
  a failure/retry flow.
- Never request during the first session.
- Never request before the third Expedition of a later session.
- Let the SDK enforce its own actual frequency cap; do not add a second timer.
- Do not ship banners. Persistent ad chrome conflicts with the small landscape
  playfield and the “ads are gifts” product rule.

### 11.4 Ad lifecycle

- Freeze sim/input before requesting.
- Call `gameplayStop` at the break; call `gameplayStart` only when active play
  resumes.
- Mute only when `adStarted` fires. Preserve both the player’s own mute setting
  and the host `muteAudio` override; restore the effective pre-ad state after
  `adFinished` or `adError`.
- Treat unfilled, disabled, cooldown, and adblock paths as immediate continuation.

## 12. Technical delivery

### 12.1 Payload and streaming budgets

| Budget | Target | Official CrazyGames reference |
|---|---:|---:|
| First live frame | ≤1.0 sec p75 on target profile | Platform says load quickly |
| First interaction available | ≤2.0 sec p75 | Product target |
| Critical compressed transfer | ≤1.5 MB | ≤20 MB for mobile-homepage eligibility |
| Full launch bundle | ≤8 MB preferred | ≤250 MB total, ≤1,500 files |
| Longest critical main-thread task | <50 ms | No frame >100 ms product target |

Required changes:

- Remove the 1.67 MB title splash from first-time delivery.
- Replace the 897 KB first-world PNG with a mobile-sized WebP/AVIF variant and a
  tiny procedural/colour fallback that can render immediately.
- Keep system fonts; no render-blocking external font.
- Load no audio before first interaction. Runtime synth initialization remains
  gesture-gated.
- Code-split Workshop, Atlas, Daily, Test Yard, later Expeditions, result detail,
  settings, debug tools, and marketing/returning surfaces.
- Player production must tree-shake or compile-exclude Sandbox/prototype code;
  hiding it is insufficient.
- Use only relative bundled paths.

### 12.2 Simulation and rendering

- Preserve the deterministic fixed tick and direct headless test path.
- Move the production simulation—including cellular automata—to a Web Worker.
  The main thread sends input commands; the Worker sends agent snapshots, events,
  and transferable dirty terrain chunks.
- Do not use `SharedArrayBuffer`; portal isolation headers cannot be assumed.
- Rendering may interpolate between snapshots, but quality changes may never
  alter simulation ticks, seeds, command order, or solvability.
- Keep CA and release randomness in separate seeded streams.

The Worker transition is a spike gate: prove one Level 1 chain, one emitter/fire
site, replay equivalence, and bounded dirty-chunk transfer before migrating all
content.

### 12.3 Device tiers and degradation

- At boot, combine `hardwareConcurrency`, `deviceMemory` when available, DPR, and
  CrazyGames system info into low/medium/high presentation tiers.
- DPR 1 is a first-class target, not a fallback afterthought.
- Tier controls resolution scale, background variant, particle count, lights,
  blur, decorative weather, and terrain redraw frequency only.
- If rolling frame time stays over budget for three consecutive seconds, step
  down one tier. Repeat if necessary. Never step back up during the session.
- Any frame over 100 ms records a performance event with active effect counts
  and dirty-chunk count.

### 12.4 Failure recovery

- Handle `webglcontextlost`: prevent default, freeze the game, show one clear
  recovery state, and attempt renderer restoration once.
- Verify Phaser Canvas fallback and WebGL1 behavior on supported devices; never
  claim a fallback from `Phaser.AUTO` without an observed test.
- Blur/hidden/orientation/ad breaks clear held input and fixed-step accumulation.
- iOS AudioContext resumes only from the next valid touch/click.

## 13. CrazyGames integration

Create a small `PlatformAdapter` outside the sim with local/no-op and CrazyGames
implementations. It owns:

- SDK v3 initialization and environment/feature detection;
- `gameplayStart` / `gameplayStop`;
- optional loading events;
- host `muteAudio` and settings-change listener;
- system info and application type;
- rewarded/midgame request lifecycle;
- optional `happytime` only for rare milestones, never ordinary site completion.

Gameplay boundaries:

- `gameplayStart`: the site is visible, responsive, and accepts its first command.
- `gameplayStop`: pause/options, Expedition result, campaign/Workshop/Atlas/Daily
  menus, failure result, or an ad break.
- Do not fire `gameplayStop` merely because browser focus changes; CrazyGames
  handles focus itself.

## 14. Instrumentation and success gates

### 14.1 Required funnel

`load_started → first_frame → first_input → first_chain_reaction → first_reward → 60s_active → 90s_active → first_expedition_complete → second_expedition_started → first_project_purchased → session_end → return_session`

Additional events:

- site start/complete/fail/retry and failure cause;
- tool shown/selected/assigned/invalid;
- hint shown/free/rewarded offer/accept/complete/error;
- route choice for Site 3;
- Workshop/Atlas/Daily view and action;
- frame-tier step-down and >100 ms frame;
- storage unavailable/corrupt/migration result;
- orientation at game-code load (pre-load host-rotation abandonment must come
  from CrazyGames reporting, not an invented in-game prompt event);
- ad offer/accept/start/finish/error by placement.

The provider SDK must not be in the critical entry. Queue small typed events in
memory, dynamically load a privacy-reviewed analytics adapter after first input,
and batch asynchronously with no PII. `sendBeacon` is preferred at lifecycle
boundaries.

**OPEN OWNER DECISION:** aggregate custom funnel data
cannot be measured with localStorage alone. CrazyGames Basic Launch supplies
average playtime, D1, and one-minute conversion automatically, but not this full
custom funnel. Before external testing, either approve one privacy-safe analytics
service as the only non-game backend or formally accept that the custom funnel
is limited to instrumented internal playtests.

**Recommended resolution:** approve one replaceable, consent/privacy-reviewed
analytics adapter with no PII, session replay, advertising identity, or SDK code
in the critical entry. The provider is an implementation choice, not a product
dependency; local and test builds retain an in-memory/no-op adapter. If the
approved service collects data beyond CrazyGames’ own SDK events, provide the
required privacy/terms notice as a non-blocking Settings entry rather than a
pre-game modal.

### 14.2 Headline gates

| Metric | Gate |
|---|---:|
| First interaction | median ≤5 sec; p75 ≤8 sec |
| First reward | p80 ≤30 sec |
| One-minute gameplay conversion | ≥80% |
| New players reaching 90 active seconds | ≥80% |
| First Expedition completion | ≥65% |
| Average playtime | ≥10 min |
| D1 retention | 10–15% target band |
| Retry playable after failure | <3 sec p95 |
| Sustained low-tier performance | ≥30 fps; no frame >100 ms in acceptance run |
| Load crash rate | ≤1% |

After every material update, report the single largest funnel drop-off. The next
iteration addresses that point unless a crash, data-loss, or compliance blocker
takes priority.

### 14.3 Hypothesis register

| ID | Hypothesis | Test and pass condition | Required response if it fails |
|---|---|---|---|
| H1 | The first chain creates agency, not passive spectacle | 4/5 cold players complete it, explain the causal chain, and say their action caused the rescue | Reduce simultaneous materials or change the command/consequence; do not add tutorial prose |
| H2 | A real decision exists by 90 seconds | 4/5 predict a Site 2 pour consequence before it resolves | Reauthor Site 2 with more visibly distinct valid regions before any meta work |
| H3 | Site 3 supplies meaningful consequence | 4/5 identify the destructive-versus-lossless trade-off; both routes meet quota | Change geometry, costs, or mastery feedback until neither route is decorative or dominant |
| H4 | Landscape-only mobile preserves conversion | Real 800×450/844×390 touch tests pass; Basic one-minute conversion reaches ≥80% | Improve host handoff/framing first; if conversion remains materially worse by device, reconsider mobile scope with evidence |
| H5 | The core survives without rewards | In a no-meta test build, 4/5 choose to start Site 3 and at least 3/5 voluntarily replay a Site for a better rescue | Rework route choices and feedback; do not compensate with larger rewards |
| H6 | An Expedition is a satisfying portal-sized unit | Median first Expedition is 4–6 min and ≥65% complete it | Crop/rebuild Sites or remove a beat; do not merely increase fast-forward |
| H7 | Three return hooks create open loops without clutter | 4/5 can name one unfinished Workshop/Atlas/Daily goal after the result; D1 reaches 10–15% target band | Simplify presentation and strengthen the best-aligned hook before increasing rewards |
| H8 | The economy rewards play more than absence | Validator passes every defined path; four-hour return stays below a minimum Expedition | Retune yields/costs or remove accrual upgrades; never gate campaign play |
| H9 | The visual promise works on the portal grid | 4/5 identify guide/rescue plus interactive terrain at 200 px; candidate remains distinct on a captured live grid | Change composition/title before producing the full media set |
| H10 | The production architecture fits low-tier devices | Acceptance run sustains ≥30 fps with no >100 ms frame and deterministic replay equivalence | Profile and simplify sim/render transfer; do not migrate all content until the spike passes |

### 14.4 Kill and pivot criteria

The following prevent sunk-cost production from disguising a weak product:

1. **Stop return-system production** if H1 or H2 fails after two materially
   different Site 1/2 revisions. Simplify the chain or interaction before doing
   Workshop, Daily, or monetisation work.
2. **Stop content expansion** if the no-meta vertical slice fails H5. More Sites
   will not repair an uninteresting repeated decision.
3. **Reduce visual and simulation density** if the required 800×450/DPR 1 scene
   cannot keep crew, editable targets, hazards, and the exit legible. Do not
   solve this with pinch zoom or persistent labels.
4. **Pause the Worker migration** if the bounded spike cannot preserve replay
   equivalence or transfer within frame budget. Profile a simpler main-thread or
   split-step architecture before committing the whole campaign.
5. **Do not submit Basic Launch** without a cleared public identity, complete
   media set, continuous-save migration, analytics decision, and real app/webview
   evidence.
6. **Do not add monetisation to compensate for weak engagement.** If Basic
   conversion, playtime, or D1 miss their gates, address the largest funnel
   drop-off first.

## 15. Covers, previews, and visual promise

The current splash is attractive at full size but fails the new critical path,
uses an unsafe title, and reduces the distinctive mechanic to small background
detail. It is not the launch cover.

The cover system must work at roughly 200 px:

- one large original salvage-crew silhouette;
- a bright gold sand stream meeting blue water;
- one timber platform visibly lifting into a cyan route;
- a small swarm already crossing toward the exit;
- one short, cleared public title in a readable custom wordmark.

Create mandatory landscape, portrait, and square covers from the same composition.
Preview videos are silent, 15–20 seconds, landscape 16:9 and portrait 2:3. They
open on the static cover frame, then show only real Level 1/2 material reactions.
The portrait preview may use a deliberate crop/recomposition of actual gameplay;
it must not imply that the shipped game is portrait-playable.

Thumbnail acceptance:

1. At 200 px, five cold viewers identify “guide little people/change terrain.”
2. At least four identify water/timber/sand as interactive, not background art.
3. The cover remains distinct in a captured live CrazyGames puzzle/mobile grid.

Identity acceptance begins before full media production. At Gate C, shortlist
three original public-name candidates, including `Swarmwright` only if it still
earns its place. Check pronunciation, one-exposure recall, search/category
confusion, trademark/domain risk, wordmark readability at 200 px, and whether a
cold player expects a rescue/terrain game rather than a factory idle game. Human
rights clearance remains mandatory; a preference poll is not clearance.

## 16. Official platform validation matrix

| Official item | Product decision | Evidence needed |
|---|---|---|
| Relative paths | Required | Compiled subpath request scan |
| ≤20 MB initial for mobile homepage | Use stricter ≤1.5 MB critical target | Network capture to first `gameplayStart` |
| Chrome/Edge; touch for mobile | Required; also test Safari/app webviews | Real-device matrix |
| Landscape orientation configurable | Declare landscape; remove custom rotate modal | Hosted Preview + app checks |
| Safe-area support in app | Required | Notch/Dynamic Island captures |
| DPR 1 readability | Required | 800×450 and listed desktop viewports |
| Consistent high-refresh physics | Fixed tick retained | 60/90/120/144/165 Hz equivalence |
| Immediate gameplay or ≤1 click | Zero pre-game clicks | Cold first-load recording |
| In-game, visual, focused onboarding | One cue/verb at a time | Five-player comprehension test |
| PEGI 12 audience | Remove graphic blood; review fire/death feedback | Content review |
| Host fullscreen only | No custom fullscreen button | Player marker scan |
| SDK start/stop and host mute | Adapter contract above | Event trace in local SDK + Preview |
| Ads disabled during Basic Launch | No ad UI | Basic-environment trace |
| Midgame ads only at natural breaks | Expedition results only | Ad lifecycle tests |
| Three covers + two silent previews | Required before submission | Portal media checklist |
| Original name/assets | Replace public title and clear provenance | Human rights/brand gate |

## 17. Delivery sequence

### Gate A — first 90-second product proof

- Direct live Level 1 boot with no title/start/briefing.
- Safe, large first crew target and one visual cue.
- Real chain reaction and first rescue inside targets.
- Site 2 agency slice through a predicted, visibly consequential pour.
- 907×510 desktop and true 800×450 touch framing.
- H1/H2 five-player cold comprehension and agency evidence.

Stop if this is not compelling. Do not build retention around an unclear core.

### Gate B — delivery/performance foundation

- Critical-path split and asset variants under 1.5 MB.
- Worker spike with deterministic equivalence.
- Low-tier presentation and automatic step-down.
- WebGL loss/fallback, lifecycle, storage migration, and SDK adapter.

### Gate C — first Expedition and continuous progression

- Reauthored Sites 1–3, instant save, rapid retry, result/Next flow.
- Site 3 destructive/lossless choice.
- Equal-price Workshop first choice and Material Atlas first entry.
- No-meta replay test and first economy-validator pass.
- Three-name identity shortlist and 200 px mechanic-comprehension test.
- End-to-end funnel instrumentation decision resolved.

### Gate D — return-system vertical slice

- Two-to-four-hour Workshop accrual with visual state change.
- One complete seven-base/three-variant Daily authoring and solver pipeline.
- First four Atlas entries and on-demand Test Yard path.
- Final economy-validator pass over all defined player paths.
- Verify these improve return intent without delaying the core loop.

### Gate E — Basic Launch candidate

- Reauthor Sites 4–10 into two Expeditions plus finale.
- Complete six Workshop projects, 12–16 Atlas entries, and 21 certified Daily
  configurations.
- Full solvability, interaction, low-tier, muted, and landscape-device coverage.
- Cleared public identity; landscape, portrait, and square covers; both silent
  previews; content update plan based on observed level churn.
- Hosted Preview, Android app, and iOS app evidence.
- No ad affordances.

### Gate F — Basic Launch evidence and revision

- Evaluate the full funnel, conversion, playtime, D1, device split, Site churn,
  return-hook use, and qualitative confusion.
- Fix the single largest drop-off after every material update.
- Do not expand content or add ads while H1–H10 have an unresolved blocker.

### Gate G — Full Launch monetisation and expansion

- Rewarded placements, later-session Expedition interstitial request, SDK trace.
- Expand to 28+ certified Daily configurations only if Daily use justifies it.
- Reconfirm provenance, PEGI, media, Android/iOS app behavior, and Basic Launch
  evidence after monetisation changes.

## 18. Non-goals for the CrazyGames launch

- Portrait gameplay.
- Multiplayer, accounts, chat, social graph, or external game backend.
- IAP, battle pass, energy, lives, punitive streak reset, or mandatory login.
- Procedurally generated unsolved puzzles.
- Full chemistry set, rigid chunks, WebGPU dependency, or 3D conversion.
- A campaign level editor for players.
- Shipping all prototype mechanics because they already exist.

## 19. Official sources checked 2026-08-20

- [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- [Quality guidelines](https://docs.crazygames.com/requirements/quality/)
- [Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- [CrazyGames App and safe areas](https://docs.crazygames.com/resources/crazygames-app/)
- [SDK introduction](https://docs.crazygames.com/sdk/intro/)
- [Game lifecycle and host settings](https://docs.crazygames.com/sdk/game/)
- [Advertisement requirements](https://docs.crazygames.com/requirements/ads/)
- [Puzzle monetisation guidance](https://docs.crazygames.com/resources/monetizing-puzzle/)
- [Automatic progress save](https://docs.crazygames.com/other/aps/)
- [Game covers and preview videos](https://docs.crazygames.com/requirements/game-covers/)

Landscape-mobile viability is demonstrated by current first-party catalogue
entries including [Smash Karts](https://www.crazygames.com/game/smash-karts) and
[Bloxd.io](https://www.crazygames.com/game/bloxdhop-io), both listed as landscape
mobile/tablet games. Bloxd.io also appears at the head of CrazyGames’ current
popular-mobile list. These examples establish viability, not guaranteed product
performance.
