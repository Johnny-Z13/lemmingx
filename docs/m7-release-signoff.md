# M7 release sign-off

This packet closes only the release gates that cannot be proved by the local
Chromium/WebKit proxy gauntlet. Do not mark the build release-cleared until every
required row below has a named human reviewer, date, result, and evidence link.

Current technical proof candidate:

- Artifact: 30 files / 2,070,107 uncompressed bytes
- SHA-256: `53ef69e7b31b16d77edb988b73450bac8799ce9ed7404ab4ba769ecd01c1107d`
- Tests: 273 in 38 files, including all campaign and Daily solvability guards
- Build contract: one relative-path artifact for direct/Vercel, Poki, and
  CrazyGames; runtime host selection loads at most one portal SDK
- Portal verifier: PASS; 15 shipped/submission provenance records unresolved
- Fresh compiled audit: `crazygames/2026-08-20-adversarial-review.md`
- Historical soak evidence: `output/playwright/m7-final-600s-soak-raw.json`
- Status: internally green proof, not release-cleared or market-validated

## 1. Real Safari hardware

Record the exact model, OS version, Safari version, available storage, battery
state, Low Power Mode state, and whether the device began cool. Screen recording
is preferred for touch journeys; attach Web Inspector screenshots/logs when
available. A simulator, device emulation, or desktop WebKit run does not satisfy
this gate.

| Device lane | Required journey | Pass criteria | Reviewer / date / evidence |
|---|---|---|---|
| Current iPhone, Vercel landscape | Cold load → live Site 1 → first marked crew command → Site 1 result | No crash/reload; no pre-game screen; target, route, result, and controls fit inside the safe area | **OPEN** |
| Current iPhone, CrazyGames/Poki landscape | Repeat first Site in each hosted webview | Host orientation UI does not compete with the game; exactly one correct SDK loads; first input and lifecycle remain responsive | **OPEN** |
| Current iPhone, landscape | Select a crowded crew member by body and role-gear edge at 1.2×; assign Basher | The visibly tapped crew owns the hover/selection and receives the role; no adjacent-ID swap | **OPEN** |
| Current iPhone, landscape | Level 4 minimap hold/drag/release, then wait through grace and trigger an escape/death focus | Camera never fights while held; release position persists through grace; only the explicit event may later move it | **OPEN** |
| Current iPhone, portrait ↔ landscape | Rotate during Vercel play, then repeat in each hosted portal | Vercel uses only the game gate; portals use only the host gate; Resume/input ownership and prior focus remain correct | **OPEN** |
| Current iPhone, landscape | Level 10 at 3× for 10 minutes with eight restarts | No crash, reload, black canvas, lost audio controls, stuck input, or sustained thermal collapse; record FPS/timeline if available | **OPEN** |
| Current iPad, portrait ↔ landscape | Repeat cold-load/rotate/Resume and Level 4 minimap journey on Vercel and hosted portals | Mobile capability remains selected despite desktop-style UA; only the correct owner gates portrait; landscape controls/camera remain correct | **OPEN** |
| Current iPad, landscape | Level 9 crowd + Level 10 3× for 10 minutes | Crew/roles stay readable and selectable; no crash/reload/context loss; no monotonic memory climb in Web Inspector if measured | **OPEN** |

For each soak, report the warm-up duration, start/end temperature impression,
visible throttling, browser reload/crash, and any console/page/WebGL errors.
Safari memory samples are supporting trend evidence only; absence of a precise
number is not a reason to claim a leak-free result.

## 2. Originality and commercial-rights review

Review the exact paths, hashes, prompts, model/date/terms, transformation commands,
authorship notes, and dependency licences in
`docs/assets/crazygames-provenance.json`. A reviewer must either set the record to
`release-cleared` with evidence or reject/replace the asset. Do not mass-approve
records merely because the proof build is technically green.

| Provenance record | Required decision | Reviewer / date / evidence |
|---|---|---|
| `crew-keyart-actions` | Generated-output terms, commercial use, clean-room identity, transformation chain | **OPEN** |
| `terrain-tool-icons-v1` | Generated-output terms, commercial use, clean-room identity, transformation chain | **OPEN** |
| `presentation-slice-renderers` | Repository authorship and originality | **OPEN** |
| `industrial-cavern-backdrop` | Generated-output terms, commercial use, originality | **OPEN** |
| `procedural-crew-renderer` | Repository authorship and originality | **OPEN** |
| `procedural-terrain-renderer` | Repository authorship and originality | **OPEN** |
| `procedural-world-backdrop` | Repository authorship and originality | **OPEN** |
| `procedural-world-lights` | Repository authorship and originality | **OPEN** |
| `procedural-particles` | Repository authorship and originality | **OPEN** |
| `visual-theme-and-identity` | Repository authorship, originality, clean-room presentation | **OPEN** |
| `procedural-sfx` | Repository authorship, listening review, originality | **OPEN** |
| `procedural-music` | Repository authorship, listening review, originality | **OPEN** |
| `lucide-ui-icons` | Dependency licence/notice and distribution compliance | **OPEN** |
| `swarmwright-crazygames-covers` | Generated-output terms, public-name dependency, honest composition | **OPEN** |
| `swarmwright-crazygames-previews` | Real-gameplay accuracy, public-name dependency, submission compliance | **OPEN** |

After approval, update each record's `approvalState`, reviewer, review date, and
evidence. `node scripts/verify-crazygames-build.mjs --release` must then pass;
editing the aggregate `releaseClaim` without resolving every record is invalid.

## 3. Public identity review

The working name and logo are not cleared by clean-room source code or generated
art provenance. A qualified human reviewer must assess the proposed public name
`Swarmwright`, logo treatment, store metadata, and likely confusion with existing
game brands in every intended market. `LemmingX` remains repository history only
and must not return to public presentation.

| Decision | Reviewer / date / evidence |
|---|---|
| Public name approved, or replacement name supplied | **OPEN** |
| Logo/title treatment approved, or replacement supplied | **OPEN** |
| Store description/screenshots reviewed for confusing affiliation claims | **OPEN** |

## 4. Commit, deploy, and final candidate binding

Run only after the user authorizes the milestone commit and push.

1. Commit the complete intended scope with no unrelated user changes.
2. Confirm `git status --short` is empty and `main` contains the milestone.
3. Rebuild the canonical artifact from that clean commit with `npm run build`.
4. Run `npm test`, `npm run validate:crew-atlas`,
   `npm run validate:terrain-icons`, `npm run verify:portals`, both SDK browser
   checks, the compiled browser journey, and `git diff --check`.
5. After every provenance row is cleared, require
   `node scripts/verify-crazygames-build.mjs --release` to pass.
6. Record the commit SHA, exact artifact file count/bytes/SHA-256, and deployment
   URL below. The pre-merge proof hash above cannot stand in for this result.
7. Smoke Vercel plus the uploaded portal previews on the signed iPhone and iPad:
   live Site 1, Level 4 minimap, Level 9 crowd, and Level 10 at 3×.
8. Confirm no missing/subpath assets, unexpected external requests,
   console/page errors,
   Sandbox control, prototype roster, or hidden diagnostic tooling.

| Final binding | Value |
|---|---|
| Commit SHA | **OPEN** |
| Clean worktree confirmed | **OPEN** |
| Artifact files / bytes / SHA-256 | **OPEN** |
| Deployment URL and deployment ID | **OPEN** |
| Deployed iPhone smoke | **OPEN** |
| Deployed iPad smoke | **OPEN** |
| Final release verifier | **OPEN** |

## Release decision

Release approver: **OPEN**

Decision date: **OPEN**

Decision: **NO-GO until every required field above is closed**
