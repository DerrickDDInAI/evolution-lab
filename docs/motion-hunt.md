# Motion Hunt and expedition menu

## Accepted outcome — 2026-10-20

User requested implementation of two selectable modes. Move the survivor into a choice and remain there for less than one second, or press Enter to confirm immediately. The second mode requires collecting a resource essential to humanity’s survival on this planet and then exiting. Existing Survival remains available.

## Experience and implementation decisions

Reuse the selected tilted Glass Tide art and organic interface. Builder owns experience review. The local design mockup is `outputs/mode-menu-mockup.svg`: two clearings, a survivor starting between them, readable mode descriptions, and visible dwell progress. Confirmation takes 850 ms of continuous occupancy. Leaving a clearing resets progress. Keyboard, pointer/touch movement and accessible mode buttons share the same selection. Name entry follows selection; leaving a game returns to mode selection.

First playable mechanics: one life-support seed in the central clear corridor; each player collects their own seed by reaching it. Carry it to any of the four gate thresholds to extract. No seed means no extraction. Capture loses the seed and returns the player outside. Stationary humans provide no target signal; bots halt when no moving target is sensed. Physical contact remains dangerous, including when another human draws a bot past a stationary player. Pursuit uses the existing evolving neural controller behind this explicit sensory rule, without claiming detection itself or improved hunting has been experimentally learned.

Keep Survival’s existing database row, genomes, records and legacy protocol. Motion Hunt uses a separate arena row and mode-specific anonymous score identity, with successful extraction encoded separately from captures. No schema reset or live migration. Reuse shared movement and visible-contact validation. No deployment in this implementation task.

## Acceptance and checkpoints

1. Domain/API: moving-only target selection, no stationary-target fitness leak, collectible → extraction → reset, capture loss, isolated mode persistence, preserved contact/life/idempotency rules.
2. UI: menu walk/850 ms/Enter/reset; mission guidance, resource/map marker, carrying state, extraction result, mode-specific records, leave and rejoin.
3. Checks: regression tests and TypeScript; focused lint and build; disposable local HTTP/D1 and browser walkthrough with keyboard and narrow layout. Keep verification limits explicit. Learning quality needs repeated controlled training trials beyond this feature implementation.

## Verification

Local implementation on `main` based on `18b65bc`; nothing committed, pushed or deployed. macOS / Node.js 22.22.3, existing dependencies. A fresh disposable checkout/database at `/private/tmp/pursuit-motion-qa-20261020` was built and served on port 5175. Existing project databases were untouched.

- PASS: 69 domain regression tests and TypeScript. New cases cover continuous dwell/reset/Enter, mode identity, stationary-target independence, blocked movement, pickup, all four exits, cargo loss, old-life/retry barriers, and delayed moving-target capture rewards.
- PASS: production build and five sequential HTTP/D1 fixtures, including `tests/motion-hunt.mjs` for isolation, mode validation, collection, successful extraction persistence, contact loss and rejoin.
- PASS: new menu/domain/integration files have no lint findings. Existing touched files retain baseline findings (16 errors, 13 warnings across the checked files); no rule suppressions added.
- PASS: browser movement + Enter confirmation, automatic dwell, pointer selection, name/join/arena entry, stillness display, seed pickup, extraction/record, capture/outside respawn, restored extraction record on rejoin, help focus, Survival re-entry/timer with separate records, and 390 CSS-pixel menu layout with no horizontal overflow. The mission journey used controlled server-side QA placements near objectives and contact, then real browser movement/contact handling. No browser warnings/errors observed after the final reload. Visual review found and fixed overlapping mission/result/warm-up messages.
- Unverified: physical touch hardware, OS reduced-motion visuals, 12-player load, reconnect under arbitrary network faults, long-session balance and repeated-seed learning improvement. The existing 750 ms movement regression passes; it is not proof of arbitrary network behavior.

The preview can be restarted in the disposable folder with `npm run start -- --port 5175`. Runtime fixtures are local only. Main source: `app/mode-menu.tsx`, `lib/game-mode.ts`, `lib/arena.ts`, `app/api/arena/route.ts`, `app/use-arena.ts`, `app/page.tsx`, `lib/renderer.ts`.

## Persistence and learning details

Survival retains row `shared` and its original profile hash. Motion Hunt uses row `motion` and a mode-specific hash of the same private profile token. Successful extraction is stored as `bot = -1`; fastest success uses MIN over those rows, excluding failed missions. Both outcomes use the existing atomic world/score transaction and life increment. No new migration is required.

The 11-input network remains compatible: filter detectable targets before building inputs; halt without activation if none remain. Threshold is 8 world units/second, using the shared post-collision velocity. There is no extra hidden-position input or remembered target, and no new detection flag/topology layout. The private issued contact frame records whether this player was moving, so a later stop packet cannot remove a moving-target capture reward. This is sampled observation, not continuous historical motion reconstruction. Population training still uses live opponents; controlled offline curriculum and learned detection are future experiments.

Final menu screenshot: `outputs/motion-menu-final.png` (ignored local artifact). The disposable preview is stopped after verification; restart it with the command above.

## Menu art proposals — 2026-10-20

User requested several menu designs matching the Glass Tide world. These are generated concept mockups, not implemented screens. The user subsequently selected Expedition Nursery for implementation. Built-in image generation used the tilted Glass Tide concept and runtime sprite atlas as style/character references; [exact prompt set](design/2026-10-20/menu-concepts/prompts.json).

| Direction | Experience | Tradeoff |
| --- | --- | --- |
| [01 — Tidal Clearings](design/2026-10-20/menu-concepts/01-tidal-clearings.png) | Two low pearl-silt clearings connected by shallow paths. Walking into a ring selects the mode; a warm ripple fills during the hold. | Clearest movement space and closest to current terrain. Less architectural drama. |
| [02 — Living Gateways](design/2026-10-20/menu-concepts/02-living-gateways.png) | Two overgrown colony-rib arches, each with a broad selection pad and a pearl label. Selection opens the glass membrane as the camera passes into play. | Strongest arrival and transition; simplify foreground plants so paths and pads stay clear. |
| [03 — Expedition Nursery](design/2026-10-20/menu-concepts/03-expedition-nursery.png) | A living shell shelter displays a sentinel beside Survival and a seed beside Motion Hunt. Walk to their floor circles; root veins fill to confirm. | Best visual explanation of the objectives, but denser and needs the most simplification on phones. |

Original proposal recommendation: Living Gateways, using broad unblocked selection pads and restrained pearl labels. All options preserve the actual survivor, movement navigation, 850 ms continuous dwell and immediate Enter confirmation. Menu fauna are harmless exhibits or decoration; no combat or resource collection happens in the menu. Leaving a pad cancels its progress. Disable unnecessary pulsing/camera movement for reduced motion and retain readable DOM text/accessibility controls over the scene.

The illustrations exaggerate foliage detail and structure size. Gateway/nursery rings illustrate an activation state even though the painted survivor is in the neutral approach; implementation must only show progress while occupying the chosen zone. Any transition follows confirmed selection, never introduces another delay before confirmation. No new lore or mechanics are accepted by the drawings. Verification: visual inspection of all three generated mockups and local links; no runtime change or new gameplay tests required.


## Accepted nursery implementation — 2026-10-20

The user selected the attached Expedition Nursery image and requested implementation. Outcome: a full-screen living-shell menu matching that composition, with real DOM text, a moving survivor, and floor-pad selection for Survival and Motion Hunt. The builder owns visual review. Acceptance: keyboard and pointer travel, continuous 850 ms occupancy or Enter, cancellation on leaving/blur/help, correct mode entry and return, readable narrow layouts, and no changes to game persistence or learning. The provided mockup is the accepted design; background preparation removes painted lettering, the fixed character and the baked selection glow. Runtime overlays restore those as live controls. Checkpoints: clean art, functional scene, tests/build, desktop/mobile browser comparison.


Implemented: `public/glass-tide/nursery-menu.png` is a clean plate derived from the selected mockup. Live pearl-label text, an eight-heading walking/idle survivor, and amber vein/progress overlays match its composition. The plate stays uncropped; portrait layouts move readable choice labels below the scene. Floor hit tests use the same normalized ellipse geometry as the visible rings. Focus loss, hidden tabs and Help cancel dwell; reduced-motion preference suppresses walk-frame cycling. Clicking a label walks to its pad; focused labels retain direct Enter access.

Verification: 70/70 domain tests and TypeScript pass, including continuous dwell/reset and new elliptical floor geometry coverage. Production build and focused menu/domain lint pass. Browser review at desktop and 390 CSS pixels covered arrow movement + Enter, pointer travel + automatic dwell in both modes, leaving a pad to cancel, Help pause/recovery, join and Change mode return, no horizontal overflow, and no console warnings/errors. Final rendered screenshot: `outputs/nursery-menu-final.png` (ignored local artifact). The previous five HTTP/D1 fixtures and mission/contact/respawn/rejoin checks remain the gameplay evidence; they were not repeated for this presentation-only follow-up. Physical touch and OS reduced-motion visuals remain unverified. Local uncommitted implementation; no deployment.
