# Glass Tide tilted implementation

Accepted by the user on 2026-10-20: implement the tilted Glass Tide direction on a new branch. Branch: `codex/glass-tide-tilted`, based on `93a20c9`. This is a local presentation change for Pursuit Lab's existing survival game.

## Experience and scope

The player should feel small in living alien shallows, with recognizable human survivors, translucent seed sentinels, shell flora and overgrown colony fragments. The selected tilted camera reveals their bodies and height. Pearl and jade interface membranes, a lamellar sprint gauge and a vein-like field map translate the biological-feedback brief into usable controls.

The builder owns visual and experience review. The user approved one bounded additional agent review of rendering and collision alignment, with no further delegation. That review found and resolved foliage culling, short-screen form overflow and fitness-chart contrast issues.

The accepted slice includes terrain, actors, existing obstacles and gates, join/help/history/training UI, and the current playable loop. Movement rules, obstacle geometry, bot evolution, authoritative contacts, networking and score persistence remain unchanged. Motion-sensitive hunters and resource extraction are separate proposals. No deployment is included.

## Rendering

- [Camera helpers](../lib/glass-tide.ts) project ground Y at 0.68 of X scale. Upright sprites retain their proportions. This is a fixed oblique 2.5D view, not a rotatable 3D camera.
- [Renderer](../lib/renderer.ts) sorts flora, ruins, survivors and sentinels by world Y. Foreground foliage fades when it overlaps an actor; labels stay on top.
- Ground rings use the real player/bot radii (16/13) and obstacle radius, projected as ellipses. Contact remains in world coordinates. The minimap viewport accounts for the extra visible depth.
- Water texture is anchored to the world. Low ground decoration has no collision; prominent flora and ruin art sit on existing obstacle footprints. Wall reeds are culled independently from wall paint.
- Active and dormant sentinels have different silhouettes. Image-loading failures retain procedural actor/obstacle fallbacks. Reduced-motion preference disables sprite sway/ripples and retains the existing reduced-motion collision effects.
- [UI](../app/page.tsx) and [styles](../app/globals.css) preserve names, help, energy semantics, status/error messages, scores, zoom/expand and champion export. The join card scrolls when its contents exceed the arena height.

Generated runtime artwork is in [public/glass-tide](../public/glass-tide/README.md). It is original production artwork generated for this implementation, not a cropped movie still or concept-board screenshot.

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

Limits: no physical touchscreen test, OS reduced-motion visual test, maximum-player visual/load test, hosted CI or deployment. HTTP fixtures cover simultaneous clients; that is not a 12-player performance claim. Sprites use static poses with gentle movement, not directional animation sheets. The biological HUD is a visual interpretation; a fully modeled wearable symbiont is future art work.

## Local use

Use the repository's documented setup and `npm run dev` with its prepared local database. The temporary QA preview can be restarted from its directory with `npm run start -- --port 5174`; it contains disposable fixture scores and training state.

Next review is the user's visual assessment, followed by physical touch/reduced-motion and multi-player readability checks if this direction proceeds toward release.
