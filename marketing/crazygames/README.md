# Swarmwright CrazyGames submission media

These files are submission media and are deliberately outside `public/`, so
none of them enter the game's critical download.

## Covers

Run `npm run build:covers` to render the approved masters with exact title
typography and mandatory output dimensions:

- landscape: 1920×1080
- portrait: 800×1200
- square: 800×800

The source masters were generated with the built-in OpenAI image-generation
tool on 2026-08-18. The actual first-run gameplay captures were supplied as
visual references. Exact prompts and built-in output identifiers are retained
in `source/prompts.md`. Portrait and square masters were recomposed from the
approved landscape identity rather than stretched or letterboxed.

The `Swarmwright` title remains a working title until a human completes name
and trademark clearance. The covers contain no text besides that title, in
line with CrazyGames' cover restrictions.

## Preview clips

The preview deliverables must remain honest gameplay, silent, 15–20 seconds,
and begin on the matching static cover. Required targets:

- landscape: 1920×1080, 16:9
- portrait: 1080×1620, 2:3

Capture from a fresh production build served on the default local preview port:

```sh
npm run build
npx vite preview --host 127.0.0.1 --port 5178
npm run capture:previews
npm run validate:submission-media
```

Set `SWARMWRIGHT_PREVIEW_URL` when using another origin. The portrait clip
keeps the real landscape game frame intact over a full-bleed branded field; it
does not stretch, crop, or invent gameplay.

Do not put these media files in the runtime bundle.
