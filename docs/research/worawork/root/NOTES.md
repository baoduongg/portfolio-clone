# worawork.vercel.app — Research Notes

## What this site actually is

Not a DOM/CSS marketing page. It's a client-side Vite SPA built with
`@react-three/fiber` + `@dimforge/rapier3d` (physics) rendering a single
WebGL canvas: a WASD-controllable, isometric "Animal Crossing"-style village.
The real portfolio content (bio, experience, arts/projects) is plain React
DOM rendered inside overlay panels, triggered by walking the character to
specific objects and pressing E.

Stack fingerprint: `index-*.js`/`index-*.css` (Vite build), rapier wasm
bindings, `@react-three/*` JSX patterns visible in the minified bundle,
Formspree contact form (`https://formspree.io/f/xvgbzryw` — NOT reused in
the clone; contact form here is a local-only mock, see ContactPanel.tsx).

## Interaction model

Click/scroll/hover heuristics from the skill's usual playbook don't apply.
This is a first-person(ish) game loop:
- **Move**: WASD / arrow keys, world-space axes (not camera-relative — camera
  never rotates).
- **Run**: hold Shift.
- **Interact**: E, when standing inside a named sensor's XZ footprint.
- **Zoom**: mouse wheel scales camera distance.
- Camera: fixed-angle follow cam, offset above+behind player, smoothed via
  exponential damping.

## Asset manifest (all same-origin, downloaded into `public/sites/<site-key>/<page-key>/`)

- `Models/Player.glb` — Mixamo-rigged character. Animation clips: CheerGo,
  Dance_Wave, Greeting, Idle, Idle_Ball, Lookaround, Run, Run_Ball, Sit,
  Sleep, Throw, Walk, Walk_Ball.
- `Models/Duck.glb` — Duck_Idle, Duck_Pet, Duck_Walk.
- `Models/Models.glb` (9MB) — the entire village AND house interior in one
  flat 106-node scene, no hierarchy. Materials are fully baked
  (`baseColorFactor: [0,0,0,1]` + emissive texture = the texture IS the
  lighting), so no real-time shadows are needed or used.
  - **Interior geometry is offset +200 on the Y axis** from the exterior —
    both rooms live in the same file without overlapping. Entering the house
    means teleporting the player to `y≈200`, not just toggling visibility.
  - Every interactive prop has a same-named `_Sensor` mesh (invisible
    collision volume) plus often an `_Outline` (hover highlight, unused here)
    and `_TurnOn` (lit-state swap, unused here) mesh. Full sensor list
    captured via `node.name` regex in the bundle — see `Player.tsx`
    `TRACKED_SENSORS` for the ones actually wired up.
  - `WorldMap_Collision` / `Home_Interior_Collision` are the only true
    collision meshes; this clone clamps the player to their XZ bounding box
    (see "Known gaps" below — this is a simplification, not per-obstacle
    collision).
- `Textures/{circle,bubble}.webp`, `Fonts/Coiny-Regular.ttf`, `Icons/*.webp`,
  `Images/*.webp` (real project photos, 80+ files), `Sounds/*.mp3`
  (BGMusic, DayAmbient, footstep/UI SFX).
- HDR environment reused directly from drei's public asset CDN
  (`raw.githubusercontent.com/pmndrs/drei-assets`) — same URL the original
  site itself loads, not a third-party addition.

## Content extracted verbatim (see `data/content.ts`)

Bio (quick + full), 3 work experience entries + 2 education entries,
technical skills (3D/Engines/Code icon rows), and 11 art/project groups with
real Instagram/Foundation/fliphtml5 links and 60+ real project images.

## Known gaps / deferred (ponytail: flagged, not silently dropped)

- **Collision is a bounding-box clamp, not per-mesh physics.** The original
  uses rapier3d for real collision against fences/water/walls. This clone
  only stops the player at the outer map rectangle — you can currently walk
  through fences and the house wall from outside. Upgrade path: bring in
  `@react-three/rapier` and build a trimesh collider from
  `WorldMap_Collision`/`Home_Interior_Collision` if exact collision matters.
- **No mobile touch controls.** Original ships `Help_Move_Mobile`,
  `Help_Interact_Mobile`, etc. icon assets implying an on-screen joystick/
  button layer for touch devices; this clone is keyboard-only. Desktop-only
  for now.
- **Decorative micro-interactions not implemented**: the ~15
  `Clickable_Lighting_*_Sensor` lamps (click to toggle on/off), the
  fridge/desk notes (`Note_Sensor`/`NoteFridge_Sensor`), Nintendo Switch
  prop, and the bell/clock chime. Only the two sensors that gate real
  content (PC → portfolio nav, MailBox → contact form) plus Entrance/Exit
  are wired up. **Sitting is implemented**: every `Sitting_*_Sensor`
  (bench, bench-bed, chairs, sofas, stools, plus the PC chair) plays the
  `Sit` clip and pins the player to the seat via `store.ts` `sittingOn`
  (see `InteractionOverlay.tsx` `SIT_FURNITURE` / `Player.tsx`'s
  `sittingOn` branch); E toggles sit/stand on furniture, while the PC
  sensor also opens the portfolio panel and stands the player up again on
  close. `Sleeping_Bed_Sensor` (a `Sleep` clip) is not wired up.
- **Contact form is a local mock.** The original POSTs to the site owner's
  personal Formspree endpoint; reusing it from a clone would send fake
  submissions to a real person's inbox, so this clone's form only simulates
  success locally (see `ContactPanel.tsx` ponytail comment).
- **Duck is a simple circular-path wander**, not the original's actual
  behavior tree (unknown/unobserved).
