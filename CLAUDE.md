# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — lint + typecheck + build (run before considering work done)

No test runner configured. No single-file lint/typecheck shortcuts beyond the scripts above.

## Architecture

This is a Next.js 16 (App Router) template whose primary purpose is being driven by the `/clone-website <url1> [<url2> ...]` skill (`.claude/skills/clone-website/SKILL.md`) to reverse-engineer arbitrary websites into this codebase. Read that file before touching anything under `docs/`, `public/sites/`, or `src/components/sites/` — it defines the naming/isolation contract below.

**Per-target namespacing.** Every cloned URL gets a `<site-key>` (origin slug) and `<page-key>` (pathname slug, `root` for `/`) — a SHA-256 hash suffix is appended only if a slug collides with an existing one — and every artifact for that target lives under the matching namespaced path:
- `docs/research/<site-key>/<page-key>/` — extracted design tokens, component inventory, layout/interaction notes (see `docs/research/INSPECTION_GUIDE.md` for what belongs in each doc)
- `docs/design-references/<site-key>/<page-key>/` — screenshots
- `src/components/sites/<site-key>/<page-key>/` — page-specific components; genuinely shared same-site components go in `src/components/sites/<site-key>/shared/`
- `public/sites/<site-key>/<page-key>/` — downloaded assets, with a matching `scripts/download-assets-<site-key>-<page-key>.mjs` downloader; shared assets go in `public/sites/<site-key>/shared/`
- A route file under `src/app/` mirroring the original pathname (the initial template scaffold at `src/app/page.tsx` may be replaced by the first clone only)

Never write one target's output into another target's namespace, and never delete/replace an existing non-scaffold route or namespace without explicit approval — this template is expected to accumulate multiple independently-cloned sites over time.

**Multi-agent cloning.** The clone-website skill works as extraction-and-construction-in-parallel: it inspects a page section, writes a spec file, then hands it to a builder subagent — never a single monolithic "build the whole page" pass. When orchestrating agent teams for this work, each teammate operates in its own git worktree branch and gets merged back at the end (see the "MOST IMPORTANT NOTES" in `AGENTS.md`).

**shadcn/ui setup:** style `base-nova`, base color `neutral`, CSS variables enabled, icon library `lucide`, no Tailwind prefix. Config is `components.json`.

## Cloned site: worawork (currently mounted at `/`)

Full research notes: `docs/research/worawork/root/NOTES.md`. Read it before touching this site's code — it documents deferred/known gaps that look like bugs but are deliberate (ponytail-flagged) simplifications.

This is not a DOM/CSS page clone. The original is a `@react-three/fiber` WebGL "Animal Crossing"-style village game; portfolio content (bio/experience/arts) only appears in DOM overlay panels triggered by walking the character to a sensor and pressing E. Entry point `WoraWorkApp.tsx` composes:
- `Scene.tsx` — the R3F `Canvas`; owns zoom (mouse wheel) and stays `pointer-events: none` until `started` so the WebGL canvas can't eat the "Let's go" tap.
- `Village.tsx` — loads `Models.glb` (one flat 106-node scene containing both exterior and interior; interior geometry is offset +200 on Y, so "entering the house" is a teleport, not a visibility toggle), reports sensor/ground meshes up via callbacks.
- `Player.tsx` — WASD/arrow movement (world-space axes, camera never rotates), Shift to run, E to interact when inside a named `_Sensor` mesh's XZ footprint; collision is a bounding-box clamp against the map rect, not per-mesh physics (the original uses rapier3d — real collision is a deferred gap).
- `Duck.tsx`, `AudioManager.tsx`, `InteractionOverlay.tsx`, `ui/*` (HUD, panels, touch controls) — secondary scene actor, sound, and DOM overlay layers.
- `store.ts` (zustand) — single source of truth for game state (`started`, `inside`, `currentTouchingObject`, panel-open flags); components read/write this instead of prop-drilling across the Canvas/DOM boundary.
- `assetPaths.ts` — every downloaded asset path, rooted at `/sites/worawork/root`; `data/content.ts` — the real bio/experience/arts content extracted verbatim from the site.

If asked to extend this site, follow its existing interaction model (sensor + E-to-interact, not click handlers) rather than the DOM click/scroll heuristics that apply to typical marketing-page clones.

