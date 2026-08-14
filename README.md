<div align="center">

# portfolio-clone

### A pixel/behavior-faithful clone of [worawork.vercel.app](https://worawork.vercel.app), rebuilt in Next.js

An explorable, "Animal Crossing"-style 3D village — walk your character around with WASD, press **E** at objects to open the portfolio content behind them.

Built on the [AI Website Cloner Template](https://github.com/JCodesMore/ai-website-cloner-template) via its `/clone-website` skill.

</div>

---

## What's actually here

This isn't a DOM/CSS marketing-page clone — the original site is a `@react-three/fiber` WebGL game, and so is this. The portfolio owner's bio, work experience, and art projects only appear in DOM overlay panels, triggered by walking the character to a sensor and pressing **E** (or tapping the on-screen **A** button on mobile).

| Control          | Action                                       |
| ----------------- | --------------------------------------------- |
| `WASD` / arrows    | Move (world-space axes, camera never rotates) |
| `Shift` (hold)     | Run — also kicks in automatically after ~1s of continuous movement |
| `E`                | Interact with whatever sensor you're standing in (sit, open panels, toggle lights, check mail) |
| Mouse wheel        | Zoom                                          |
| Touch (mobile)     | On-screen joystick + A/B buttons              |

Full reverse-engineering notes — what's faithfully rebuilt vs. simplified — live in [`docs/research/worawork/root/NOTES.md`](docs/research/worawork/root/NOTES.md).

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 16** — App Router, React 19, TypeScript strict
- **@react-three/fiber** + **drei** — the WebGL village scene, character, camera
- **zustand** — game state (started/inside/touching-sensor/panel-open flags)
- **shadcn/ui** + **Tailwind CSS v4** — the DOM overlay panels (bio, experience, arts, contact)

## Project Structure

Everything for the cloned site is namespaced under a `<site-key>/<page-key>` pair so this template can accumulate more clones later without collisions:

```
src/app/page.tsx                                   # mounts WoraWorkApp at "/"
src/components/sites/worawork/root/
  WoraWorkApp.tsx      # composes the pieces below
  Scene.tsx            # R3F Canvas, zoom, pointer-events gating
  Village.tsx           # loads Models.glb (village + house interior), sensor/ground meshes
  Player.tsx            # movement, collision, run/idle/sit animations, camera follow
  Duck.tsx, AudioManager.tsx, InteractionOverlay.tsx
  store.ts              # zustand store — single source of truth for game state
  ui/                   # HUD, portfolio/contact/controls panels, touch controls
  data/content.ts        # bio/experience/arts content extracted verbatim from the original
docs/research/worawork/root/NOTES.md   # research + known gaps
docs/design-references/worawork/root/  # reference screenshots
public/sites/worawork/root/           # downloaded models/textures/audio
scripts/download-assets-worawork-root.mjs
```

## Commands

```bash
npm run dev        # Start dev server
npm run build       # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
npm run check         # lint + typecheck + build
```

## Cloning another site into this repo

This repo still carries the full `/clone-website` skill from its template, so another site can be added alongside this one without touching its files — see [`AGENTS.md`](AGENTS.md) and [`.claude/skills/clone-website/SKILL.md`](.claude/skills/clone-website/SKILL.md) for the naming/isolation contract.

```
/clone-website <target-url>
```

## Attribution

Design, layout, and portfolio content belong to [worawork.vercel.app](https://worawork.vercel.app)'s original owner — this repo is a rebuild for educational/portfolio-migration purposes, not a claim of authorship over that content. The MIT license below covers this repository's own code (the Next.js scaffolding and clone tooling), not the cloned design/content.

## License

MIT
