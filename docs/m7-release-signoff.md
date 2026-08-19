# M7 release sign-off

This packet closes only the release gates that cannot be proved by the local
Chromium/WebKit proxy gauntlet. Do not mark the build release-cleared until every
required row below has a named human reviewer, date, result, and evidence link.

Current technical proof candidate:

- Artifact: 8 files / 4,856,906 uncompressed bytes
- SHA-256: `71cd55251c9679854e0b69849e85e7dadd323798d9d712dc854da1c24a11eb96`
- Tests: 203 in 27 files, including ten scripted campaign solutions
- Raw soak: `output/playwright/m7-final-600s-soak-raw.json`
- Consolidated proof: `output/playwright/m7-technical-release-evidence.json`
- Status: pre-merge, dirty, proof-only, not release-cleared

## 1. Real Safari hardware

Record the exact model, OS version, Safari version, available storage, battery
state, Low Power Mode state, and whether the device began cool. Screen recording
is preferred for touch journeys; attach Web Inspector screenshots/logs when
available. A simulator, device emulation, or desktop WebKit run does not satisfy
this gate.

| Device lane | Required journey | Pass criteria | Reviewer / date / evidence |
|---|---|---|---|
| Current iPhone, landscape | Cold load → title → Start → Level 1 planning/running | No crash/reload; title and route fit; crew remain above the dock; all visible targets are reachable | **OPEN** |
| Current iPhone, landscape | Select a crowded crew member by body and role-gear edge at 1.2×; assign Basher | The visibly tapped crew owns the hover/selection and receives the role; no adjacent-ID swap | **OPEN** |
| Current iPhone, landscape | Level 4 minimap hold/drag/release, then wait through grace and trigger an escape/death focus | Camera never fights while held; release position persists through grace; only the explicit event may later move it | **OPEN** |
| Current iPhone, portrait ↔ landscape | Rotate at title and during play; Resume; use hardware/software keyboard if available | Rotate and Resume surfaces exclusively own focus; hidden controls cannot activate; prior focus returns | **OPEN** |
| Current iPhone, landscape | Level 10 at 3× for 10 minutes with eight restarts | No crash, reload, black canvas, lost audio controls, stuck input, or sustained thermal collapse; record FPS/timeline if available | **OPEN** |
| Current iPad, portrait ↔ landscape | Repeat title/rotate/Resume and Level 4 minimap journey | Mobile capability remains selected despite desktop-style UA; only portrait is gated; landscape controls/camera remain correct | **OPEN** |
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
| `title-splash` | Generated-output terms, commercial use, originality, reference-only boundary | **OPEN** |
| `crew-salvager` | Generated-output terms, commercial use, clean-room identity | **OPEN** |
| `crew-salvager-actions` | Generated source family, transformation chain, commercial use, clean-room identity | **OPEN** |
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

After approval, update each record's `approvalState`, reviewer, review date, and
evidence. `node scripts/verify-crazygames-build.mjs --release` must then pass;
editing the aggregate `releaseClaim` without resolving every record is invalid.

## 3. Public identity review

The working name and logo are not cleared by clean-room source code or generated
art provenance. A qualified human reviewer must assess the proposed public name
`Lemmings X`, logo treatment, store metadata, and likely confusion with existing
game brands in every intended market.

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
4. Run `npm run test:run`, `npm run validate:crew-atlas`,
   `node scripts/verify-crazygames-build.mjs --release`, and `git diff --check`.
5. Record the commit SHA, exact artifact file count/bytes/SHA-256, and deployment
   URL below. The pre-merge proof hash above cannot stand in for this result.
6. Smoke the deployed root/iframe or portal URL on the signed iPhone and iPad:
   title → Start → Level 1, Level 4 minimap, Level 9 crowd, Level 10 3×.
7. Confirm no missing/subpath assets, external requests, console/page errors,
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
