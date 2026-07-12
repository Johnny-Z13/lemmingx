# Campaign Level Design Review and Solvability Test Plan

**Date:** 2026-07-12
**Status:** Active playtest baseline

## Design review

The ten-level campaign should alternate spatial shape, terrain material, primary
skill, and pressure source. Water is used in five levels, but with a different
purpose each time; the dry levels preserve contrast and keep every stage from
becoming a swimming puzzle.

| # | Level | Layout and lesson | Water role | Canonical automated route |
|---|-------|-------------------|------------|---------------------------|
| 1 | First Steps | Compact, single wall; basic carving | Dry tutorial for maximum readability | Bash the wall |
| 2 | The Deep End | Locked Swimmer loadout; two banks and a 90px-deep pool | Mandatory deep crossing; non-swimmers tread without progressing | Give every rescue Swimmer |
| 3 | Hold the Line | Thin wall on a flat arena; blocker/bomber and sand | Dry so the sand ramp is visually distinct | Blocker-bomber breach |
| 4 | The Long March | Wide scrolling trek with three spaced walls | Broad ankle-deep marsh; teaches safe wading without adding another hard gate | Bash all three walls |
| 5 | Steel Yourself | Layered slab, steel cap, lower gallery, sand spout | Dry underground contrast; steel and falling sand remain the focus | Dig west of the steel cap |
| 6 | Trap House | Horizontal trap corridor with a lower industrial layer | A finite water spout visibly fills the settling tank beneath a safe steel catwalk | Tight mob rush |
| 7 | Trial by Fire | Locked Fire loadout; two steel arches with timber chokes | Protected quencher tank below the exit catwalk contrasts with—but cannot extinguish—the chokes | Burn both timber obstacles during planning |
| 8 | Down and Out | Tall mountain and basement gallery | Dry vertical excavation; water would dilute the miner lesson | Mine diagonally into the gallery |
| 9 | The Gauntlet | Locked Floater/Climber loadout; two fatal drops, steel tower, final trap | Dry deliberately: water would cancel the floater lesson | Apply both traits to every rescue |
| 10 | Sandworld Symphony | Wide and tall finale combining traps, walls, chasm, steel, basement, and emitter | Deep finale chasm plus player-authored water | Bash, build, bash, then dig |

### Review conclusions

- Levels 4 and 6 were the weakest silhouettes because both were long, flat
  floors. The marsh and recessed reservoir add depth without changing their
  primary lessons or requiring extra skills.
- Level 6's protected industrial tank fills from a finite spout over roughly
  20 seconds. The catwalk keeps the trap route stable while the lower layer
  visibly changes.
- Levels 2, 7, and 9 are explicit challenge loadouts. The roster preserves their
  `openToolbox: false`, preventing generic terrain tools from bypassing the lesson.
- Level 7 advertises combustion immediately: fire is the only supplied terrain
  tool, steel protects the lock, and its two charges match the two timber obstacles.
- Levels 1, 3, 5, 8, and 9 stay dry on purpose. This gives water visual impact
  when it appears and protects the bash, sand, steel, miner, and floater lessons.
- Campaign routes remain deterministic. Every authored water body uses the
  seeded cellular automaton and is either contained or shallow enough not to
  change the canonical route.

## Automated solvability plan

The suite is a deterministic simulation test, not a screenshot or coordinate
macro. It runs the same headless `GameSimulation` used by the game, applies a
known player strategy, and requires the real quota to be reached before time
expires.

### Layer 1: roster and structural guards

For every campaign factory:

1. Build a fresh level and verify the campaign count.
2. Require an objective and hint; require locked loadouts exactly on Levels 2,
   7, and 9, with the open toolbox on the other seven stages.
3. Check spawn and exit rectangles are inside the world.
4. Check `0 < targetSaved <= totalLemmings`.
5. Require one registered canonical solution for every level index and verify
   the registered name still matches the factory name.
6. Require at least five levels to contain a substantial authored water body
   (50 or more material cells), including Levels 2, 4, 6, 7, and 10.

### Layer 2: canonical completion guards

`test/levels.test.ts` advances each level at a fixed 16 ms step with its fixed
CA seed. Each canonical strategy must:

- produce `outcome === 'won'`;
- save at least `targetSaved` lemmings;
- finish with time remaining;
- complete within the suite's bounded step budget.

Adding Level 11 without registering its canonical route makes the coverage
guard fail, even if the developer forgets to add a standalone test.

### Layer 3: alternate-route guards

Keep extra tests where a level's identity depends on genuine solution variety:

- Level 3: sand-ramp solution wins without sacrificing a bomber.
- Level 6: burying the crusher reduces trap losses versus the bare mob rush.
- Level 2: a no-skill control cannot meet quota; every canonical rescue is a Swimmer.
- Level 7: a no-fire control saves nobody; the canonical setup consumes both charges.
- Level 9: a no-skill control loses the whole crew at the sheer drop; every
  canonical rescue carries both Floater and Climber.

### Layer 4: mechanic contract tests

The campaign guards answer "can this level be won?" Lower-level suites explain
why a regression happened:

- `test/water.test.ts`: wade, tread, swim, fall breaking, rescue, and burial.
- `test/ca.test.ts`: seeded sand/water/wood movement and hatch-queue behavior.
- `test/simulation.test.ts`: skills, traps, exits, timing, and outcomes.
- `test/progress.test.ts`: temporary all-level playtest access and the preserved
  sequential progression rule with the override disabled.

## Run and failure policy

Run `npm test` after any level geometry, material, skill, CA, trap, or timing
change. Run `npm run build` before handoff.

When a canonical route fails, report the first broken decision point (for
example, "Level 4 lead walker turned at the marsh bank") rather than increasing
the timeout or lowering the quota. Change the scripted coordinates only when
the new player route is intentional; otherwise fix the simulation or geometry.

## Known gap and next test

The locked-loadout tests prove mechanical necessity and headless completion,
but they do not measure whether the planning instructions are understood by a
first-time player. The next layer should record playtest failures at the first
decision point: unassigned swimmer, early hatch before the fire clears, or a
missing second trait before the Gauntlet drop.
