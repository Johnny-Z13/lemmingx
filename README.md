# LemmingX

A clean-room browser prototype inspired by the classic Lemmings formula, built for remixing into a game jam direction.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Current Slice

- Phaser + TypeScript + Vite browser game.
- Deterministic simulation layer separate from rendering.
- Mutable terrain with digging and bridge-building.
- Walker, faller, blocker, builder, digger, exit, win/loss state.
- DOM HUD for skill stock, release-rate controls, restart, status, and the first original twist: `Pulse`, which reverses active workers on a cooldown.
- A first playable level modeled after the original `Just dig!` tutorial structure, with a visible hatch, exit, fall/death pit, and limited skill counts.
- Vitest coverage for terrain mutation and core simulation behaviors.

## Reference Note

The user-provided Lemmix repositories are used as behavioral references only. This prototype does not import their source code or original Lemmings assets.
