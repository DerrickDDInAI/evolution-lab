# Playable watercolor themes

## Accepted brief — 2026-10-29

The owner requested implementing the three attached concept boards so they can compare them in-game: Sunseed Garden, Watercolor Glass Tide, and Moonbloom Nursery. These specific attachments supersede the preceding subtle-paint experiments for this task. Preserve the current design as a fourth selectable option. The builder owns experience review; selection of a final preferred theme remains with the owner.

Outcome: a browser-local appearance selector available from the menu and during play, applying coordinated menu, terrain, obstacles, survivor/sentinel art and interface palettes. Both game modes retain their mechanics, world geometry, contact footprints, training, identities and scores. No publication or production data mutation is included. Concept-board composition is an art reference, not replacement collision geometry or gameplay UI.

Acceptance: all four styles can be selected without leaving a run; selection survives reload when storage is available; broken/missing artwork has a usable fallback; moving and dormant actors remain distinct at gameplay scale; keyboard, small-screen and reduced-motion use remain available. Full help, records, training, joining and recovery surfaces must remain readable. Validate domain/type checks, build, focused lint and a disposable browser journey; document remaining device limits.

Plan: generate game-ready art from each board, integrate a presentation-only theme boundary, verify selection and gameplay in a fresh local preview, then hand off the preview for comparison. Existing runtime data and unrelated release work remain untouched.

## Implementation — 2026-10-30

Appearance is available from the mode menu, join screen, normal arena header and expanded arena. Four preview cards select Original Glass Tide, Sunseed Garden, Watercolor Glass Tide or Moonbloom Nursery. Selection waits for the atlas, human artwork, floor, menu, sign and ground details to decode; failed loads retain the current style and offer retry or Original. Failed requests are discarded so retry can download fresh images. Escape and the close/back controls dismiss the native modal. The local preference uses a dedicated key and tolerates unavailable storage. The arena remains live while movement input is suspended by the picker.

New art replaces the menu scenery, world-space ground, obstacle plants, survivor, dormant and active sentinels, border plants and Motion Hunt collectible. Existing world geometry, contact rings, occluder fading, camera, effects, server commands and records remain unchanged. Original is the default and keeps its original movement art. Recorded behavior films continue using the original renderer default. New survivor art uses four painted views with mirrored counterparts and restrained distance-driven lower-body motion; it is a comparison implementation, not a new full pose-by-pose animation set. Reduced-motion handling suppresses this added articulation.

The floor paintings use alternating mirrored tiles at reduced opacity. Per-theme atlas gutters avoid clipping leaves at generated, uneven column boundaries. Cream panels, dark text and restrained palette accents cover joining, help, records, training and model management. Portrait menus crop the landscape art instead of stretching it. At narrow widths, the appearance brush remains visible and invitation copying is available in Help.

Owning files: `app/appearance.tsx`, `app/themes.css`, `lib/visual-theme.ts`, `lib/theme-art.ts`, integration in `app/page.tsx`, `app/mode-menu.tsx`, `app/use-arena.ts`, and `lib/renderer.ts`. Runtime art and exact generation prompts are under `public/immunity/themes/`.

## Verification and handoff

The local preview uses a fresh disposable database in `/private/tmp/immunity-themes-20261029/source`, at `http://127.0.0.1:5190/`. No original database, hosting configuration, score identity, genome or secret was changed. The preview is intentionally left running for the owner to compare styles. This is a local, uncommitted implementation; nothing in this task was pushed or published.

- PASS: 136 domain regressions, TypeScript, production build and focused lint for the new theme modules, appearance dialog, menu and renderer. Full lint retains the existing 16 errors; its 44 warnings include generated local test artifacts and existing source findings. No lint suppression was added.
- Browser review: all four looks selected; original restored during a run; preferences survived reload; Survival entry, movement, active/dormant art, outside respawn, run-ended notice, retained records and rejoin checked. Appearance failed safely during a preview rebuild, and retry loaded successfully after restart. Keyboard Enter/Escape and focus return checked. Motion Hunt join, movement and its mission interface checked.
- Narrow layouts: 390 and 320 CSS pixels, no page-width overflow; header Appearance/Help/Leave controls remained available. Help and training charts remained readable. These are desktop browser viewport checks, not physical-touch validation.
- Limits: physical touch, OS reduced-motion visuals, hosted multiplayer performance and a complete new Motion Hunt extraction run were not revalidated. The contact instant itself was not frame-captured; confirmed captures, outside recovery and saved scores were observed. No simulation or persistence change was introduced. Existing integration evidence from the repaired baseline remains applicable; HTTP/D1 fixtures were not rerun for this presentation change.

Ignored screenshots are saved in `outputs/themes/`. The owner can now compare the three in-game styles and choose a preferred direction.

## Fidelity correction brief — 2026-10-30

The owner rejected the first pass as insufficiently close to the attached boards. The correction retains the four-theme selector and shared gameplay but replaces the generic presentation: readable larger painted actors, themed environmental ground washes around the actual obstacles, continuous planted borders, compact paper HUD rather than an always-expanded chart, and illustrated seed/shell/lantern menu signs. The reference boards remain the visual acceptance target; the builder will compare real screenshots. New scenery is decorative and must not imply new blocking rocks in walkable ground. Original rendering, simulation, learned data and records remain unchanged. Reuse the disposable local preview, verify revised art loading, browser layouts, movement, type/build checks and renderer regression tests. No publication is authorized.


### Fidelity correction delivered

The playable environments now use larger painted actors and obstacle plants, denser botanical boundaries, ground details anchored around the existing obstacles, and more visible floor brushwork. Sunseed has cream silt and narrow lily streams; Watercolor has celadon pools and shell scenery; Moonbloom has lavender ground, warm luminous stones and dark bud foliage. Moonbloom uses the cream-clad Sunseed traveler to match the human in the board. The shared collision geometry remains the existing arena, so these are reference-guided playable adaptations rather than exact copies of the illustrated map.

The menu now uses separately painted seed, scallop-shell and glowing leaf-framed signs. A shared cream paper panel replaces generic HUD blocks. Survival time and stamina are compact; Adaptation opens its full existing training panel. Invitation copying moves into Help below 1200 pixels to keep the top controls clear. Original Glass Tide retains its rendering and layout.

Seven additional assets were generated with the built-in image-generation tool, copied into `public/immunity/themes/`: `{sunseed,watercolor,moonbloom}/{sign,ground}.webp` and `paper.webp`. Exact prompts and reference identifiers are retained in [fidelity-prompts.json](../public/immunity/themes/fidelity-prompts.json). Transparent WebP conversion preserves alpha at quality 91; all theme assets together occupy approximately 6.3 MiB.

Final verification: 136 regressions and TypeScript passed, production build passed, focused theme/menu/renderer lint passed, and `git diff --check` passed. Browser screenshots reviewed all three revised arenas, the Moonbloom and Watercolor menus, larger actors, theme switching, Survival entry/movement/capture/recovery/rejoin and saved records. The compact Adaptation control opens the complete training details. Revised HUD layouts were inspected at actual 390 and 320 CSS pixels with no page-width overflow; the temporary viewport was reset. The earlier physical-touch, reduced-motion, hosted-performance and full Motion Hunt extraction limits still apply. Full lint retains its previously documented baseline; it was not rerun for this correction.

Screenshot evidence: `outputs/themes/sunseed-arena-refined.png`, `watercolor-arena-refined.png`, `moonbloom-arena-refined.png` and `moonbloom-menu-refined.png`. The local preview remains at `http://127.0.0.1:5190/`, with all changes uncommitted and unpublished. The owner remains the final judge of reference fidelity.


## Original Glass Tide adopts the painted interface — 2026-11-01

The owner selected Watercolor Glass Tide's button/interface treatment for Original, allowing small adaptations. Shared paper-control rules now include Original: shell menu signs, cream HUD panels, compact Adaptation access, timer/stamina, navigation, help/join/training surfaces and responsive controls. Original uses cooler teal ink and sage stamina accents; its shell signs are positioned over the existing raised signs in its own landscape and portrait menu paintings. Its original scenery, actors, animations, renderer palette, simulation and records are unchanged. This explicitly supersedes earlier statements that Original retains the old interface layout. Existing artwork is reused; no new generation or runtime dependency was required.

PASS: 151 regressions, TypeScript, production builds in the working checkout and disposable preview, focused visual-theme lint and diff whitespace checks. Browser review covered Original selection, keyboard menu entry, Survival joining/movement, compact training-button access, desktop HUD and actual 320-pixel HUD / 390-pixel portrait-menu fit with no horizontal overflow. The temporary viewport was reset. A complete new capture/respawn/rejoin journey, physical touch, reduced-motion visuals and Motion Hunt extraction were not rerun for this CSS-led change. Existing gameplay verification remains separate.

Evidence is saved under `outputs/themes/original-paper-ui.png` and `original-paper-menu.png`. Browser play used the disposable `/private/tmp/immunity-original-ui-20261101` database; the verification server was stopped afterward. The main checkout has been rebuilt and is ready for `npm start -- --port 5173`. Existing runtime data, genomes, unrelated evaluation work and hosting configuration are preserved. Local/uncommitted; not published.


## Publication — 2026-11-02

The owner authorized publishing the updated Original interface. Sites version 37 is live from hosted-source commit `849e1e51bf12416a4455c41afdd29825aff1db73`, with Original as the default and the alternate themes retained. The bounded release passed 136 game tests, TypeScript and the production build. Unrelated evaluation work was excluded. No production database reset or migration was performed; local runtime hashes remained unchanged. See the [release receipt](project-state.md#updated-original-interface-published--2026-11-02) for IDs, source scope and verification limits. The working checkout remains uncommitted; the release was pushed to the separate Sites source repository.

## Interface simplification — 2026-11-02

Owner requested removing the redundant arena status badge and reducing the join card to the name input, join and back controls. Leave remains session-only. Film headings, archive labels and download links now inherit panel ink/accent colors rather than pale dark-panel colors; error feedback and archive buttons use explicit paper-compatible contrast.

PASS: 151 tests, TypeScript, production build and diff whitespace. Local disposable preview opened the menu and Models & admin connection-recovery panel. Full authenticated film/archive and gameplay journey were not repeated. This first commit also records the existing, previously published visual-theme foundation needed by these changes; unrelated evaluation work stays uncommitted. No push or deployment.

## Original Glass Tide selected — 2026-11-02

The owner requested removing all appearance options after the interface-fix commit. Original is now the fixed presentation for menu, arena and films, retaining the accepted cream paper controls and shell signs. The picker, saved-preference handling, alternate renderer/menu branches and alternate runtime images are removed. Old browser preferences are ignored. Historical prompts remain; earlier comparison assets are recoverable from Git.

PASS: 151 tests, TypeScript, production build and diff whitespace. Disposable local browser review confirms no Appearance entry, the compact name form, successful join, Leave appearing only in a session, and Leave returning to the menu. Models/admin connection recovery was inspected; authenticated film playback, full contact/rejoin, Motion Hunt extraction, physical touch and OS reduced-motion checks were not repeated. No push, publication or existing runtime-data changes.
