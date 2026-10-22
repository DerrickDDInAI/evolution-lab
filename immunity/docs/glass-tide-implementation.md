# Glass Tide tilted implementation

Accepted by the user on 2026-10-20: implement the tilted Glass Tide direction on a new branch. Branch: `codex/glass-tide-tilted`, based on `93a20c9`. This is a local presentation change for Immunity's existing survival game.

## Experience and scope

The player should feel small in living alien shallows, with recognizable human survivors, translucent seed sentinels, shell flora and overgrown colony fragments. The selected tilted camera reveals their bodies and height. Pearl and jade interface membranes, a lamellar sprint gauge and a vein-like field map translate the biological-feedback brief into usable controls.

The builder owns visual and experience review. The user approved one bounded additional agent review of rendering and collision alignment, with no further delegation. That review found and resolved foliage culling, short-screen form overflow and fitness-chart contrast issues.

The accepted slice includes terrain, actors, existing obstacles and gates, join/help/history/training UI, and the current playable loop. Movement rules, obstacle geometry, bot evolution, authoritative contacts, networking and score persistence remain unchanged. Motion-sensitive hunters and resource extraction are separate proposals. No deployment is included.

## Rendering

- [Camera helpers](../lib/immunity-art.ts) project ground Y at 0.68 of X scale. Upright sprites retain their proportions. This is a fixed oblique 2.5D view, not a rotatable 3D camera.
- [Renderer](../lib/renderer.ts) sorts flora, ruins, survivors and sentinels by world Y. Foreground foliage fades when it overlaps an actor; labels stay on top.
- Ground rings use the real player/bot radii (16/13) and obstacle radius, projected as ellipses. Contact remains in world coordinates. The minimap viewport accounts for the extra visible depth.
- Water texture is anchored to the world. Low ground decoration has no collision; prominent flora and ruin art sit on existing obstacle footprints. Wall reeds are culled independently from wall paint.
- Active and dormant sentinels have different silhouettes. Image-loading failures retain procedural actor/obstacle fallbacks. Reduced-motion preference disables sprite sway/ripples and retains the existing reduced-motion collision effects.
- [UI](../app/page.tsx) and [styles](../app/globals.css) preserve names, help, energy semantics, status/error messages, scores, zoom/expand and champion export. The join card scrolls when its contents exceed the arena height.

Generated runtime artwork is in [public/immunity](../public/immunity/README.md). It is original production artwork generated for this implementation, not a cropped movie still or concept-board screenshot.

## Verification — 2026-10-20

Environment: macOS, Node.js 22.22.3, npm 10.9.8, existing dependencies. Production build and HTTP/D1 checks used `/private/tmp/pursuit-glass-tide-qa-20261020` with its own migrated database and local port 5174. Existing project data was not reset.

| Check | Result |
| --- | --- |
| Domain regression suite | PASS, 51/51. Three new cases cover projected contact distances across angles/zoom, camera/minimap bounds, and actor/plant ordering and overlap. |
| TypeScript | PASS. |
| Production build | PASS after the review fixes. |
| Sequential integration fixtures | PASS: visible contact/protocol validation; atomic contact/respawn/scores and retries; simultaneous clients/privacy/input validation; bot contact and score restoration; delayed movement acknowledgements. |
| Browser journey | PASS: join → safe outside → keyboard entry/movement → pursuit → contact → outside respawn → saved score → leave/rejoin retaining the score. Also checked zoom, expanded mode, help/Escape/focus return, field notes and foreground fading. |
| Responsive layout | PASS at measured 390×844 CSS pixels; no horizontal overflow. At 800×360 and in expanded mode, the join form remains reachable; expanded card scrolls (331px content window / 403px content). |
| Browser console | No warnings/errors observed in the completed preview session. |
| Focused lint | Renderer, camera helper and layout pass. `app/page.tsx` retains exactly the baseline 8 errors / 1 warning, with the same rule IDs; no rules disabled. Full repository lint remains existing debt. |

The first attempted test rerun in the source checkout was blocked by sandbox write permissions for generated test modules; the same final sources passed in the disposable checkout.

Limits: no physical touchscreen test, OS reduced-motion visual test, maximum-player visual/load test, hosted CI or deployment. HTTP fixtures cover simultaneous clients; that is not a 12-player performance claim. The initial sprites used static poses; the directional follow-up below replaces moving actors with eight-way facing. Walking and sprinting now have separate sprite cycles, as recorded below. The biological HUD is a visual interpretation; a fully modeled wearable symbiont is future art work.

## Local use

Use the repository's documented setup and `npm run dev` with its prepared local database. The temporary QA preview can be restarted from its directory with `npm run start -- --port 5174`; it contains disposable fixture scores and training state.

Next review is the user's visual assessment, followed by physical touch/reduced-motion and multi-player readability checks if this direction proceeds toward release.

## Directional movement follow-up

Accepted 2026-10-20: add eight facing poses to survivors and active seed sentinels, using the existing art as reference. Keep facing at rest, suppress boundary jitter, preserve dormant seeds and world-space collision rules. Builder owns this focused follow-up review; no additional delegation. Acceptance: all eight movement headings select the matching pose, idle retains facing, respawns reset visual state, missing artwork falls back safely, and normal/reduced-motion rendering keeps contact rings anchored. Verify with focused regression tests, type checking/build and browser movement checks.

Directional follow-up verification: 54/54 tests and TypeScript passed; production build passed in the existing disposable preview. Focused renderer/helper lint passed. Browser checks verified front, rear, profile and diagonal survivor views, retained idle facing, moving sentinels and unchanged ground anchors. The three added tests cover all eight headings, boundary hysteresis/idle retention, distance-based gait/reset behavior and missing-sheet fallback. Existing integration results above are from the original tilted implementation; no networking/domain changes were made in this follow-up, so those fixtures were not repeated. Physical touch and OS reduced-motion visual testing remain unverified.

The directional sheet uses five inspected views per actor plus mirrored counterparts for eight headings; per-row sampling and feet/tail anchors account for uneven generated atlas spacing. Movement bob uses actual travelled distance and stops while stationary; reduced-motion mode suppresses bob while retaining directional cues. Pose state is scoped to the canvas and discarded for missing actors/new lives.

## Sprint animation follow-up

Accepted 2026-10-20: add survivor sprint sprite frames, reusing Glass Tide identity and eight-way facing. Builder review; no additional delegation. Four stride phases across five views (mirrored for eight directions), triggered by actual sprint-speed motion; preserve idle/walk poses, collision rules and reduced-motion behavior. Acceptance: alternating limbs, stable feet/scale, correct heading, no sprint loop while idle/blocked or after stamina depletion; test selection/fallback and review the running preview.

Sprint follow-up verification: 56/56 tests, TypeScript, production build and focused renderer/helper lint passed. Added coverage for four-phase/eight-heading selection, walking/idle suppression, reduced-motion static pose, asset fallback and source-rectangle/anchor bounds. Live Shift movement showed the new forward lean and extended/passing poses; a visual correction aligned hips over the contact ring. Release returns to the directional idle pose. Physical touch and OS reduced-motion visual checks remain unverified. No gameplay/network/storage rules changed; integration fixtures were not repeated.

The new sheet contains 20 drawn frames: five camera views × four phases, with mirrored views for eight headings and mirrored frontal/rear strike pairs. A phase advances every 40 travelled world units (about 10.75 frames/s at full sprint); it is selected only while moving with both observed and simulation velocity above 300 units/s (walk 255, sprint 430). Reduced motion holds the first sprint pose; asset failure falls back to directional/legacy artwork.

## Walking animation follow-up

Accepted: add a distinct survivor walking cycle using the established design. Builder review, no delegation. Four poses across five views mirrored for eight directions, upright torso and shorter stride than sprint. Acceptance: distance-driven walking at normal speed, separate sprint selection, stationary/blocked fallback, stable contact anchor, reduced-motion static pose and safe asset fallback.

Walking verification: 58/58 tests, TypeScript, production build and focused renderer/helper lint passed. Tests cover every facing and phase, exclusive walk/sprint speed bands, idle/invalid-speed suppression, reduced-motion pose and source/fallback bounds. Live browser movement verified changing walking frames, ground alignment and Shift transition to the distinct sprint cycle. A stale running preview manifest initially failed to load images after rebuilding; restarting that confirmed QA server restored the assets without changing its database. Physical touch and OS reduced-motion visual checks remain unverified. No gameplay or network rules changed; integration fixtures were not repeated.

The initial walking implementation used four phases across five views, mirrored to eight directions. A phase advanced every 42 travelled world units (about 6 frames/s at normal speed), compared with about 10.75 frames/s for sprinting. Idle/blocked movement uses the static directional pose, and reduced-motion mode holds frame zero. Shared drawing code keeps separate walk/sprint atlas bounds and hip anchors.


## Walking realism correction — 2026-10-21

Accepted user request: improve the survivor walking because the right leg appears permanently ahead of the left. Inspection confirms repeated leading-foot silhouettes in the generated four-frame atlas; mirroring front/back later phases does not repair the oblique/profile views. Reuse the existing survivor design and camera. Builder owns review; no delegation. Outcome: clearly alternating left/right contact, passing and push-off poses with stable body scale and ground contact in all eight headings, shared by menu and arena. Preserve sprint, gameplay, collision, persistence and hosting identity.

Implemented and reviewed 2026-10-22: reuse the original `walk.webp` painting with view-specific thigh, shin/boot and body masks. Two independently articulated legs run half a cycle apart; a planted foot moves back, and the passing foot lifts and swings forward. Knee joints follow the hip/ankle positions, the near leg remains in front in depth, and the cape/hips cover the joints. Body orientation no longer flips halfway through a frontal/rear stride. A complete two-step cycle spans 224 travelled world units (about 0.88 seconds at normal speed); interpolation runs each render frame. Menu and arena share this helper. Idle/blocked behavior, static reduced-motion pose, missing-art fallback and sprint rendering are preserved. No generated replacement artwork is shipped.

PASS: 92 tests and TypeScript; production build; focused helper/test lint with only the existing unused `remoteAge` warning. Added regressions cover stable orientation, alternating support/passing feet, continuous loop boundaries, all-heading draw bounds, finite transforms and preserved draw origins. Rendered comparison reviewed both footfalls and passing poses across eight headings at menu and arena scales. Local browser checks covered menu keyboard travel, mode entry, joining, directional walking, Shift sprint, active arena entry, visible capture, outside respawn and mode return. QA uses `/private/tmp/immunity-walk-qa-20261021` and fresh local D1, preserving existing runtime data. No network/gameplay rules changed, so HTTP integration fixtures were not repeated. Physical touch, OS reduced-motion visuals and maximum-player rendering performance remain unverified. Changes are local, uncommitted and undeployed.


## Whole-body locomotion correction — 2026-10-22

User rejected the deployed walk because the arms remain static and the stride is too short for travel speed. Accepted clarification: keep movement speed and use a faster, longer running stride. Builder owns review; no delegation. Keep the survivor artwork and all movement/contact/persistence rules. Replace the frozen upper body with independently swinging arms and bent elbows, add torso lean/counter-motion, lengthen the leg excursion and shorten the travel cycle. Correct the menu's cadence using its actual on-screen travel and larger sprite scale.

Acceptance: opposite arm/leg motion through both contacts and passing poses, visibly longer steps, coherent whole-body motion in eight directions, cadence responding to realized travel, correctly normalized menu timing, stable idle/reduced-motion fallback and distinct sprint selection. Review the complete moving character over a scrolling ground grid at game scale, not only isolated footfall screenshots. Checkpoints: full-body pose prototype; moving-grid comparison at normal/sprint speeds and menu scale; regressions/type/build; local game journey and release under the existing walking publication authorization.


Implemented the whole-body correction: the normal-speed cycle now spans 104 travelled units instead of 224, with model-space leg excursion ±55 instead of ±25. Both arms articulate independently at shoulder and elbow, opposing the legs; the torso leans and counter-rotates. Sagittal-plane leg joints project foot travel into the oblique view, including front/back depth. Sprinting shares this rig with ±68 excursion, a 160-unit cycle, stronger arm bend and forward lean, and shorter ground contact. The previous sprint atlas remains a loading fallback. Existing character art is reused with arm/leg masks and cape-texture repairs; no new raster asset or dependency is shipped. This is a stylized running gait at the preserved game speed, not a measured human motion-capture or perfectly foot-locked simulation.

The menu now converts realized CSS-pixel travel into the actor's canvas/body scale, compensates for vertical ground tilt, and measures resize/portrait changes. It retains existing travel speed, keyboard/pointer controls, dwell, confirmation, focus and reduced-motion behavior. The arena keeps 255/430 movement speeds, hitboxes, physics, scores, learned state and contact rules.

Verification: 94 tests and TypeScript pass; focused renderer/art/menu/test lint has zero errors and the existing unused `remoteAge` warning. All five sequential gameplay HTTP/D1 fixtures pass in fresh disposable `/private/tmp/immunity-body-walk-qa-20261022`, covering movement, contact, outside respawn, saved scores/rejoin, latency and Motion Hunt. The production build passes; the exact release source is rebuilt before packaging. Tests cover long projected strides, opposing arm movement, sprint extension/lean, continuous whole-body motion, all-heading draw bounds/finite transforms, menu scaling/tilt and static reduced motion.

Visual review: browser prototype inspection compared full-body front, diagonal, profile and rear contact poses at large and game scales. The browser transport then failed repeatedly, so final live menu/arena interaction and OS reduced-motion/touch checks could not be repeated. A standalone two-second moving-ground comparison renders the production helper's full cycle and original sprite textures for five unique views; this is a rendered reference, not a recording of the game. Inspect the complete motion rather than treating regression/build results as proof of realism. Maximum-player rendering performance remains unverified. Publication result follows in project state.
