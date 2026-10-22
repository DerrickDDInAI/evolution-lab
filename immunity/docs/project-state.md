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
