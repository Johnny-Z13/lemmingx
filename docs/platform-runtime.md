# Swarmwright portal runtime

Checked against official Poki and CrazyGames documentation on 2026-08-20.

## Product contract

- One relative-path Vite artifact serves direct/Vercel, Poki, and CrazyGames.
- Direct and unknown embedded launches fail closed to the no-op adapter and make
  no portal SDK or ad request.
- Known portal origins select exactly one SDK. `?portal=poki|crazygames` exists
  only so compiled local/hosted verification can emulate a portal iframe.
- The playable frame completes the portal loading lifecycle. Poki's first
  `gameplayStart` additionally waits for a pointer or keyboard interaction;
  duplicate start/stop events are suppressed by each adapter.
- Pause, menus, level results, and ads stop gameplay reporting. CrazyGames focus
  changes remain owned by the host, as its documentation requires.
- Ads stay optional, use natural result/continuation breaks, mute the game while
  an ad is actually shown, and never gate the standard route.

## Shared fit

- The game is native 16:9, responsive, touch-capable, safe-area padded,
  muted-safe, and direct-to-play with no splash screen or outgoing links.
- The player build contains no development tools or source maps. Deferred
  Expeditions keep the initial artifact comfortably below both portals' mobile
  budgets; `npm run verify:portals` applies Poki's stricter 8 MB target to the
  whole package.
- Progress writes are guarded against unavailable localStorage. Poki can mirror
  the compact save automatically through its cloud-gamesave support; the save is
  far below the documented 1 MB compressed ceiling.
- Navigation keys, wheel gestures, overscroll, selection, and touch callouts are
  contained inside the game frame without breaking native form controls.

## Verification

- `npm run verify:portals` checks a root `index.html`, relative asset paths,
  clean player markers, no source maps, provenance, and the 8 MB package cap.
- `npm run verify:crazygames:sdk` exercises SDK init, loading, mute, first
  gameplay, pause/resume, and the no-ad first session.
- `npm run verify:poki:sdk` exercises SDK init, loading completion, the strict
  first-input gameplay boundary, pause/resume, device reporting, and the no-ad
  first session.
- `npm run verify:crazygames:browser` remains the broader compiled desktop,
  mobile, touch, storage-denied, subpath, and orientation suite; its direct-launch
  lane rejects requests to either portal SDK.

## External gates

- Portal uploads, terms acceptance, Web Fit/Basic Launch traffic, and real-device
  portal-app behavior are external evidence, not local pass claims.
- CrazyGames media is staged under `marketing/crazygames/`. Poki still needs a
  dedicated text-free, full-bleed square static thumbnail (at least 628×628) and
  an approved animated thumbnail. The current titled square cover should not be
  submitted unchanged.
- `Swarmwright` remains a working public title until human name/trademark review.

## Primary sources

- [Poki HTML5 SDK](https://sdk.poki.com/html5.html)
- [Poki requirements](https://sdk.poki.com/new-requirements.html)
- [Poki Web Fit Test](https://sdk.poki.com/web-fit-test.html)
- [Poki game thumbnails](https://sdk.poki.com/game-thumbnail.html)
- [CrazyGames SDK game lifecycle](https://docs.crazygames.com/sdk/game/)
- [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical/)
- [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- [CrazyGames web/app origins](https://docs.crazygames.com/resources/html5/sitelock/)
