# Current project state

Current implementation baseline: `main` at `18b65bc`, inspected 2026-10-20 with a clean checkout before this task. Motion Hunt/menu changes are prepared for the user-authorized publication. The prior Glass Tide work is preserved. Recheck status and source before relying on this snapshot.

## Purpose and current outcome

**Observed product:** a standalone browser multiplayer survival game and NEAT-inspired learning experiment. The [README](../README.md) owns gameplay and technical details. Casual players and people exploring evolving bot behavior are the inferred audience; no participant research or formally accepted product roadmap was found.

**Current outcome (2026-10-20):** implemented the user-requested two-mode survivor menu and [Motion Hunt extraction mode](motion-hunt.md). Hold a clearing for 850 ms or press Enter; collect a life-support seed and reach any gate. Survival remains available with its existing data. The user authorized publication of this implementation on 2026-10-20; deployment outcome is recorded below.

**Menu design follow-up (2026-10-20):** three [Glass Tide menu concepts](motion-hunt.md#menu-art-proposals--2026-10-20) are saved: Tidal Clearings, Living Gateways and Expedition Nursery. The user selected Expedition Nursery, now implemented with live survivor movement and floor-pad selection.

Source inspection confirms the join → safe staging → arena entry → contact/death → outside respawn → saved-score flow in `app/page.tsx`, `app/use-arena.ts`, `lib/arena.ts` and `app/api/arena/route.ts`. The implementation has a 12-player cap, 24 bots, fixed generation homes with warm-up, sequenced movement, visible-contact negotiation, private frame history, and revision/commit-marker guarded D1 writes. This is implementation evidence, not a fresh live-game observation.

**Visual follow-up (2026-10-20):** the user requested Glass Tide in overhead and tilted views. Two [camera comparison mockups](visual-directions.md#glass-tide-camera-comparison--2026-10-20) are saved for review. The user subsequently selected the tilted view for implementation. The comparison images remain generated illustrations; implementation and actual browser evidence are recorded separately in [Glass Tide implementation](glass-tide-implementation.md). Other recorded gameplay proposals are preserved.

## Decisions and assumptions

| Status | Choice / rationale | Source / owner / date |
| --- | --- | --- |
| Accepted scope | Inspect first, preserve unrelated work, add only missing guidance/context/verification. | User's setup request, 2026-10-19 |
| Setup implementation | Reuse README for product/architecture/setup; keep rules in AGENTS and dated state here to avoid parallel authorities. | Setup agent adapting the requested workflow, 2026-10-19 |
| Existing convention | Keep this repository independent of the Python project and preserve the existing Site identity and data. | README and inspected source at `93a20c9`, reviewed 2026-10-19; original decision date/owner not established |
| Accepted preference | Offer delegation for larger tasks; agree scope and usage limits first. Work single-agent until that agreement. | User reply in the setup chat, 2026-10-19 |
| Accepted design brief | Nature-sovereign alien planet, ecological pursuit, lush arena and diegetic organic UI; develop several original directions using the supplied visual references. Tilted Glass Tide subsequently selected. | User request, 2026-10-20; [brief and proposals](visual-directions.md) |
| Accepted implementation | Tilted Glass Tide on a new branch, preserving current gameplay; one additional agent for bounded rendering/contact review, no further delegation. | User requests/reply, 2026-10-20 |
| Proposal | Prioritize validating the complete casual-play journey under latency before adding features. | Setup agent recommendation, 2026-10-19; requires user selection |

## Motion Hunt — implemented locally

**Accepted user request, 2026-10-20:** implement the motion-sensitive collect/extract mode plus a two-mode menu navigated by moving the survivor, with a subsecond hold or immediate Enter confirmation.

**Implemented defaults:** 850 ms menu dwell; one personal life-support seed; extraction at any gate threshold; capture loses the seed; stillness removes the target signal with no target memory, but physical contact remains lethal. Detection uses realized velocity; the existing NEAT-inspired controller evolves pursuit. Populations, champions and records are isolated per mode, preserving legacy Survival. See [mechanics, decisions, files and checks](motion-hunt.md).

**Deferred experiments:** temporal observations for evolved detection itself, repeated seeded training trials, randomized objective layouts, and measured improvement on unseen opponents. This release does not claim those research outcomes.

## Verification evidence

The workflow check results below are from 2026-10-19 on local macOS with Node.js 22.22.3 and npm 10.9.8, using existing dependencies; they were not rerun for the 2026-10-20 art proposals. The later task inspected the current UI/renderer, visually reviewed three generated concept boards and checked the documentation links. No game implementation or runtime test is claimed for these concepts.

| Check | Result and scope |
| --- | --- |
| `npm test` | PASS: 48/48 domain regression tests at the baseline revision. |
| `npm run typecheck` | PASS at the baseline revision. |
| `npm run lint` | FAIL before edits: 40 findings (16 errors, 24 warnings). Existing debt; no rule suppression or gameplay cleanup included in this setup. |
| `npm run verify` after setup edits | PASS: 48/48 tests followed by TypeScript checking. |
| Integration runner | PASS: syntax and focused ESLint; temporary harness checked ordering/environment, default/local origin, stop-on-failure/signal and launch failure with stubbed child execution. Five invalid origins were rejected by actual runner invocations before fixtures. No HTTP/D1 pass implied. |
| Documentation and preservation | PASS: 32 local links/anchors, balanced fences, whitespace and final newlines across six Markdown files; `git diff --check`; final diff limited to guidance, README links, package scripts and the runner. |
| Build, local HTTP/D1 integration, browser/device journey, live game and maximum load | Not run during this workflow setup. Existing scripts or screenshots do not establish a current pass. |
| Hosted CI | Not configured or run; no Git remote/provider is configured. See [engineering](engineering.md#ci). |

## Glass Tide verification

The 2026-10-20 implementation passed 51 domain tests, TypeScript and the production build. Sequential HTTP/D1 fixtures passed against a disposable database. Browser checks covered the full join/contact/respawn/saved-score/rejoin journey, keyboard help, zoom, field notes, foliage fading and narrow/short layouts. Focused lint adds no findings: renderer/helpers/layout pass; page retains its baseline 8 errors and 1 warning. See [detailed evidence and limits](glass-tide-implementation.md#verification--2026-10-20). Physical touch, OS reduced-motion visuals, maximum-player visual/load testing and hosted CI remain unverified.

## Gaps and next handoff

Motion Hunt and the expedition menu are verified locally and prepared for the requested online release. Competitive cheat resistance remains outside this task.

1. Review tilted Glass Tide's appearance and scale in the playable branch.
2. Before release, check physical touch controls, reduced-motion visuals and multiple players for readability and performance.
3. Triage existing lint debt separately; decide whether lint can become a required gate.
4. Choose a repository host/CI provider if remote collaboration is wanted. Evaluate Motion Hunt balance and learning quality through controlled trials before claiming improvement.

**Current handoff:** local, uncommitted changes on `main` based on `18b65bc`. [Motion Hunt](motion-hunt.md) records the outcome and verification. 69 domain tests, TypeScript, production build and all five sequential HTTP/D1 fixtures pass. Browser review covers both selection methods, pointer selection, mission pickup/extraction, capture/respawn, saved extraction on rejoin, help focus and a 390 CSS-pixel layout. New files pass lint; touched existing files retain their existing lint findings. No existing project database was reset, no changes were pushed or deployed. Disposable QA lives in `/private/tmp/pursuit-motion-qa-20261020`; screenshots are in ignored `outputs/`. Physical touch, reduced-motion OS testing and measured evolutionary improvement remain unverified.

**Sprint follow-up:** survivor sprint frames now animate across eight headings with distance-based timing, idle/walk suppression and reduced-motion fallback. 56 tests, TypeScript, build and focused renderer/helper lint pass; live Shift movement was visually checked. The same disposable preview folder was rebuilt. No new gameplay mechanics or deployment.

**Walking follow-up:** separate walking sprite cycle implemented across eight headings, alongside the existing sprint animation. 58 tests, TypeScript, build and focused lint pass; normal movement and Shift transition were checked in the rebuilt local preview. No gameplay changes or deployment.


**Expedition Nursery follow-up — 2026-10-20:** user selected the Nursery reference and requested implementation. The full-screen menu now uses its clean scenery with live text, animated survivor and amber floor-circle confirmation. Portrait layouts preserve the scene and show readable labels below it. Movement, 850 ms dwell, Enter, pointer travel, cancel-on-exit, focus/Help pause, joining and returning were checked in-browser. 70 domain tests, TypeScript, production build and focused menu/domain lint pass. Prior gameplay HTTP/D1 evidence remains applicable; no persistence or bot changes in this follow-up. [Details](motion-hunt.md#accepted-nursery-implementation--2026-10-20). Final screenshot in ignored `outputs/nursery-menu-final.png`. Local changes remain uncommitted and undeployed. Physical touch and OS reduced-motion visuals remain unverified.


## Publication — 2026-10-20

The user explicitly requested deployment of the current menu and Motion Hunt version. Release preparation preserves Site `appgprj_6ad2976be9588191b0d83a413395dc2c`, its public audience and D1 binding. No schema changes or production data fixtures are required. The source helper packages and pushes the current source, then Sites publishes the matching saved version. Release validation reuses the successful 70-test/TypeScript and browser evidence above and builds the exact release source. Deployment succeeded: version 11, release source `9562c33b77a9b89ebeb2df1b87b65c2df33248fc`, deployment `appgdep_6ad7de96d89c8191b87230a793e733e1`. Live URL: https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site. Online browser verification confirmed the Nursery menu, arrow/Enter selection into Motion Hunt, enabled join form and return to the menu, with no console warnings/errors. Full mission/contact checks remain the prior disposable-local evidence; no production fixtures were run. The initial source push failed with HTTP 400; a process-only buffered transfer retry succeeded. This deployment receipt is a local documentation update after the pushed release commit.


## Repository and game rename — 2026-10-21

Accepted user request: rename the local repository to `evolution-lab` and move its existing game into `immunity/`, branded **Immunity**. Git metadata remains at the repository root; game files, dependencies, ignored runtime data and the existing hosting manifest move together. The sibling Python project is outside this scope.

Updated runtime headings, metadata, accessibility labels, champion downloads/export format and artwork URLs. Runtime artwork is in `public/immunity/`; presentation helpers are in `lib/immunity-art.ts`. Browser storage uses the new game prefix with compatibility reads for existing profiles, names and sessions; leaving clears both session keys. Historical design records retain their original direction names and release URLs as evidence. The existing publication receipt above is preserved.

This is a local change. Hosting identity and the live URL are preserved; no publication, remote rename or production migration is part of this request. No Git remote is configured. Verification follows.


**Rename verification:** PASS: 73 domain tests (including three browser-storage compatibility regressions), TypeScript, production build, local documentation file links and whitespace checks. Focused lint has zero errors and the existing unused `remoteAge` warning in `tests/arena.test.mjs`; repository-wide lint was not rerun. All 174 originally tracked files are present in the new game folder, including renamed artwork/helper paths. The seven existing local runtime data files and hosting manifest are byte-for-byte unchanged. The pre-existing uncommitted publication receipt is preserved.

**Browser evidence:** production output served from `/private/tmp/immunity-rename-qa-20261021` on loopback port 5176 with a fresh migrated database and shared installed dependencies. Confirmed Immunity title/menu, both mode choices, loaded scene/sprite artwork, joining Survival, session restore on reload, leaving, and saved player-name restoration in Motion Hunt. No browser warnings/errors were observed. Screenshot: ignored `outputs/immunity-menu.png`. Full contact/extraction, device, reduced-motion and HTTP/D1 fixture journeys were not rerun for this naming/layout change. No existing game database was used by the preview. Source changes are local, uncommitted and undeployed; run future game commands from `immunity/`.


## Living interface and visible bot training — 2026-10-21

Accepted user request: preserve the sufficient menu, make the in-mode interface diegetic/organic, and let every user see bot performance and its evolution. [Living interface](organic-interface.md) owns the design, metric definitions, affected files and verification details. The initial vector composition is saved there. Builder review; no delegation.

Implemented locally: full-field shell/vein HUD, an in-world stamina wreath, persistent Adaptation summaries for joined players and spectators, completed best/average fitness trends, change per generation, captures per active minute, provisional bot leaders, accessible generation rows, reward explanations and champion export. Optional mean fitness is recorded before each population reset. Existing generations with missing averages remain valid and explicitly unavailable. No changes to rewards, pursuit, contact rules, score identities, menu or hosting identity; no migration.

Verification: 75/75 tests, TypeScript and production build pass. New component/metrics and changed renderer pass focused lint; existing page/arena/test lint debt is unchanged. Browser checks cover both modes, real generation results, keyboard panel focus/Escape, sprint/stamina, visible contact/outside respawn/saved score/rejoin, and narrow/short layouts. The disconnected display identifies last-known training results. All database fixtures use `/private/tmp/immunity-organic-qa-20261021` with fresh local D1, preserving source runtime data. Final layout/integration evidence follows.

Current handoff: work remains local and uncommitted on the existing `main` checkout, preserving the prior uncommitted rename/publication receipt. No deployment or source push. Physical touch, OS reduced-motion visuals, maximum-player load and controlled training improvement remain unverified. Next review is the user's assessment of the playable interface, followed by those device checks before publication.

**Final evidence:** all five sequential HTTP/D1 fixtures pass. Final production build, 75 tests and TypeScript pass; existing-file lint findings are identical by rule and severity (10 errors, 13 warnings), with no findings in the new UI/metrics or renderer. Final phone/short-window reviews confirm corrected spacing and no 390-pixel horizontal overflow. Screenshots are saved in ignored `outputs/organic-hud-desktop.png` and `outputs/organic-hud-mobile.png`.


## Best generation follow-up — 2026-10-21

User requested best generation so far in the interface. Adaptation now names the completed generation with highest recorded best fitness; training details include its generation and score. Ties keep the earliest generation. The arena saves this mode-specific record separately from the 40-result chart window and publishes it as a non-personal aggregate. Existing worlds initialize from retained history; already discarded older results cannot be reconstructed. No migration, champion replacement, reward changes or reset of learned data.

Verification: 77 tests, TypeScript, production build and focused training component/helper lint pass. Regressions cover negative scores, ties, legacy initialization without genome changes, record retention across history rollover and save/load, later replacement and mode isolation. Browser confirmed best Gen 3 (50.1) alongside latest Gen 5 (22.7), and the added label fits measured 390 CSS pixels without horizontal overflow. Short-window review identified extra height; a bounded map-height adjustment was built, but its final browser recheck was blocked by recurring machine disk exhaustion. Prior integration evidence remains from the organic-interface task; no new HTTP fixtures were run for this follow-up. Local, uncommitted and undeployed.


## Tidal Lens interface — 2026-10-21

User selected the Tidal Lens concept, then asked that the interface stay compact and the game remain the focus. Implemented dark teal membranes, fine pearl/amber SVG shell edges, peripheral capillaries, luminous stamina chambers, and a readable best/average training chart with latest fitness, best generation and record fitness. Recent runs expand on demand; Help retains control instructions. The menu, simulation, learned state, scores and hosting identity are preserved. See [Living interface](organic-interface.md#tidal-lens--selected-implementation-2026-10-21) for reference, files, exact coverage measurements and limits.

PASS: 77 domain tests, TypeScript, final production build, focused shell/training lint, and all five disposable HTTP/D1 fixtures. Existing page lint remains 8 errors/1 warning. Browser checks include both modes, joining, movement/stamina, training/Help focus and Escape, actual generation updates, empty results, records, contact/respawn/re-entry and mode return. No overlap/overflow in sampled final 1600×900, 390×844, 800×360 and 320×567 layouts; persistent HUD rectangles occupy about 14% of desktop and 30% of a standard phone, with denser small-screen layouts. Final screenshots are in ignored `outputs/tidal-lens-*.jpg`.

Current handoff: the user requested a local commit of the completed interface, training metrics and supporting repository/game move on `main`, based on `9562c33`. Earlier local work and the publication receipt are preserved. No push or deployment is included. The Tidal Lens follow-up changes no gameplay rules or database schema. Physical touch, OS reduced-motion visual checks, maximum-player load and controlled learning quality remain unverified. Next step is the user's visual review; deployment has not been requested for this implementation.

## Training archive and administrator restore — 2026-10-21

User accepted the recommended public best-model exports, automatic training checkpoints, password-protected imports at generation boundaries, automatic pre-import backup, rollback and visible training branches. [Training archive](training-checkpoints.md) owns the contract, host setup, storage/retention and limits. Based on committed `e3f38cb`; the user requested commit and deployment on 2026-10-21. Production administrator access remains disabled until the host configures `IMMUNITY_ADMIN_PASSWORD_HASH`.

Implemented public v2 best-model and full-population exports, separate per-mode latest/rollback snapshots, strict model/topology/mode validation, persistent queued imports/cancellation, atomic world/checkpoint/score commits, and rollback. All-time models are now retained with the best-generation record. A legacy model is recovered only when the retained champion matches that record; otherwise a new record is required. Imports preserve player data and previous history, keep generation numbering moving forward, and mark a new branch without claiming imported fitness as a local record. Legacy v1 export remains compatible but is not importable. Controls remain inside the existing expandable Tidal Lens training dialog; no persistent HUD panels were added.

Administrator access fails closed until the host configures `IMMUNITY_ADMIN_PASSWORD_HASH`. `npm run admin:password` uses a hidden local prompt and stores only a salted scrypt hash in ignored, owner-only `.dev.vars`. Persistent login limits, 30-minute HttpOnly sessions, same-origin mutation checks, session revocation on logout/password rotation and safe upload validation are implemented. A shared password identifies authority, not individual people. Local secret loading is supported by the preview launcher; production setup remains separate. No production password was chosen or requested in chat, so the site can be published with admin-only imports safely disabled until the owner sets the secret.

PASS: 90 domain/security tests and TypeScript; final production build; lint clean in new modules and new/changed training components. Findings in pre-existing touched files are unchanged by rule/severity (11 errors, 13 warnings); no lint rules were weakened. The new disposable HTTP/D1 fixture passes exports, privacy exclusion, invalid/oversized/cross-mode input, authorization/origin rejection, concurrent queue and generation-boundary commits, backup/rollback, cancellation, mode/player preservation, sign-out/expiry and persistent throttling. All five existing sequential gameplay fixtures pass, including atomic score/respawn and Motion Hunt isolation. Oversized/unauthorized uploads are drained without retention to avoid leaving reused local-worker connections interrupted.

PASS browser: actual unauthenticated best-model download (v2, one genome, matching Gen 1 record), administrator sign-in/sign-out with a disposable credential, file-picker upload and compatibility preview, queued status, cancellation, rollback confirmation and Escape/focus return. A discovered focus escape after sign-out was fixed and rechecked. At 390 CSS pixels the archive has no document/panel horizontal overflow; desktop remains within the existing panel. No browser warning/error logs in the final check. Ignored screenshots: `outputs/training-archive-desktop.jpg`, `outputs/training-archive-phone.jpg`. Password setup was exercised in a separate temporary folder and verified to write a usable hash with mode 0600; no hash is embedded in the production build.

All integration/browser work uses `/private/tmp/immunity-checkpoints-qa-20261021` and disposable D1/credentials. Existing project runtime data, hosting identity, menus, movement and reward definitions are preserved. Physical-device touch, OS reduced-motion visuals, maximum-player load, standardized learning-quality evaluation and production administrator CPU/secret/cookie behavior remain unverified. The host must choose its password privately and configure the server secret before admin imports can be used.


## Survivor walking realism — 2026-10-22

User reported that the right leg appeared permanently ahead of the left. The shared menu/arena walk now articulates two legs from the existing painted artwork, half a cycle apart, with planted support, lifted passing feet, knee bends and continuous interpolation. Body orientation stays fixed through both footfalls; cadence is slightly slower. Sprint, idle, reduced-motion fallback, movement/contact rules and runtime data are preserved. [Implementation and evidence](glass-tide-implementation.md#walking-realism-correction--2026-10-21).

PASS: 92 tests, TypeScript, production build and focused helper/test lint (one existing unused-variable warning). Browser comparison covers all eight headings and both display scales; local play checks cover menu movement, joining, walking/sprinting, arena entry, visible capture, outside respawn and mode return. Disposable QA: `/private/tmp/immunity-walk-qa-20261021`; no existing database used. Physical touch, OS reduced-motion visuals and maximum-player render performance are unverified. No new HTTP integration run; rendering only. Local changes are uncommitted and undeployed.


### Walking release preparation — 2026-10-22

The user explicitly requested committing and deploying the improved walk. Release scope is the five walking renderer/regression/documentation files, preserving the public Site identity, existing storage bindings and source/runtime data. The verified 92-test/TypeScript, production build and browser evidence above remains current; no runtime source changed since those checks. Publication uses the existing flattened Site source checkout; the Evolution Lab repository retains its nested layout and history. Deployment receipt follows after a confirmed release.


### Walking publication — 2026-10-22

Committed the animation, regressions and supporting documentation on Evolution Lab `main` as `1d6a40d45dcb73cb6dc58eeb6db0c5e3df60ebb8` (`Improve survivor walking with alternating articulated legs`). The existing hosted source was opened in a fresh disposable checkout because an older temporary checkout had diverged; neither history was overwritten. Comparison confirmed that only the five walking files differed from the current hosted source, and hosted-only historical artwork was preserved.

The exact release source was built successfully, committed/pushed through Sites as `8359c94d73ef59857950beef50439e08d527fcc0`, and saved as version **13** (`appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_47cab2a4fa688191902aa4423a5532c5`). Native deployment `appgdep_6ad93ea6c598819186852898251f158b` returned **succeeded** with [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). The public audience, Site identity and D1 binding remain unchanged; no schema changes or production fixtures were run. The 92-test/TypeScript and local-browser evidence above remains current; the release build was rerun from the pushed source. Native success confirms publication; no additional production gameplay/device test is claimed. This receipt is a local documentation commit after the deployed source.


## Whole-body running correction — 2026-10-22

The user rejected the deployed walking realism and explicitly selected keeping movement speed with a faster, longer running stride. Replaced the remaining frozen upper body with opposing shoulder/elbow motion, torso lean/counter-motion, longer projected leg steps and a faster normal cycle. Sprint shares the same complete rig with stronger extension/lean. Corrected menu phase accumulation for actual CSS/canvas actor scale, portrait resizing and vertical tilt. Movement speeds, physics/contact, records, learned state, hitboxes and hosting identity are preserved. [Implementation, exact cadence and visual limits](glass-tide-implementation.md#whole-body-locomotion-correction--2026-10-22).

PASS: 94 tests, TypeScript, production build, focused lint (one existing unused-variable warning), and all five disposable gameplay integration fixtures. Browser prototype contact-pose review succeeded, then final browser transport failed repeatedly. Final in-game browser/device/reduced-motion checks remain unverified; a standalone full-cycle moving-ground render uses the production helper and original art for comparison. It is not a gameplay capture. Publication continues under the user's existing instruction to commit/deploy the walking correction; no production fixtures or schema changes. Release receipt follows.


### Whole-body correction publication — 2026-10-22

Committed the correction as Evolution Lab `883c733` (`Animate the survivor's full body with a faster running stride`). Reused the existing Site source checkout after synchronization; only the seven correction/documentation files changed, preserving hosted-only historical artwork. The exact release source rebuilt successfully and was pushed as `33844d569430ec946c0884249c0cbdbf6456caaa`. Saved version **14** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_9c632bc587dc819185a649604aefc492`. Native deployment `appgdep_6ada031c5240819196cff0a9e0aafe00` returned **succeeded** with [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). Public audience and D1/hosting identity are preserved. No production fixtures, secrets or migrations were changed.

Verification remains 94 tests/TypeScript, focused lint with one existing warning, successful release build, and all five disposable HTTP/D1 fixtures. Browser prototype poses were inspected before transport failure; final in-game browser, physical touch, OS reduced-motion and maximum-player render checks remain unverified. A two-second standalone GIF comparison renders production drawing helpers and original textures at the preserved movement speed; it is not a gameplay recording. The user's assessment of the live whole-body run remains the next visual review. This receipt is committed locally after the deployed source.


## Steadier running — 2026-10-22

User requested less bouncing. The shared menu/arena rig now uses a small, smooth pelvis rise, about 85% below the previous normal/sprint excursion, while preserving long strides, arm swing, cadence and movement speeds. [Implementation and verification](glass-tide-implementation.md#steadier-running-correction--2026-10-22). PASS: 95 tests/TypeScript; focused lint with one existing warning. Browser comparison reviewed both contacts and passing poses in eight headings at menu/arena scales. This focused helper review does not establish a fresh gameplay journey, physical touch, OS reduced-motion or maximum-player check. The existing commit/deploy authorization applies to this follow-up; exact release build and publication receipt follow.

### Steadier running publication — 2026-10-22

Committed as Evolution Lab `b65b5d7` (`Reduce survivor running bounce with a smooth steady pelvis`). Exact source rebuilt successfully and was pushed to the existing Sites repository as `9ff3e6e5ec1272b76d64b31e751e25f32b14739b`. Saved version **15** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_4f18fa99deb48191a13a0d1cae9f8d32`; deployment `appgdep_6ada6346810c819197559e896879ed28` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). Browser transport recovered for this follow-up: the published menu loaded and keyboard movement changed the survivor's position/facing. This is a production menu smoke check, not a full gameplay journey. Public access, hosting/D1 identity and existing runtime data are preserved. No schema changes or production fixtures.

Verification: 95 tests/TypeScript, focused lint with the existing unused-variable warning, successful exact-source release build, browser pose comparison and a two-second standalone full-cycle render. The user's live motion review remains the final visual assessment; physical touch, OS reduced-motion, maximum-player rendering and a fresh full-game journey remain unverified. Release receipt is a separate local documentation commit.


## Menu purpose inscription — 2026-10-22

User requested a few diegetic words explaining that opponents learn through play and every player contributes. The Expedition Nursery now carries a pearl-shell inscription: “A living experiment. How skilled can the sentinels become? They learn by hunting you. Every survivor shapes the next generation.” It is always visible before either mode is chosen and linked as the menu's accessible description. Portrait layouts place the inscription beneath the choices and keep movement instructions below it. Following the user’s request to explain the experiment’s aim and improve placement, the inscription sits on the foreground shell at the foot of the desktop menu, with a curved upper rim, pearl shading and quieter text hierarchy. The central path, sentinel and seed exhibits remain unobstructed. Builder reviewed the existing Nursery design; no new artwork or mechanics.

PASS: TypeScript, focused menu lint and production build in `/private/tmp/immunity-menu-purpose-20261022`. Browser review covered desktop, 390×844 and 320×567 CSS-pixel portrait layouts, plus 800×360 landscape. The narrowest layout has no horizontal overflow, the inscription clears the control instructions, and all copy fits on screen. Keyboard Enter selects Survival; pointer travel/dwell selects Motion Hunt; both return to the menu with the inscription visible. Fresh disposable D1 only. The expanded experiment copy and foreground placement passed the same TypeScript, focused menu lint, production build, four-layout browser review and keyboard/pointer mode-selection checks. Screenshots of this final placement: ignored `outputs/menu-experiment-desktop.png` and `outputs/menu-experiment-phone.png`. This copy/layout update does not establish a new full gameplay, physical-touch, reduced-motion or learning-quality pass.

Release preparation: the user explicitly requested committing and deploying the updated menu. Scope is the two menu source files and this verification record; existing learned populations, player records, public audience, hosting identity and runtime data are preserved. The verified source is unchanged since local layout and menu-selection checks. Build the exact hosted source before publishing; record the confirmed deployment receipt afterward.


### Menu experiment publication — 2026-10-22

Committed the updated experiment inscription, foreground shell placement and verification record as Evolution Lab `e46d63d1549ed34ded53ac652d23a90f2b9fa2bf` (`Explain the sentinel experiment on the nursery foreground shell`). Opened the current hosted source in a fresh disposable checkout and confirmed both menu files matched the expected prior baseline before applying the update. The exact release source rebuilt successfully, was pushed as `2f871abface28c94d97747c48d7ee6fd3c59c5b7`, and was saved as version **16** (`appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_e996c47b90cc8191be269dea8ad35c04`). Native deployment `appgdep_6ada82d61f5c8191a9df4192130159f5` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site).

The published browser menu visibly shows “A living experiment”, the sentinel skill question and every survivor’s contribution on the foreground shell, with both choices and scene artwork loaded. Live screenshot: ignored `outputs/menu-experiment-live.png`. Existing public audience, hosting identity and D1/learned/player data are preserved; no schema changes or production fixtures. TypeScript, focused lint and responsive/menu-selection evidence above remain current; the release build was rerun. This is a production menu smoke check, not a new full gameplay or physical-device pass. This release receipt is committed locally after the deployed source.


### Engraved foreground inscription — 2026-10-22

User requested that the inscription feel engraved into the foreground shell. Removed the added desktop plaque surface, border and raised shadow; the same accessible DOM text now rests directly on the original painted shell. Warm dark lettering, a fine lower-edge highlight, an upper-edge groove and a subtle 16-degree plane tilt suggest a recessed carving. Selection instructions move above the shell to keep the carving clear. Portrait and short-window layouts reuse a clean crop of the existing shell artwork behind the lettering, with feathered edges and no raised shadow. No raster files, menu copy, interactions, simulation or runtime data changed.

PASS: production build and whitespace checks. Browser review at 1600×900, 390×844, 320×567 and 800×360 CSS pixels confirms visible engraving, all copy on screen and no horizontal overflow. Computed desktop styles confirm no inscription background, border or box shadow, with pointer events still disabled and the accessible description preserved. Keyboard Enter selects Survival; pointer travel/dwell selects Motion Hunt; returning restores the menu. Fresh disposable preview/D1 in `/private/tmp/immunity-menu-purpose-20261022`; no existing database touched. Screenshots: ignored `outputs/menu-engraved-desktop.png` and `outputs/menu-engraved-phone.png`. This CSS-only change does not establish a fresh full gameplay, physical-device or reduced-motion pass.

Release preparation — 2026-10-23: the user explicitly requested committing and deploying the engraved inscription. Scope is the verified stylesheet and this record. Preserve the current public Site, hosting bindings, learned populations and player data; build the exact hosted source and record the confirmed deployment receipt afterward.


### Engraved inscription publication — 2026-10-23

Committed the engraved shell styling and verification record as Evolution Lab `78c3a0b18ffe8fd3830b82006f8de358db3a0805` (`Engrave the nursery inscription into the foreground shell`). Synchronized the existing hosted source checkout, confirmed its stylesheet matched the prior menu baseline and applied only the stylesheet/documentation update. The exact release source rebuilt successfully and was pushed as `11a03e0fc30533ae7804507f5e0ef106be59cb00`. Saved version **17** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_da1e96d773c08191845a59b880e085c3`; native deployment `appgdep_6adb3d74127c81919da5bbc49b2157b6` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site).

Live browser review confirms the lettering rests on the painted foreground shell, with the experiment copy, recessed letter shadows and perspective intact. Computed desktop styles confirm no inscription background, border or raised box shadow. Both mode choices and artwork load. Screenshot: ignored `outputs/menu-engraved-live.png`. Existing public audience, hosting identity, storage bindings, learned populations and player records are preserved; no schema changes or production fixtures. The responsive/menu-selection checks above remain the local interaction evidence; this release adds an exact-source build and production menu smoke check, not a new full gameplay or physical-device pass. This receipt is committed locally after the deployed source.


## Compact small-screen HUD — 2026-10-23

Implemented the user's request to reduce HUD coverage on phones, reusing Tidal Lens. Adaptation is a compact live fitness/sparkline button; full training remains available on tap. Smaller header, timer/stamina and records keep the field clear. Map/zoom/expand move behind View, with touch controls positioned above the bottom instruments. Short landscape windows receive the same compact treatment; regular desktop and the accepted menu retain their layouts. [Details and verification](organic-interface.md#compact-phone-hud--2026-10-23).

PASS: 95 domain tests, TypeScript, final production build, and responsive browser checks at measured 390×660, 390×500, 320×500, 800×360 and 1600×900 CSS pixels. Verified both mode HUDs/joining, Survival movement/sprint/contact/outside respawn/re-entry, saved runs on rejoin, training focus/Escape, Help, View/zoom and expanded Motion Hunt. The narrow run-history panel now stays fully within the screen. Physical multitouch, OS reduced-motion visuals, disconnect recovery, full Motion Hunt extraction and load remain unverified. Disposable QA/D1 only; existing runtime data is preserved.

Committed at the user’s request as `dbb196a` (`Compact the HUD on small screens`). Phone screenshot: ignored `outputs/compact-hud-phone.png`; disposable preview source: `/private/tmp/immunity-mobile-hud-20261023/immunity`. No source push or deployment.


## Minimap removed — 2026-10-23

User requested committing the compact HUD first, removing the map, then committing again. First commit: `dbb196a`. The follow-up removes the minimap throughout `app/page.tsx`, `app/use-arena.ts`, `lib/renderer.ts` and map-specific CSS; View retains zoom and expanded-arena controls. Motion Hunt guidance and README no longer refer to the removed map. [Implementation and checks](organic-interface.md#minimap-removal--2026-10-23).

PASS: 95 tests, TypeScript, final build and whitespace checks. Browser confirmed one arena canvas/zero minimap elements on phone and desktop, Motion Hunt joining/movement/entry, zoom, expansion/restoration, updated mission text and no 390×500 page overflow. Evidence: ignored `outputs/no-minimap-phone.png`. No fresh full contact/extraction, physical multitouch, OS reduced-motion or production pass is claimed. Disposable D1 only. This follow-up is the user-requested second local commit; no push or deployment was requested.


## Ground-matched steps and slower animation — 2026-10-23

User requested matching feet to ground movement and slowing the flickering animation. The normal/sprint cycles are 33%/26% slower, with support timing derived from stride and actor scale, eased return motion and separately articulated level boots. Both menu and arena follow realized movement direction. Existing speed, long stride, arm swing and small body bob remain. [Implementation and limits](glass-tide-implementation.md#ground-matched-foot-contact-and-slower-cadence--2026-10-23).

PASS: 97 tests/TypeScript on both local and hosted baselines, disposable production build, all-heading pose comparison and local join → move/sprint → entry → visible contact → outside respawn → leave/rejoin/saved-score journey. Ground cancellation is checked at normal/sprint speed across headings and actor scales. Physical touch, OS reduced-motion visuals, maximum-player performance and Motion Hunt extraction remain unverified; HTTP fixtures were not repeated for presentation-only changes. Release scope is this animation correction under the existing publication authorization. The separately committed compact HUD/minimap work remains local and is not included in this animation-only hosted patch. Exact-source build and publication receipt follow.


### Ground-matched animation publication — 2026-10-24

Committed as Evolution Lab `824f6c2` (`Match survivor foot contacts to ground travel and slow the gait`). Applied only the six animation/regression/documentation patches to the synchronized hosted source, preserving hosted-only files and leaving the separately committed compact HUD/minimap work local. The exact hosted source passed 97 tests, TypeScript and production build and was pushed as `f19763474d87d5bb20bbd19523469a620d9ec137`. Saved version **18** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_1a12c20134dc8191be7ef7e43bcce24c`. Native deployment `appgdep_6adbd8fe44d48191b87fc7635022862c` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site); the published menu loaded in the browser. Public audience, Site identity, D1 binding and runtime data remain unchanged. No production fixtures or schema changes.

The local browser journey and reference-canvas recording above are the motion/interaction evidence; the production menu check does not establish a fresh production gameplay or physical-device pass. This receipt is a separate local documentation commit after publication.


## Menu text contrast — 2026-10-24

User requested more contrast in the Immunity menu. Darkened the title, mode labels, movement instructions and engraved experiment copy; strengthened supporting text weights and tightened light/dark letter shadows. Existing artwork, shell inscription placement, wording and responsive layouts are preserved. Only `app/globals.css` changes runtime presentation.

PASS: disposable production build; browser visual review at measured 1600×900 and 390×844 CSS pixels, with no horizontal overflow; keyboard Survival selection opens its join screen. Screenshots: `/private/tmp/immunity-menu-contrast-desktop.png` and `/private/tmp/immunity-menu-contrast-phone.png`. Preview source is `/private/tmp/immunity-menu-contrast-20261024`; its fresh database was not migrated, so the arena reports unavailable. Full gameplay, physical touch and OS reduced-motion checks were not repeated for this CSS-only change. Existing runtime data was not used or altered. The user authorized committing and deploying this menu contrast change on 2026-10-24. The release is limited to this CSS change and its verification record; the separately committed compact HUD/minimap changes remain local. Exact-source build and publication receipt follow.


### Menu contrast publication — 2026-10-24

Committed as Evolution Lab `0d98a59` (`Increase Immunity menu text contrast`). Applied only the menu stylesheet patch and verification note to the synchronized hosted source. The exact release source passed its production build and was pushed as `d845ac7c6c76678761eb8668c8505a536bd3276c`. Saved version **19** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_5fa14060b1408191adfcf94efb8f9d7b`; native deployment `appgdep_6adbdc22aa988191bc9b9d5633fbb4b5` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site).

Live browser review confirms the menu and artwork load, both mode labels use `rgb(11, 44, 46)` and the inscription uses `rgb(39, 41, 31)` with weight 600. Screenshot: `/private/tmp/immunity-menu-contrast-live-20261024.png`. The prior responsive and keyboard-selection evidence remains applicable; this is a live menu smoke check, not a new gameplay/device pass. Public audience, Site identity, D1 binding and runtime data are preserved. Separately committed local HUD/minimap changes were excluded. No schema changes or production fixtures. This receipt is a separate local documentation commit after publication.


## Compact HUD and minimap publication — 2026-10-24

The user authorized deploying the previously committed compact HUD (`dbb196a`) and minimap removal (`dc2c2cd`). Applied only their seven source/regression/topic-document files and a release record to the synchronized hosted source, verifying each affected file matches the current local implementation. Published menu contrast and ground-matched animation are preserved. Exact release verification (domain tests and TypeScript), production build and whitespace checks passed.

Release source `e4141e342ce6ac42bb64d8bb288d04ecc7cbfc47` was pushed and packaged. Saved version **20** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_30ac84e01b6c8191b3ba9394da2e9894`; native deployment `appgdep_6adbdcf922408191947ef689d3aec787` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site).

Live Survival menu/join-screen review at measured 312×528, 390×660 and 1600×900 CSS pixels confirmed compact phone fitness/timer/records, preserved desktop instruments, one arena canvas, zero minimap elements and no horizontal overflow. Phone View exposes zoom and expansion only. Screenshot: `/private/tmp/immunity-compact-hud-live-20261024.png`. The earlier disposable gameplay/contact/respawn/saved-score checks remain the gameplay evidence; no new full gameplay journey, physical multitouch or OS reduced-motion check is claimed. Public audience, Site identity, storage bindings, scores and learned populations are preserved. No production fixtures or schema changes. This receipt is a local documentation commit after publication.


## Survivor flicker correction — 2026-10-24

User reported continued flicker. Fixed idle-art flashes on render frames between 60 Hz simulation updates, and front/rear painted-limb collapse/inversion. Gait poses hold through unchanged frames and subpixel reconciliation without adding travel; real stops remain immediate, stale motion expires, and limb width remains stable. Preserved ground-matched feet, slower cadence, arm swing and small bob. [Reproduction, fixes and limits](glass-tide-implementation.md#flicker-correction--2026-10-24).

PASS: 100 tests, TypeScript and disposable production build. Timing replay covers 60–240 Hz and jitter at both speeds, with no idle fallbacks during continuous movement after it begins; this is automated timing evidence, not a physical high-refresh display test. Browser pose comparison and local menu/join/normal movement/sprint/entry checks pass. No fresh full contact/respawn/rejoin, touch, OS reduced-motion or maximum-player check. Published menu contrast, compact HUD/minimap removal, hosting identity and runtime data are preserved. The correction continues the existing commit/deploy authorization; exact hosted-source build and publication receipt follow.


### Flicker correction publication — 2026-10-24

Correction commits: Evolution Lab `6c2b71b` (`Stop survivor idle-frame flashing and limb texture inversions`) and `488a011` (`Retain moving artwork through subpixel render corrections`). Final verification is 100 tests/TypeScript, with exact final source rebuilt successfully and pushed as `1982f3de8fba5e51ed6e4be069a57ce41dd92ed9`. Saved version **21** is `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_211578dd5d248191ab55eb29f855108e`; native deployment `appgdep_6adbe6d790348191ba65694d69beb795` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). The published menu loaded in the browser. Source changes are limited to the animation helper, its regressions and two documentation pages; published menu contrast, compact HUD/minimap removal, public audience, Site/D1 identity and runtime data are preserved.

High-refresh timing and subpixel reconciliation are verified by deterministic regression, not by a physical 120/144/240 Hz monitor. Local pose review and menu/join/movement/sprint/entry checks are described above; no new production gameplay/device or full browser contact/respawn/rejoin pass is claimed. This is a separate local release-receipt commit after publication.


## Experimental Motion Hunt perception — 2026-10-24

Accepted scope: implement, commit and publish short observation histories, with a fresh Motion Hunt population/generation 1. [Motion Hunt](motion-hunt.md#experimental-history-controller--2026-10-24) owns the controller inputs, rewards, migration, archive compatibility and controlled-trial limits. Survival, player records, contact/extraction rules, accepted visuals and Site identity are preserved. Single agent; no delegation.

Implemented locally in a disposable checkout. Three position samples feed learned attention and steering; velocity/ground-truth labels are used only by fitness, with no moving-only target filter. One-time persisted controller migration resets only Motion Hunt training. New rules protect archive imports from the old sensor layout. Interface guidance describes experimental detection and removes guaranteed hiding. 104 tests, TypeScript, production build and all five sequential disposable HTTP/D1 fixtures pass. Synthetic detector trials improved in two of three seeds; one failed, and no live hunting improvement is claimed. Fresh deployed bots will be random, not pretrained. Publication and live reset verification are recorded below.

Browser review confirmed Motion Hunt selection, join, arena entry, stillness status and the learned-detection/reward explanation. Integration fixtures were rerun with the browser player disconnected and pass, including compatible checkpoint export. Full physical-device and maximum-player checks remain unverified. Hosted Git repeatedly returned HTTP 500, including after credential renewal; Sites metadata independently confirms live version 21 source `1982f3de8fba5e51ed6e4be069a57ce41dd92ed9`. The service later recovered; publication completed as recorded below.


### Experimental perception publication — 2026-10-24

Implementation commit: Evolution Lab `1b7d2610c94167a4715b9798703cc3eeed845165` (`Evolve Motion Hunt detection from short position histories`). Exact hosted source passed 104 tests, TypeScript, production build and whitespace checks. The 16 affected source/regression/topic-document files match that committed implementation; hosted project state contains a bounded release note. Pushed release source: `fb986ca4667ba009288d83a3e645742012405045`. Saved version **22**: `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_91a75930a8e081919fc4edd71d8be96a`. Native deployment `appgdep_6adc94a2b3e48191acb109e5cfc91078` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). Public audience, Site identity and D1 binding are preserved.

Live API verification: Motion Hunt controller `motion-history-v1`, generation **1**, elapsed **0**, empty generation history, no champion/best generation, 24 fresh networks with 14 total nodes and 33 connections each. Repeated reads retain that fresh state; the reset marker is durable. Survival remains at generation **62**, elapsed **35.853 s**, 115 cumulative captures and two species; its complete public bot-population and history checksums match the pre-deployment baseline. The reset touches Motion Hunt training only; score rows are preserved by implementation and disposable HTTP/D1 checks. No production fixture or schema reset was run.

Live browser review confirmed the new Motion Hunt menu description, revised join guidance, generation 1 paused at 0:45, loaded art and no browser warnings/errors. Screenshot: `/private/tmp/immunity-motion-history-live-20261024.png`. Local browser joining/entry/training explanation and all five isolated HTTP/D1 fixtures remain gameplay evidence; no full production gameplay/contact/extraction journey is claimed. Synthetic detector trials are variable and do not prove live learning improvement. Physical touch, OS reduced-motion, realistic latency/start-stop behavior and maximum-player load remain unverified. The owned disposable preview was stopped. This receipt is a separate local documentation commit after publication.


## Motion Hunt detection accuracy and false positives — 2026-10-24

Accepted request: add generation-level movement-detection accuracy and false positives to the training panel, commit and deploy. Implemented pooled confusion counts for every bot/player classification with full observation history; record them before generation reset and expose only aggregates. The existing panel shows completed/live rates, raw denominators, recall, percentage-point deltas, fixed-percent history chart and generation table columns. Old measurements remain unavailable, initial in-progress tracking is partial, and imports break comparisons. [Definitions and evidence](motion-hunt.md#detection-observability--2026-10-24). Existing populations, controller, rewards, generation numbering, scores, hosting identity and visuals are preserved; no new reset.

PASS: 110 tests, TypeScript, production build, focused new panel/metrics lint, all five sequential HTTP/D1 fixtures in `/private/tmp/immunity-detection-metrics-work/immunity`, and browser review at 1600×900 and measured 390×844 without horizontal page/panel overflow. Checked known multi-generation values/deltas, partial/missing/no-negative cases, generation table, keyboard Escape/focus, real Motion Hunt join/entry/movement with increasing live counts, and Survival separation. No browser warnings/errors. Local controlled chart fixtures are QA data, not production learning results. Physical touch, OS reduced motion, maximum-player load and new controlled learning-quality evaluation remain unverified. Commit and exact-source publication follow.


### Detection metrics publication — 2026-10-24

Implementation commit: Evolution Lab `1b26ff7` (`Track Motion Hunt detection accuracy and false positives by generation`). The exact hosted source passed 110 tests, TypeScript, production build and whitespace checks; nine affected source/test/topic-document files match the implementation, with a bounded hosted release note. Pushed source `e977c6bee4b428572794c49b4f0686a2858738c7`. Saved version **23**: `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_01002de4cc0c81918ac96a3951e3530b`. Native deployment `appgdep_6adc9f40cddc8191b97d3606225293cd` returned **succeeded** at [the existing public URL](https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site). Public audience, Site/D1 identity and environment revision are preserved.

Live API checks confirm both modes' public bot populations, history, best-generation records, champion availability, generation, elapsed time and cumulative captures match their pre-deployment checksums/summaries. Survival remained at generation 75 (41.6687 seconds elapsed); Motion Hunt remained at generation 1 (0 seconds). The added Motion Hunt confusion counters are zero and ready to collect during play; Survival has no detection counters. No reset, production fixtures, schema migration, model import or synthetic live data were used. Player-record preservation is covered by source scope and disposable HTTP/D1 checks.

Live browser confirms Movement detection in Motion Hunt's Adaptation panel, completed/live rates, sample counts, empty-state guidance and the existing generation 1. No warnings/errors observed. Screenshot: `/private/tmp/immunity-detection-metrics-live.png`. Multi-generation trend values and real live-counter changes were verified in disposable QA; no production gameplay/contact or learning-quality pass is claimed. Normal viewport restored; owned local preview stopped. Detection history begins with measured play after this release and is not backfilled. This receipt is a separate local documentation commit after publication.


## EvoGoo domain and branding — 2026-10-27

User request: adapt the game for the purchased Cloudflare domain evogoo.com and deploy it. EvoGoo is the collection brand; Immunity remains the game title. Reuse the accepted Nursery artwork and layout with a compact EvoGoo inscription, browser/share metadata, canonical domain and seed favicon. Builder review; no new game mechanics, storage keys, schema changes, resets or hosting migration.

Release preparation uses the current hosted version 24 in `/private/tmp/evogoo-release-20261027`. Existing local gate-fix edits match that hosted baseline and remain intact. The existing public Sites project and D1 binding are reused. Both evogoo.com and www.evogoo.com are registered with Sites; Cloudflare received two apex A records, the www CNAME and four ownership TXT records, all DNS-only with five-minute TTL. Certificates are active; final routing/publication verification follows.

PASS: 112 domain tests, TypeScript, production build, five sequential disposable HTTP/D1 fixtures, keyboard mode selection, browser joining/arena entry, desktop and measured 390×844 menu review without horizontal overflow. Metadata resolves to https://evogoo.com. Changed-file lint adds no findings: layout/menu clean, page retains its nine prior findings; full lint still fails with 16 errors and 34 warnings including generated test output. Local gameplay files, hosting manifest and existing SQLite data have unchanged hashes. Physical touch, OS reduced-motion, load and a complete new rendered contact/respawn journey are not established by these checks.

Anonymous identities are browser-origin scoped. The shared database preserves existing scores and learned populations, but visiting evogoo.com does not automatically copy the old chatgpt.site browser identity; no cross-domain identity transfer was implemented.


### EvoGoo publication — 2026-10-27

Published version **25** from pushed source `96d87cbc5ec71a15470563a85296e3be72f232b3`; saved version `appgprj_6ad2976be9588191b0d83a413395dc2c~appgver_cdf1795e69e08191ae3d5e59ff57b8ce`. Deployment `appgdep_6ae0fccc2d3c8191880d488cb4ce6684` succeeded, preserving public audience and environment revision 0. Sites now reports https://evogoo.com as the current live URL and the display title is **EvoGoo — Immunity**. Both custom domains report active hostname routing and active TLS.

Live browser checks passed on https://evogoo.com and https://www.evogoo.com: branded menu/artwork, title, canonical metadata, favicon, mode selection and existing Motion Hunt backend data (generation 4, best generation 2). No browser warnings/errors. No production player was joined and no production fixture, schema migration or reset was run. A separate unauthenticated command-line public-state read returned HTTP 403, so no before/after live checksum comparison is claimed for this release. Preservation rests on the unchanged simulation/persistence source and binding, plus visible retained training state.

Additional disposable browser verification: normal movement, sprint/stamina, capture followed by outside respawn, and leave/rejoin with the saved 01:31.42 personal best. The exact instant of contact was not visually captured. Desktop and measured 390×844 menu checks passed; physical touch, OS reduced-motion and load remain unverified. The owned preview was stopped and browser viewport restored. Live screenshot: ignored `outputs/evogoo-live.png`.

The release source is committed/pushed in the existing hosted repository. Local Evolution Lab branding edits and this receipt remain uncommitted alongside the pre-existing gate-fix edits, which were preserved. No identity transfer across browser origins was added.
